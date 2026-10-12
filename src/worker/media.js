/**
 * 媒体出口 —— 主 Worker 在 `/media/*` 上提供站点自己的图片与短视频（存在 R2 桶里）。
 *
 * 为什么媒体的独立域名被取消（2026-10 决策，见 MIGRATION.md §4.1）：
 *   `media.<主域>` 这种二级子域名的证书不在 Universal SSL 覆盖范围内（只覆盖裸域 + 一级子域），
 *   而 R2 的 custom domain 不是 Worker Custom Domain，拿不到「自动签发多级子域证书」的待遇。
 *   与其为一个图片域名去买 ACM，不如让主 Worker 直接把桶读出来：零额外域名、零额外证书、同源。
 *
 * 代价（已知并接受）：每个媒体请求都是一次 Worker 请求，计入账号的每日请求数。
 *   所以这里给一年期不可变缓存头 —— 浏览器只取一次，重复访问不再产生请求。
 *
 * 为什么由 Worker 而不是把桶设成公开：
 *   公开域名同样要证书；而走 Worker 还能顺手做「只允许 GET/HEAD」「拒绝路径穿越」这两件事。
 *
 * 路由契约：
 *   /media/<R2 里的 key>（当前 key 长这样：uploads/20261012-ab12cd.webp）
 *   GET / HEAD  → 200；带 Range → 206；If-None-Match 命中 → 304；对象不存在 → 404
 *   其它方法 → 405；key 非法 → 400；桶没绑定 → 503（宁可显式报错，也不要静默 404）
 */

/** 对象名里带日期与随机串，内容永不变更，所以可以 immutable 缓存一年 */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PREFIX = '/media/';
const MAX_KEY_LENGTH = 512;

const MIME = {
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  zip: 'application/zip',
};

function text(message, status, extra = {}) {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...extra } });
}

function mimeFor(key) {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

/**
 * 路径 → R2 key。非法返回 null。
 * 这里必须自己判一遍 `..`：URL 归一化只处理未编码的点段，
 * `/media/%2e%2e/ai-config.json` 解码后就是 `../ai-config.json`，能读到桶外（甚至别的绑定）的东西。
 */
export function mediaKey(pathname) {
  if (!pathname.startsWith(PREFIX)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname.slice(PREFIX.length));
  } catch {
    return null;
  }
  if (!decoded || decoded.length > MAX_KEY_LENGTH) return null;
  if (decoded.startsWith('/') || decoded.endsWith('/')) return null;
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const segments = decoded.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return null;
  return decoded;
}

/**
 * 解析单段 Range。返回 `{ start, end }` / `null`（不认，按整段返回）/ `'unsatisfiable'`（416）。
 * 只支持单段：多段 Range 的 multipart 响应对图片/视频没有意义，且浏览器基本不发。
 */
export function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header ?? '').trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;

  let start;
  let end;
  if (rawStart === '') {
    // `bytes=-500`：最后 500 字节
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Number(rawEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  }

  // 顺序很重要：先判「够不够得着」。`bytes=99-` 在 10 字节的对象上会算出 end=9 < start=99，
  // 如果先判 end<start 就会把它当成「不认识的 Range」放行成整段 200，而不是 RFC 要求的 416。
  if (start < 0 || !Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (size === 0 || start >= size) return 'unsatisfiable';
  if (end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}

function etagMatches(header, etag) {
  if (!header || !etag) return false;
  return header
    .split(',')
    .map((value) => value.trim())
    .some((value) => value === etag || value === '*');
}

export async function handleMedia(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return text('Method Not Allowed', 405, { allow: 'GET, HEAD' });
  }

  const key = mediaKey(new URL(request.url).pathname);
  if (!key) return text('Bad Request', 400);
  if (!env.MEDIA) {
    // 绑桶漏了要和「文件不存在」区分开：前者是部署事故，后者是正常 404
    console.error(JSON.stringify({ event: 'media_bucket_missing', key }));
    return text('media bucket not bound', 503);
  }

  const ifNoneMatch = request.headers.get('if-none-match');
  const rangeHeader = request.headers.get('range');
  // HEAD 与带 Range 的 GET 都需要先知道对象总长度：HEAD 要 Content-Length，Range 要算 Content-Range
  const meta = request.method === 'HEAD' || rangeHeader ? await env.MEDIA.head(key) : null;
  if ((request.method === 'HEAD' || rangeHeader) && !meta) return text('Not Found', 404);

  // HEAD / 带 Range 的请求可以在读 body 之前就答 304，省一次 R2 读
  if (meta && etagMatches(ifNoneMatch, meta.httpEtag)) {
    return new Response(null, { status: 304, headers: { etag: meta.httpEtag, 'cache-control': CACHE_CONTROL } });
  }

  let range = null;
  if (rangeHeader) {
    range = parseRange(rangeHeader, meta.size);
    if (range === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: { 'content-range': `bytes */${meta.size}`, 'accept-ranges': 'bytes' },
      });
    }
  }

  const object = request.method === 'HEAD'
    ? null
    : await env.MEDIA.get(key, range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : undefined);
  const record = object ?? meta;
  if (!record) return text('Not Found', 404);

  if (etagMatches(ifNoneMatch, record.httpEtag)) {
    return new Response(null, { status: 304, headers: { etag: record.httpEtag, 'cache-control': CACHE_CONTROL } });
  }

  // 总长度优先用 head 的结果：带 Range 的 get 返回的 size 在实现上可能是「本次返回的长度」
  const total = meta?.size ?? record.size ?? 0;
  const offset = range ? range.start : 0;
  const length = range ? range.end - range.start + 1 : total;

  const headers = new Headers({
    'content-type': record.httpMetadata?.contentType ?? mimeFor(key),
    'cache-control': CACHE_CONTROL,
    'accept-ranges': 'bytes',
    'content-length': String(length),
  });
  if (record.httpEtag) headers.set('etag', record.httpEtag);

  if (range) {
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${total}`);
    return new Response(object.body, { status: 206, headers });
  }

  return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers });
}

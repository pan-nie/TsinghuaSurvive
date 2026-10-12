#!/usr/bin/env node
/**
 * 媒体出口（/media/*）的端到端检查 —— 在 Node 里直接跑 Worker 入口，桩掉 R2 与静态资源绑定。
 *
 * 为什么值得单独一个脚本：
 *   媒体路由的失败方式全是静默的：Range 不支持 → 视频拖不动进度条；路径穿越没拦 → 能读到桶外；
 *   缓存头写错 → 每个访客每次都回源；桶没绑定 → 全站图片 404 而页面本身 200。
 *   这些在本地肉眼都看不出来，只能靠断言。
 *
 * 用法：`npm run check:media:worker`（已并入 `npm run verify`）
 */
import worker from '../src/worker/index.js';

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail && !passed ? ` —— ${detail}` : ''}`);
}

// ── 测试替身：一个最小的 R2 桶 ────────────────────────────────────────────
const encode = (text) => new TextEncoder().encode(text);

const OBJECTS = new Map([
  ['uploads/a.webp', { bytes: encode('0123456789'), type: 'image/webp', etag: '"etag-a"' }],
  ['uploads/clip.mp4', { bytes: encode('video-bytes'), type: 'video/mp4', etag: '"etag-v"' }],
  ['uploads/noext', { bytes: encode('no-extension'), type: undefined, etag: '"etag-n"' }],
]);

const metaOf = (object) => ({
  size: object.bytes.length,
  httpEtag: object.etag,
  ...(object.type ? { httpMetadata: { contentType: object.type } } : {}),
});

const MEDIA = {
  async head(key) {
    const object = OBJECTS.get(key);
    return object ? metaOf(object) : null;
  },
  async get(key, options) {
    const object = OBJECTS.get(key);
    if (!object) return null;
    if (!options?.range) return { ...metaOf(object), body: new Response(object.bytes).body };
    const { offset, length } = options.range;
    return {
      ...metaOf(object),
      body: new Response(object.bytes.slice(offset, offset + length)).body,
      range: { offset, length },
    };
  },
};

const env = {
  MEDIA,
  ASSETS: { async fetch() { return new Response('asset-stub', { status: 200 }); } },
};

const SITE = 'https://site.test';
const call = (path, init) => worker.fetch(new Request(`${SITE}${path}`, init), env, { waitUntil() {} });

// ── 1. 正常命中 ───────────────────────────────────────────────────────────
{
  const response = await call('/media/uploads/a.webp');
  const body = await response.text();
  check('GET 命中 → 200', response.status === 200, String(response.status));
  check('Content-Type 用对象元数据', response.headers.get('content-type') === 'image/webp', String(response.headers.get('content-type')));
  check('缓存头是不可变长缓存', response.headers.get('cache-control') === 'public, max-age=31536000, immutable', String(response.headers.get('cache-control')));
  check('返回 ETag', response.headers.get('etag') === '"etag-a"', String(response.headers.get('etag')));
  check('Content-Length 正确', response.headers.get('content-length') === '10', String(response.headers.get('content-length')));
  check('body 内容正确', body === '0123456789', body);
}

// ── 2. 没写 Content-Type 时按扩展名兜底 ───────────────────────────────────
{
  const response = await call('/media/uploads/noext');
  check('缺元数据时回落 application/octet-stream', response.headers.get('content-type') === 'application/octet-stream', String(response.headers.get('content-type')));
}

// ── 3. HEAD ───────────────────────────────────────────────────────────────
{
  const response = await call('/media/uploads/a.webp', { method: 'HEAD' });
  const body = await response.text();
  check('HEAD → 200', response.status === 200, String(response.status));
  check('HEAD 不返回 body', body === '', JSON.stringify(body));
  check('HEAD 仍带 Content-Length', response.headers.get('content-length') === '10', String(response.headers.get('content-length')));
}

// ── 4. 不存在 / 方法不对 / key 非法 ───────────────────────────────────────
{
  const missing = await call('/media/uploads/nope.webp');
  check('对象不存在 → 404', missing.status === 404, String(missing.status));

  const posted = await call('/media/uploads/a.webp', { method: 'POST' });
  check('POST → 405', posted.status === 405, String(posted.status));
  check('405 带 Allow 头', posted.headers.get('allow') === 'GET, HEAD', String(posted.headers.get('allow')));

  // URL 归一化会把 `%2e%2e` 也当成点段吃掉（WHATWG 规范），所以那种写法根本到不了媒体处理器：
  // 它变成 `/ai-config.json` 落到静态兜底。这里断言「它没有读到桶里的东西」，
  // 真正的攻击面是 `..%2f` 这种「点段 + 编码斜杠」——解码后才拼出 `../`。
  const normalized = await call('/media/%2e%2e/ai-config.json');
  check(
    '编码点段被 URL 归一化 → 不落到媒体处理器',
    (await normalized.text()) === 'asset-stub',
    `status=${normalized.status}`,
  );

  const traversal = await call('/media/..%2fai-config.json');
  check('点段 + 编码斜杠穿越 → 400', traversal.status === 400, String(traversal.status));

  const nested = await call('/media/uploads/..%2f..%2fsecret.txt');
  check('多层编码穿越 → 400', nested.status === 400, String(nested.status));

  const empty = await call('/media/');
  check('空 key → 400', empty.status === 400, String(empty.status));

  const backslash = await call('/media/uploads%5Ca.webp');
  check('反斜杠 key → 400', backslash.status === 400, String(backslash.status));
}

// ── 5. Range（视频拖进度条靠它）──────────────────────────────────────────
{
  const first = await call('/media/uploads/a.webp', { headers: { range: 'bytes=0-3' } });
  check('Range 前缀 → 206', first.status === 206, String(first.status));
  check('Range 前缀 → Content-Range 正确', first.headers.get('content-range') === 'bytes 0-3/10', String(first.headers.get('content-range')));
  check('Range 前缀 → body 是前 4 字节', (await first.text()) === '0123');

  const tail = await call('/media/uploads/a.webp', { headers: { range: 'bytes=4-' } });
  check('Range 开区间 → 206 到结尾', tail.status === 206 && tail.headers.get('content-range') === 'bytes 4-9/10', `${tail.status} ${tail.headers.get('content-range')}`);
  check('Range 开区间 → body 正确', (await tail.text()) === '456789');

  const suffix = await call('/media/uploads/a.webp', { headers: { range: 'bytes=-3' } });
  check('Range 后缀 → 206 取最后 3 字节', suffix.status === 206 && (await suffix.text()) === '789', `${suffix.status} ${suffix.headers.get('content-range')}`);

  const clamped = await call('/media/uploads/a.webp', { headers: { range: 'bytes=8-999' } });
  check('Range 超出末尾 → 截到对象末尾', clamped.status === 206 && clamped.headers.get('content-range') === 'bytes 8-9/10', `${clamped.status} ${clamped.headers.get('content-range')}`);

  const beyond = await call('/media/uploads/a.webp', { headers: { range: 'bytes=99-' } });
  check('Range 完全越界 → 416', beyond.status === 416, String(beyond.status));
  check('416 带 Content-Range: bytes */size', beyond.headers.get('content-range') === 'bytes */10', String(beyond.headers.get('content-range')));

  const bogus = await call('/media/uploads/a.webp', { headers: { range: 'bytes=abc' } });
  check('非法 Range → 按整段 200 返回', bogus.status === 200, String(bogus.status));
}

// ── 6. 条件请求 ───────────────────────────────────────────────────────────
{
  const cached = await call('/media/uploads/a.webp', { headers: { 'if-none-match': '"etag-a"' } });
  check('If-None-Match 命中 → 304', cached.status === 304, String(cached.status));

  const head304 = await call('/media/uploads/a.webp', { method: 'HEAD', headers: { 'if-none-match': '"etag-a"' } });
  check('HEAD + If-None-Match → 304', head304.status === 304, String(head304.status));

  const changed = await call('/media/uploads/a.webp', { headers: { 'if-none-match': '"etag-old"' } });
  check('ETag 不匹配 → 200 全量', changed.status === 200, String(changed.status));
}

// ── 7. 路由边界 ───────────────────────────────────────────────────────────
{
  const asset = await call('/about/');
  check('非 /media 路径仍走静态资源兜底', asset.status === 200 && (await asset.text()) === 'asset-stub');

  const unbound = await worker.fetch(new Request(`${SITE}/media/uploads/a.webp`), { ASSETS: env.ASSETS }, { waitUntil() {} });
  check('桶未绑定 → 503（而不是静默 404）', unbound.status === 503, String(unbound.status));
}

// ── 汇总 ─────────────────────────────────────────────────────────────────
const failed = results.filter((result) => !result.passed);
console.log(`\n媒体出口检查：${results.length - failed.length}/${results.length} 通过。`);
if (failed.length) {
  console.error(`\n✖ 未通过：${failed.map((result) => result.name).join('、')}\n`);
  process.exit(1);
}

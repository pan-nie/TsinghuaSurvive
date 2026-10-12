#!/usr/bin/env node
/**
 * 线上冒烟检查 —— 把「部署完了到底对不对」变成一条命令，而不是靠人去点。
 *
 * 为什么需要它：本站最怕的失败方式全是**静默**的 —— canonical 指错域名、sitemap 还是旧域名、
 * 换了 Turnstile 挂件但前端 sitekey 没同步（问答一律 403）、媒体出口 404、后台被搜索引擎收录。
 * 这些部署完都不会报错，页面也照开。`npm run verify` 只能验构建产物，验不了「线上那一份」。
 *
 * 它验的是**部署后的真实站点**（默认 https://<site.config.json 里的 siteHost>）：
 *   · 页面与 SEO：canonical / robots / sitemap / RSS 里的域名
 *   · 问答链路：/api/ai-config 的 sitekey 与仓库配置一致；无 token 时 fail-closed
 *   · 媒体出口：不存在的 key 必须 404（而不是 200 或 500）
 *   · 静态资源与后台：og 图、Pagefind 索引、/admin/ 的 noindex 头
 *   · 路由：404 页面、缺尾斜杠的重定向
 *   · auth 中转：白名单有没有把本站放行（配置缺失只警告，白名单坏了算失败）
 *   · 传输层：http 有没有强制跳 https（没开只警告，是否开启属于区域级设置）
 *
 * 用法：
 *   npm run check:live          只检查，失败以非 0 退出
 *   npm run check:live -- --base https://preview.example.com   换一个地址测
 *
 * 已接入 CI：deploy.yml 在部署成功后跑一次，部署有问题当场红。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { authHost, authOrigin, siteHost, siteOrigin } from './site-config.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TIMEOUT_MS = 15_000;
const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1].replace(/\/+$/, '') : siteOrigin;

/** 期望值来自仓库配置，不写死：换挂件忘了同步时这里就会红 */
const aiConfig = parseYaml(readFileSync(join(ROOT, 'src/data/ai.config.yml'), 'utf8'));

const results = [];
const record = (level, name, detail = '') => {
  results.push({ level, name, detail });
  const mark = level === 'pass' ? '✅' : level === 'warn' ? '▲' : '❌';
  console.log(`${mark} ${name}${detail ? ` —— ${detail}` : ''}`);
};
const pass = (name, detail) => record('pass', name, detail);
const warn = (name, detail) => record('warn', name, detail);
const fail = (name, detail) => record('fail', name, detail);

async function request(path, init = {}) {
  return fetch(`${BASE}${path}`, {
    redirect: init.follow === false ? 'manual' : 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': 'TsinghuaGuideLiveCheck/1.0', ...(init.headers ?? {}) },
    ...(init.method ? { method: init.method } : {}),
    ...(init.body ? { body: init.body } : {}),
  });
}

/**
 * DoH 旁路查询：本机（校园网）对刚建的记录常有否定缓存，直接 fetch 会 ENOTFOUND。
 * 用 DoH 确认「记录其实存在」，避免把环境问题误报成配置问题（HANDOVER 排错一节记过这个坑）。
 */
async function dohLookup(host) {
  const response = await fetch(`https://dns.alidns.com/resolve?name=${host}&type=A`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json();
  return (data.Answer ?? []).filter((answer) => answer.type === 1).map((answer) => answer.data);
}

// ── 1. 页面与 SEO ────────────────────────────────────────────────────────
try {
  const response = await request('/');
  const html = await response.text();
  if (response.status !== 200) fail('首页 200', `实际 ${response.status}`);
  else pass('首页 200');
  const canonical = `href="${BASE}/"`;
  if (html.includes('rel="canonical"') && html.includes(canonical)) pass('首页 canonical 指向本站');
  else fail('首页 canonical 指向本站', '没找到指向本站根路径的 canonical');
} catch (error) {
  fail('首页 200', String(error?.message ?? error));
}

try {
  const text = await (await request('/robots.txt')).text();
  if (text.includes(`Sitemap: ${BASE}/sitemap-index.xml`)) pass('robots.txt 的 Sitemap 指向本站');
  else fail('robots.txt 的 Sitemap 指向本站', text.split('\n').find((line) => /sitemap/i.test(line)) ?? '(没有 sitemap 行)');
} catch (error) {
  fail('robots.txt 的 Sitemap 指向本站', String(error?.message ?? error));
}

try {
  const response = await request('/sitemap-index.xml');
  const text = await response.text();
  if (response.status === 200 && text.includes(BASE)) pass('sitemap 可达且域名正确');
  else fail('sitemap 可达且域名正确', `status=${response.status}`);
} catch (error) {
  fail('sitemap 可达且域名正确', String(error?.message ?? error));
}

try {
  const text = await (await request('/rss.xml')).text();
  if (text.includes(`<link>${BASE}/`)) pass('RSS 里的链接指向本站');
  else fail('RSS 里的链接指向本站', 'rss.xml 里没有本站绝对链接');
} catch (error) {
  fail('RSS 里的链接指向本站', String(error?.message ?? error));
}

// ── 2. 问答链路 ─────────────────────────────────────────────────────────
try {
  const response = await request('/api/ai-config');
  const config = await response.json();
  if (response.status !== 200) fail('ai-config 可达', `status=${response.status}`);
  else pass('ai-config 可达');

  const expectedKey = String(aiConfig.turnstile?.sitekey ?? '');
  if (config.turnstileSiteKey === expectedKey) pass('前端 sitekey 与仓库配置一致', expectedKey.slice(0, 12) + '…');
  else fail('前端 sitekey 与仓库配置一致', `线上=${config.turnstileSiteKey} 仓库=${expectedKey}`);

  if (config.turnstileMode === aiConfig.turnstile?.mode) pass('人机校验模式与仓库配置一致', config.turnstileMode);
  else fail('人机校验模式与仓库配置一致', `线上=${config.turnstileMode} 仓库=${aiConfig.turnstile?.mode}`);

  if (config.enabled === aiConfig.enabled) pass('问答开关与仓库配置一致', String(config.enabled));
  else fail('问答开关与仓库配置一致', `线上=${config.enabled} 仓库=${aiConfig.enabled}`);
} catch (error) {
  fail('ai-config 可达', String(error?.message ?? error));
}

if (aiConfig.turnstile?.mode === 'enforce') {
  try {
    const response = await request('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: '冒烟检查：绩点怎么算' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 403 && payload.code === 'challenge_failed') {
      pass('无 token 提问被拒（fail-closed）', '403 challenge_failed');
    } else if (response.status === 503) {
      fail('无 token 提问被拒（fail-closed）', '503：Worker 缺少 TURNSTILE_SECRET_KEY');
    } else {
      fail('无 token 提问被拒（fail-closed）', `status=${response.status} code=${payload.code}`);
    }
  } catch (error) {
    fail('无 token 提问被拒（fail-closed）', String(error?.message ?? error));
  }
}

// ── 3. 媒体出口 ─────────────────────────────────────────────────────────
try {
  const response = await request('/media/uploads/__live-check-does-not-exist.webp');
  if (response.status === 404) pass('媒体出口：不存在的 key 返回 404');
  else fail('媒体出口：不存在的 key 返回 404', `实际 ${response.status}`);
} catch (error) {
  fail('媒体出口：不存在的 key 返回 404', String(error?.message ?? error));
}

// ── 4. 静态资源与后台 ───────────────────────────────────────────────────
for (const [path, expect] of [['/og.png', 'image/'], ['/pagefind/pagefind.js', '']]) {
  try {
    const response = await request(path);
    const type = response.headers.get('content-type') ?? '';
    if (response.status === 200 && type.startsWith(expect)) pass(`${path} 可达`, type || undefined);
    else fail(`${path} 可达`, `status=${response.status} type=${type}`);
  } catch (error) {
    fail(`${path} 可达`, String(error?.message ?? error));
  }
}

try {
  const response = await request('/admin/');
  const robots = response.headers.get('x-robots-tag') ?? '';
  if (response.status === 200 && robots.includes('noindex')) pass('后台带 noindex 头');
  else fail('后台带 noindex 头', `status=${response.status} x-robots-tag=${robots || '(无)'}`);
} catch (error) {
  fail('后台带 noindex 头', String(error?.message ?? error));
}

// ── 5. 路由行为 ─────────────────────────────────────────────────────────
try {
  const response = await request('/live-check-404-page/', { follow: false });
  if (response.status === 404) pass('未知路径返回 404');
  else fail('未知路径返回 404', `实际 ${response.status}`);
} catch (error) {
  fail('未知路径返回 404', String(error?.message ?? error));
}

try {
  const response = await request('/start/how-to-use', { follow: false });
  const location = response.headers.get('location') ?? '';
  if ([301, 307, 308].includes(response.status) && location.endsWith('/')) {
    pass('缺尾斜杠会被重定向到带斜杠', `${response.status} → ${location}`);
  } else {
    fail('缺尾斜杠会被重定向到带斜杠', `status=${response.status} location=${location || '(无)'}`);
  }
} catch (error) {
  fail('缺尾斜杠会被重定向到带斜杠', String(error?.message ?? error));
}

// ── 6. auth 中转的白名单 ────────────────────────────────────────────────
// 注意：这里必须用 authOrigin 的**主机名**发请求。本机（校园网）对刚建的记录常有否定缓存，
// 解析不到就只警告 —— 别把环境问题判成配置问题。
try {
  const response = await fetch(`${authOrigin}/auth?provider=github&site_id=${siteHost}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'manual',
  });
  const body = await response.text();
  if (response.status === 302 || response.status === 303) {
    pass('auth 中转已配置好（跳转到 GitHub 授权）');
  } else if (body.includes('UNSUPPORTED_DOMAIN')) {
    fail('auth 中转放行本站域名', '白名单里没有本站域名 —— 后台登录会被拒');
  } else if (body.includes('MISCONFIGURED_CLIENT')) {
    warn('auth 中转还差两个 Secret', 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 未写入（见 MIGRATION.md §8 第 7 步）');
  } else {
    warn('auth 中转状态未知', `status=${response.status}`);
  }
} catch (error) {
  const code = String(error?.cause?.code ?? error?.message ?? error);
  const ips = await dohLookup(authHost).catch(() => []);
  if (ips.length) {
    warn('auth 中转未检查（本机 DNS 未命中，但记录确实存在）', `${code}；DoH 查到 ${ips.join(', ')} —— 校园网对新建记录的否定缓存，过一会儿本机也能解析`);
  } else {
    warn('auth 中转未检查', code);
  }
}

// ── 7. 传输层 ───────────────────────────────────────────────────────────
try {
  const response = await fetch(`http://${siteHost}/`, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if ([301, 302, 307, 308].includes(response.status)) {
    pass('http 会跳转到 https');
  } else {
    warn('http 没有强制跳 https', '建议在 zone 上开 Always Use HTTPS（SSL/TLS → Edge Certificates；属于区域级设置，会影响该 zone 下其它站点）');
  }
} catch (error) {
  warn('http 检查未完成', String(error?.cause?.code ?? error?.message ?? error));
}

// ── 汇总 ────────────────────────────────────────────────────────────────
const failures = results.filter((result) => result.level === 'fail');
const warnings = results.filter((result) => result.level === 'warn');
console.log(
  `\n线上检查（${BASE}）：${results.length - failures.length - warnings.length}/${results.length} 通过` +
    `${warnings.length ? `，${warnings.length} 条提醒` : ''}${failures.length ? `，${failures.length} 项失败` : ''}。`,
);

if (failures.length) {
  console.error(`\n✖ 失败项：${failures.map((result) => result.name).join('、')}\n`);
  process.exit(1);
}

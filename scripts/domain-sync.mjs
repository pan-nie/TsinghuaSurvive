#!/usr/bin/env node
/**
 * 把 `site.config.json` 里的事实写进**不能 import 它**的文件。
 *
 * 为什么需要它：域名散落在 wrangler 配置、CMS 配置、robots.txt、CORS 策略、GitHub 模板、
 * 文档与内容里，这些文件要么是 JSONC/YAML/纯文本（不能 import JS），要么是人写的说明。
 * 迁移一次要手改近百处，漏一处就是「静默失效」——正是本站最想避免的那类问题。
 *
 * 它做两件事：
 *   1. **值规则**：按「键」精确定位，只换值（TURNSTILE_HOSTNAMES / routes.pattern /
 *      base_url / site_url / public_url / account_id / access_key_id / Sitemap / CORS origins）。
 *   2. **域名改写**：把 `hostRewrites` 里的旧主机名换成新值，覆盖注释、文档与正文里的地址。
 *
 * 幂等：重复执行不会产生新改动。`--check` 只报告、不写文件（CI 用）。
 *
 * 用法：
 *   npm run domain:sync            写入
 *   npm run domain:sync -- --check 只校验（等价于 npm run check:domain 的第一部分）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  authHost,
  authOrigin,
  cloudflare,
  hostRewrites,
  mediaBaseUrl,
  oauthAllowedDomains,
  siteHost,
  siteOrigin,
  sitemapUrl,
} from './site-config.mjs';

export const ROOT = resolve(import.meta.dirname, '..');

/**
 * 值规则：`find` 必须只命中「要改的那一行」，`replace(match, p1, p2)` 返回新行片段。
 * 规则写得越窄越好 —— 宽正则改配置文件，出错时是静默的。
 */
const VALUE_RULES = [
  {
    file: 'wrangler.jsonc',
    label: 'Turnstile 允许域名',
    find: /("TURNSTILE_HOSTNAMES":\s*")[^"]*(")/,
    replace: (m, p1, p2) => p1 + siteHost + p2,
  },
  {
    file: 'wrangler.jsonc',
    label: '正式站自定义域名',
    find: /("pattern":\s*")[^"]*(")/,
    replace: (m, p1, p2) => p1 + siteHost + p2,
  },
  {
    file: 'wrangler.jsonc',
    label: 'R2 桶名',
    find: /("bucket_name":\s*")[^"]*(")/,
    replace: (m, p1, p2) => p1 + cloudflare.r2Bucket + p2,
  },
  {
    file: 'auth-worker/wrangler.jsonc',
    label: 'OAuth 中转的白名单',
    find: /("ALLOWED_DOMAINS":\s*")[^"]*(")/,
    replace: (m, p1, p2) => p1 + oauthAllowedDomains + p2,
  },
  {
    file: 'auth-worker/wrangler.jsonc',
    label: 'OAuth 中转的自定义域名',
    find: /("pattern":\s*")[^"]*(")/,
    replace: (m, p1, p2) => p1 + authHost + p2,
  },
  {
    file: 'public/admin/config.yml',
    label: 'backend.base_url',
    find: /(^\s*base_url:\s*)\S+$/m,
    replace: (m, p1) => p1 + authOrigin,
  },
  {
    file: 'public/admin/config.yml',
    label: 'site_url',
    find: /(^\s*site_url:\s*)\S+$/m,
    replace: (m, p1) => p1 + siteOrigin,
  },
  {
    file: 'public/admin/config.yml',
    label: 'R2 public_url',
    find: /(^\s*public_url:\s*)\S+$/m,
    replace: (m, p1) => p1 + mediaBaseUrl,
  },
  {
    file: 'public/admin/config.yml',
    label: 'R2 account_id',
    find: /(^\s*account_id:\s*)\S+$/m,
    replace: (m, p1) => p1 + cloudflare.accountId,
  },
  {
    file: 'public/admin/config.yml',
    label: 'R2 access_key_id',
    find: /(^\s*access_key_id:\s*)\S+$/m,
    replace: (m, p1) => p1 + cloudflare.r2AccessKeyId,
  },
  {
    file: 'public/robots.txt',
    label: 'Sitemap 地址',
    find: /(^Sitemap:\s*)\S+$/m,
    replace: (m, p1) => p1 + sitemapUrl,
  },
  {
    file: 'r2/cors.json',
    label: 'R2 CORS origins',
    find: /("origins":\s*)\[[^\]]*\]/,
    // 保持文件里原有的多行缩进风格：origin 列表是给人看的，压成一行以后 review 会很难读
    replace: (m, p1) =>
      `${p1}[\n${[siteOrigin, 'http://localhost:4321'].map((o) => `          "${o}"`).join(',\n')}\n        ]`,
  },
];

/**
 * 同步目标文件：值规则 + 域名改写都会作用在它们身上。
 * 文档也在这里 —— 换域名时文档里的地址最容易漏，交给脚本比交给记性可靠。
 */
export const SYNCED_FILES = [
  'wrangler.jsonc',
  'auth-worker/wrangler.jsonc',
  'auth-worker/README.md',
  'public/admin/config.yml',
  'public/robots.txt',
  'r2/cors.json',
  'src/data/ai.config.yml',
  'src/content/docs/contribute.mdx',
  'src/utils/media-embed.mjs',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/pull_request_template.md',
  'README.md',
  'HANDOVER.md',
  'OUTLINE.md',
  'REFERENCE-NOTES.md',
  'CONTENT-EDITING-PLAN.md',
];

/** 只把「完整主机名」当成域名来替换，避免命中 example.com.cn 这类前缀/后缀 */
const hostTokenPattern = (host) =>
  new RegExp(`(?<![\\w.-])${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`, 'g');

/** 返回需要写入的文件列表（内容已算好） */
export function buildPlan() {
  const changes = [];
  const rewrites = Object.entries(hostRewrites);

  for (const rel of SYNCED_FILES) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;

    const before = readFileSync(abs, 'utf8');
    let after = before;

    for (const rule of VALUE_RULES) {
      if (rule.file !== rel) continue;
      if (!rule.find.test(after)) {
        changes.push({ rel, label: rule.label, missing: true });
        continue;
      }
      after = after.replace(rule.find, (...args) => rule.replace(...args));
    }

    for (const [from, to] of rewrites) {
      after = after.replace(hostTokenPattern(from), to);
    }

    if (after !== before) changes.push({ rel, before, after });
  }

  return changes;
}

/** 行级差异摘要，供输出与 --check 使用 */
export function summarize(change, limit = 10) {
  const before = change.before.split('\n');
  const after = change.after.split('\n');
  const lines = [];
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max && lines.length < limit; i += 1) {
    if (before[i] !== after[i]) {
      lines.push({ line: i + 1, before: before[i] ?? '', after: after[i] ?? '' });
    }
  }
  return lines;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);

if (isMain) {
  const checkOnly = process.argv.includes('--check');
  const changes = buildPlan();
  const missing = changes.filter((c) => c.missing);
  const edits = changes.filter((c) => !c.missing);

  for (const change of edits) {
    const lines = summarize(change);
    console.log(`${checkOnly ? '✖' : '✔'} ${relative(ROOT, change.rel) || change.rel}（${lines.length} 处）`);
    for (const line of lines) {
      console.log(`    ${line.line}: - ${line.before.trim()}`);
      console.log(`    ${line.line}: + ${line.after.trim()}`);
    }
  }

  for (const change of missing) {
    console.error(`✖ ${change.rel}：找不到「${change.label}」对应的那一行，值规则没匹配上。`);
  }

  if (!checkOnly) {
    for (const change of edits) {
      writeFileSync(join(ROOT, change.rel), change.after);
    }
    console.log(
      edits.length
        ? `\n已同步 ${edits.length} 个文件。记得跑一遍 npm run verify。`
        : '\n所有文件都与 site.config.json 一致，没有改动。',
    );
  }

  if (checkOnly && (edits.length || missing.length)) {
    console.error('\n✖ 有文件与 site.config.json 不一致：跑 `npm run domain:sync` 后再提交。');
    process.exit(1);
  }
  if (missing.length) process.exit(1);
}

#!/usr/bin/env node
/**
 * 部署前占位符检查 —— 拦住「带着 REPLACE_ 占位符去部署」。
 *
 * 为什么不把它并进 `check:domain`（那样 `npm run verify` 也会变红）：
 *   迁移期间占位符是**预期状态**，让本地整套校验因此失败会挡住其它所有验证；
 *   但**部署**必须被挡住 —— 否则 wrangler 会在绑定自定义域名 / 写 R2 时抛一个
 *   跟根因完全无关的错误（例如 "zone not found"），排查成本远高于提前说清楚。
 *
 * 用法：`npm run check:deploy-ready`（deploy / deploy:dry 与 CI 的部署步骤都会先跑它）
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = ['site.config.json', 'src/data/ai.config.yml'];
const PLACEHOLDER = /REPLACE_[A-Z0-9_]+/g;

/**
 * 只影响「后台传图」而不影响站点本身的占位符：警告，不拦部署。
 *
 * 为什么分级（2026-10-12 实测修正）：R2 的 S3 凭据只能用控制台创建（API 端点需要
 * 「API Tokens 管理」权限，wrangler 的 OAuth 拿不到）。如果它拦住部署，就等于
 * 「什么都能上线了，却因为后台传图没配好而不许部署」—— 判断标准应当是
 * 「这个值缺了，线上会不会有静默坏掉的东西」，而不是「这里还有个 REPLACE_」。
 */
const WARN_ONLY = new Set(['REPLACE_ACCOUNT_W_R2_ACCESS_KEY_ID']);

const hits = [];
for (const rel of FILES) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  text.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(PLACEHOLDER)) {
      hits.push({ rel, line: index + 1, token: match[0], warnOnly: WARN_ONLY.has(match[0]) });
    }
  });
}

const blocking = hits.filter((hit) => !hit.warnOnly);
const warnings = hits.filter((hit) => hit.warnOnly);

for (const hit of warnings) {
  console.log(`::warning title=占位符（不拦部署）::${hit.rel}:${hit.line} ${hit.token} 仍未替换：后台媒体库暂时传不了图。`);
  console.log(`▲ ${hit.rel}:${hit.line}  ${hit.token}（只影响后台传图，不拦部署）`);
}

if (blocking.length) {
  console.error('✖ 还有未替换的占位符，不能部署：\n');
  for (const hit of blocking) console.error(`  · ${hit.rel}:${hit.line}  ${hit.token}`);
  console.error(
    '\n这些值只能由站点维护者在 Cloudflare 控制台取得（Account ID / Zone ID / Turnstile sitekey）。' +
      `\n替换步骤见 MIGRATION.md §7，换完跑一次 \`npm run domain:sync\` 与 \`npm run verify\`。\n`,
  );
  process.exit(1);
}

console.log(
  `✔ 部署前检查通过：${FILES.join('、')} 里没有会拖坏线上的占位符` +
    `${warnings.length ? `（${warnings.length} 个仅影响后台传图的占位符已提示）` : ''}。`,
);

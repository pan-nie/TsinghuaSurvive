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
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = ['site.config.json', 'src/data/ai.config.yml'];
const PLACEHOLDER = /REPLACE_[A-Z0-9_]+/g;

const hits = [];
for (const rel of FILES) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  text.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(PLACEHOLDER)) {
      hits.push({ rel, line: index + 1, token: match[0] });
    }
  });
}

if (hits.length) {
  console.error('✖ 还有未替换的占位符，不能部署：\n');
  for (const hit of hits) console.error(`  · ${hit.rel}:${hit.line}  ${hit.token}`);
  console.error(
    '\n这些值只能由站点维护者在 Cloudflare 控制台取得（Account ID / Zone ID / R2 Access Key ID / Turnstile sitekey）。' +
      `\n替换步骤见 MIGRATION.md §7，换完跑一次 \`npm run domain:sync\` 与 \`npm run verify\`。\n`,
  );
  process.exit(1);
}

console.log(`✔ 部署前检查通过：${FILES.map((f) => relative(ROOT, join(ROOT, f))).join('、')} 里没有遗留占位符。`);

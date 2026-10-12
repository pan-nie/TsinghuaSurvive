#!/usr/bin/env node
/**
 * 域名守卫 —— 让「换域名漏改一处」这类静默失效不可能发生。
 *
 * 三道检查：
 *   1. **同步一致性**：`domain-sync` 计划要改的文件，现在是不是已经一致（等于跑一次 --check）。
 *   2. **旧域名残留**：`site.config.json` 的 `hostRewrites` 左侧那些主机名，全仓任何文件里
 *      都不允许再出现（白名单只有 site.config.json 自己与 MIGRATION.md 的历史记录）。
 *   3. **SSOT 自检**：主机名不能带协议/斜杠/端口，媒体地址必须是合法绝对 URL。
 *
 * 用法：`npm run check:domain`（CI 与 `npm run verify` 里都会跑）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { buildPlan, ROOT, SYNCED_FILES } from './domain-sync.mjs';
import { configPath, hostRewrites, legacyApexDomains, legacyIdentifiers, mediaBaseUrl, siteHost, authHost } from './site-config.mjs';

const problems = [];

// ── 1. SSOT 自检 ───────────────────────────────────────────────────────
for (const [field, value] of [['siteHost', siteHost], ['authHost', authHost]]) {
  if (typeof value !== 'string' || !value.trim()) {
    problems.push(`site.config.json 的 ${field} 是空的。`);
    continue;
  }
  if (/^https?:\/\//i.test(value)) problems.push(`site.config.json 的 ${field} 不要带协议：${value}`);
  if (value.endsWith('/')) problems.push(`site.config.json 的 ${field} 不要带结尾斜杠：${value}`);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) problems.push(`site.config.json 的 ${field} 不像一个主机名：${value}`);
}
try {
  const url = new URL(mediaBaseUrl);
  if (url.protocol !== 'https:') problems.push(`mediaBaseUrl 必须是 https：${mediaBaseUrl}`);
} catch {
  problems.push(`site.config.json 的 mediaBaseUrl 不是合法地址：${mediaBaseUrl}`);
}
for (const target of SYNCED_FILES) {
  if (!existsSync(join(ROOT, target))) {
    problems.push(`同步目标文件不见了：${target}（改了文件名就要同步更新 SYNCED_FILES）`);
  }
}

// ── 2. 同步一致性 ──────────────────────────────────────────────────────
for (const change of buildPlan()) {
  if (change.missing) {
    problems.push(`${change.rel}：找不到「${change.label}」那一行，值规则没匹配上（文件被改写过？）`);
  } else {
    problems.push(`${change.rel}：与 site.config.json 不一致，跑 \`npm run domain:sync\``);
  }
}

// ── 3. 旧域名残留 ──────────────────────────────────────────────────────
/** 只扫文本类文件；图片、字体这些二进制读了也没意义 */
const TEXT_EXT = new Set([
  '.mjs', '.js', '.cjs', '.ts', '.mts', '.astro', '.md', '.mdx', '.json', '.jsonc',
  '.yml', '.yaml', '.txt', '.css', '.html', '.toml', '.xml', '.sh', '.example',
]);
/** 构建产物、依赖、本地大目录、审查产物都不算「仓库里的域名引用」 */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.astro', '.wrangler', '.wrangler-config', '.wrangler-logs',
  '.npm-cache', 'materials', '.review', '.secrets',
]);
/** 这几个人工维护的文件里出现域名没有意义（锁文件、补丁），跳过以免拖慢扫描 */
const SKIP_FILES = new Set(['package-lock.json']);
/** 例外：SSOT 自己保存替换表；MIGRATION.md 是这次迁移的历史记录 */
const RESIDUE_ALLOWLIST = new Set(['site.config.json', 'MIGRATION.md']);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) walk(full, acc);
    else if (TEXT_EXT.has(extname(name)) && !SKIP_FILES.has(name)) acc.push(full);
  }
  return acc;
}

const legacyTokens = [
  ...new Set([...Object.keys(hostRewrites ?? {}), ...legacyApexDomains, ...legacyIdentifiers]),
];
const residue = [];

if (legacyTokens.length) {
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (RESIDUE_ALLOWLIST.has(rel)) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (const host of legacyTokens) {
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].includes(host)) residue.push(`${rel}:${i + 1} 还残留旧标识（域名或账号 ID）${host}`);
      }
    }
  }
}

// ── 输出 ───────────────────────────────────────────────────────────────
if (residue.length) {
  problems.push(...residue.slice(0, 40));
  if (residue.length > 40) problems.push(`（还有 ${residue.length - 40} 处旧域名残留，先跑 domain:sync）`);
}

if (problems.length) {
  console.error('✖ 域名检查未通过：\n');
  for (const problem of problems) console.error(`  · ${problem}`);
  console.error(`\n事实来源：${relative(ROOT, configPath.pathname)}\n`);
  process.exit(1);
}

console.log(
  `✔ 域名检查通过：siteHost=${siteHost}，authHost=${authHost}，mediaBaseUrl=${mediaBaseUrl}` +
    `${legacyTokens.length ? `，已确认全仓无 ${legacyTokens.length} 个旧域名残留` : ''}`,
);

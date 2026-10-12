/**
 * 站点域名的**读取层** —— 所有能 import 的代码都从这里拿域名，不要各写一份。
 *
 * 唯一事实来源是同目录的 `site.config.json`（纯 JSON，shell 侧用 `jq` 也能读）。
 * 不能 import 的文件（wrangler.jsonc / CMS config.yml / robots.txt / CORS 等）由
 * `npm run domain:sync` 写入，`npm run check:domain` 在 CI 里守住两边一致。
 *
 * 为什么单独一个模块而不是各脚本自己 JSON.parse：
 *   派生规则（origin、sitemap、媒体地址回退）只写一次，避免「一处改了、另一处按老规则算」。
 */
import { readFileSync } from 'node:fs';

const CONFIG_PATH = new URL('../site.config.json', import.meta.url);

const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

export const configPath = CONFIG_PATH;
export const config = raw;

/** 仓库地址（用于「编辑此页」链接、以及 check:admin 校验 CMS 的 backend.repo） */
export const repo = raw.repo;
/** `owner/name` 形式，CMS 配置里要的就是这个 */
export const repoSlug = new URL(raw.repo).pathname.replace(/^\//, '').replace(/\.git$/, '');

export const siteHost = raw.siteHost;
export const siteOrigin = `https://${raw.siteHost}`;

export const authHost = raw.authHost;
export const authOrigin = `https://${raw.authHost}`;

/**
 * 媒体公开地址。
 * 显式配了就照用（当前指向 R2 的独立公开域名）；没配就落到主站路径 `<siteOrigin>/media`，
 * 由主 Worker 从 R2 读——这种「同一个主机名」的形态不需要额外证书与 DNS。
 */
export const mediaBaseUrl = raw.mediaBaseUrl
  ? raw.mediaBaseUrl.replace(/\/+$/, '')
  : `${siteOrigin}/media`;
export const mediaHost = new URL(mediaBaseUrl).host;
/** 媒体是否挂在主站域名下（决定运维步骤：路径形态不需要 R2 公开域名） */
export const mediaOnSiteHost = mediaHost === siteHost;

export const oauthAllowedDomains = raw.oauthAllowedDomains;

export const cloudflare = raw.cloudflare;

/** 旧域名 → 新域名（供 sync 改写、check 拦截） */
export const hostRewrites = raw.hostRewrites ?? {};

/**
 * 旧域名所属的**裸域名**（例如某个已废弃的二级域名所属的注册域名）。
 *
 * 为什么需要它：`hostRewrites` 的键是完整主机名，只匹配完整主机名时，
 * `*.旧域`、裸域这类写法会从守卫眼皮底下溜过去（实测踩过）。
 * 显式列出而不是从主机名推导后缀：`foo.co.uk` 推导出 `co.uk` 会制造误报。
 */
export const legacyApexDomains = raw.legacyApexDomains ?? [];

/**
 * 旧账号 / 旧 zone 的标识（一串十六进制 ID，格式与新值相同）。
 * 域名扫描抓不到它们 —— C3 实测就在 `.github/workflows/deploy.yml` 的注释里漏了一个。
 * 这些值不是秘密，但指向一个即将废弃的账号，留在仓库里只会误导。
 */
export const legacyIdentifiers = raw.legacyIdentifiers ?? [];

/** 常用绝对地址，避免各脚本各自拼 */
export const sitemapUrl = `${siteOrigin}/sitemap-index.xml`;
export const rssUrl = `${siteOrigin}/rss.xml`;
export const ogImageUrl = `${siteOrigin}/og.png`;

export default {
  repo,
  repoSlug,
  siteHost,
  siteOrigin,
  authHost,
  authOrigin,
  mediaBaseUrl,
  mediaHost,
  mediaOnSiteHost,
  oauthAllowedDomains,
  cloudflare,
  hostRewrites,
  legacyApexDomains,
  legacyIdentifiers,
  sitemapUrl,
  rssUrl,
  ogImageUrl,
};

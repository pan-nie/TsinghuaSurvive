# 域名迁移方案：tsinghua.nathanpenny.fun → thu.whizzzest.com

> 状态：**代码/配置/CI 已改完（分支 `migrate/thu-whizzzest`），Cloudflare 控制台步骤待执行**。
> 本文档是执行手册 + 决策记录。迁移完成后，把仍然有效的事实并进 `HANDOVER.md`；
> 本文档保留为历史记录，并被 `check:domain` 列入旧域名白名单（只有它和 `site.config.json` 可以出现旧域名）。
>
> ⚠️ 分支上 `site.config.json` 与 `src/data/ai.config.yml` 里有 4 个 `REPLACE_` 占位符
> （Account ID / Zone ID / R2 Access Key ID / Turnstile sitekey）。**占位符没换掉之前不要合并到 main、更不要部署**：
> 换掉之前问答会 fail-closed、后台上传会失败，这是有意的（宁可显式失败，也不要静默用错账号）。
>
> 最后更新：2026-10-12

---

## 1. 决策记录

| 议题 | 结论 |
|---|---|
| 迁移范围 | 全部资源搬到 `whizzzest.com` 所在的 Cloudflare 账号（**账号 W**）；旧的 nathanpenny.fun 账号（**账号 N**）在域名到期后整体废弃 |
| 主域名 | `thu.whizzzest.com` |
| 媒体 | **不申请独立媒体域名**：由主 Worker 提供 `https://thu.whizzzest.com/media/*`，从 R2 读 |
| OAuth 中转 | `auth.thu.whizzzest.com` |
| PR 预览 | **取消**：删除预览 Worker、预览域名与 `preview.yml`（作者要看效果用本地 `npm run dev`，或合并后看线上） |
| 旧域名 | **不续费**：301 只做到期为止，到期后旧链接必然 404 |
| GitHub OAuth App | 改现有的（callback + Homepage URL） |
| 账号 W 权限 | Super Admin（已确认）；**账号 W 里还有别的 Worker 在跑**，免费额度是账号级共享的 |
| R2 数据 | 空桶，不搬 |

## 2. 为什么这不是「换个 DNS 记录」

**硬约束**：Workers 的 Custom Domain 要求 **zone 与 Worker 在同一个 Cloudflare 账号**（[官方文档](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)）。
`thu.whizzzest.com` 的 zone 在账号 W，主站 Worker 在账号 N —— 跨账号绑不上，也没有官方的跨账号绑定方式。

另一条路是把 `whizzzest.com` 整个 zone 搬进账号 N（[搬 zone 的官方步骤](https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/)），
那样现有资源原地不动，但要动注册商 NS、迁移期 zone 处于 Pending 不能代理流量，还会影响 whizzzest.com 上已有的东西。
**不采用**：R2 是空桶、账号 N 要整体废弃，直接在新账号重建更干净。

## 3. 目标架构

| 地址 | 指向 | 账号 |
|---|---|---|
| `thu.whizzzest.com` | Worker `tsinghua-guide`：静态产物 + `/api/*`（AI 问答）+ `/media/*`（R2 媒体） | W |
| `auth.thu.whizzzest.com` | Worker `tsinghua-guide-auth`：Sveltia CMS 的 OAuth 中转（手动 `npm run auth:deploy`） | W |
| — | ~~`preview.*`~~ 已取消 | — |
| `tsinghua.nathanpenny.fun` | 301 → 主域名（过渡期，域名到期即消失） | N |

## 4. 关键判断（含两个必须知道代价的选择）

### 4.1 媒体并入主站路径解决了证书问题，但把图片请求挪进了 Worker

原方案的坑：`media.thu.whizzzest.com` 是二级子域名，Universal SSL **只覆盖裸域 + 一级子域**，
二级及更深需要 Advanced Certificate Manager（[ACM 文档](https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/)）。
Worker Custom Domain 会自动签发多级子域证书（不需要 ACM），但 **R2 的 custom domain 不是 Worker Custom Domain**，
[R2 文档](https://developers.cloudflare.com/r2/buckets/public-buckets/)没有承诺多级子域自动签证书。

**选定的做法**：媒体不做独立域名，改由主 Worker 在 `${siteOrigin}/media/*` 提供。收益是零证书风险、零额外 DNS、同源。
代价（已知并接受）：

- 每个媒体请求都是一次 **Worker 请求**，计入账号 W 的 100k 请求/天（与账号 W 上其它 Worker 共享）。缓解靠一年期不可变缓存头（浏览器只取一次）；真撞上限再考虑 Workers 付费档（$5/月）或回头给媒体单独的一级子域名。
- 本地 `npm run dev`（纯 Astro）**看不到媒体**，要看媒体得用 `npm run dev:worker`（wrangler dev 连真实 R2）。

### 4.2 旧域名不续费 ⇒ 301 有寿命，且不可延长

301 依赖旧域名还能解析。域名一到期 DNS 直接不存在，跳转环节被跳过、直接 NXDOMAIN。
已确认**不续费**，所以这是可接受的：过渡期做跳转，到期后旧链接失效。
如果将来反悔，唯一的补救是续费（越早越便宜）。

### 4.3 域名只存在于一个地方（已完成 C1）

见 §5。现在换域名 = 改 1 个文件 + 跑 2 条命令。

### 4.4 新旧站并行，不做一次性切换

旧 Worker/旧域名原样留着跑，新域名部署并验证通过后才上 301、才考虑删旧资源。回滚成本≈0（§10）。

### 4.5 账号额度要重算

主站把每日问答硬闸门设在 200 次（`src/data/ai.config.yml` 的 `limits.daily_answers`，对应免费档 10,000 Neurons/天）。
账号 W 已有其它 Worker，若它们也在烧 AI 或请求数，这个数字要下调。

## 5. 阶段 0（已完成）：域名单一来源

### 5.1 事实来源：`site.config.json`（当前内容）

```json
{
  "repo": "https://github.com/pan-nie/TsinghuaSurvive",
  "siteHost": "thu.whizzzest.com",
  "authHost": "auth.thu.whizzzest.com",
  "oauthAllowedDomains": "*.whizzzest.com,localhost",
  "cloudflare": {
    "accountId": "REPLACE_ACCOUNT_W_ACCOUNT_ID",
    "zoneId": "REPLACE_ACCOUNT_W_ZONE_ID",
    "r2Bucket": "tsinghua-guide-media",
    "r2AccessKeyId": "REPLACE_ACCOUNT_W_R2_ACCESS_KEY_ID"
  },
  "hostRewrites": {
    "tsinghua.nathanpenny.fun": "thu.whizzzest.com",
    "auth.nathanpenny.fun": "auth.thu.whizzzest.com",
    "media.nathanpenny.fun": "thu.whizzzest.com/media",
    "preview.nathanpenny.fun": "thu.whizzzest.com"
  },
  "legacyApexDomains": ["nathanpenny.fun"]
}
```

- **`mediaBaseUrl` 故意不写**：省略即自动取 `${siteOrigin}/media`（媒体并入主站的形态）。想回到独立媒体域名时再显式写上。
- **`hostRewrites`** 是「旧域名 → 新域名」替换表，同时是守卫依据：右侧值写好后，全仓任何文件都不允许再出现左侧主机名。
- **`legacyApexDomains`** 是补漏用的：只匹配完整主机名时，`*.旧域`、zone 名、裸域这类写法会溜过守卫（C3 实测踩到，HANDOVER/auth-worker README 里就有 `*.nathanpenny.fun`）。它是显式列表而不是从主机名推导后缀，避免把 `foo.co.uk` 推成 `co.uk` 造成误报。

### 5.2 谁读它、谁被写、谁被守

| 类型 | 文件 | 机制 |
|---|---|---|
| 直接 import | `astro.config.mjs`、`scripts/generate-og.mjs`、`scripts/r2-setup.mjs`、`scripts/check-media.mjs`、`scripts/check-admin.mjs`、`scripts/check-ai-worker.mjs`、`scripts/check-links.ts`、`scripts/verify-links.ts` | `scripts/site-config.mjs` 统一派生（origin / sitemap / RSS / OG / 媒体地址） |
| 用 Astro 注入 | `src/components/Head.astro`、`src/pages/rss.xml.ts` | 用 `Astro.site` / `context.site`；**不要在组件里 import 读文件的模块** —— 它们会被打进 `dist/.prerender/`，打包后 `import.meta.url` 不再指向仓库根目录，读 `site.config.json` 会 ENOENT（C1 实测踩过，见 §12） |
| 不能 import，由 sync 写 | `wrangler.jsonc`、`auth-worker/wrangler.jsonc`、`public/admin/config.yml`、`public/robots.txt`、`r2/cors.json`、`src/data/ai.config.yml`、`src/content/docs/contribute.mdx`、`src/utils/media-embed.mjs`、`.github/ISSUE_TEMPLATE/config.yml`、`.github/pull_request_template.md`、`README.md`、`HANDOVER.md`、`OUTLINE.md`、`REFERENCE-NOTES.md`、`CONTENT-EDITING-PLAN.md`、`auth-worker/README.md` | 值规则（按 key 精确替换）+ `hostRewrites` 域名改写 |
| 构建产物 | `dist/**`、`public/og.png` | 不用手改；卡片图跑 `npm run og` 重新生成 |

### 5.3 两条命令 + CI 接入

- `npm run domain:sync` —— 写入（幂等，打印逐行 diff）。
- `npm run check:domain` —— 校验一致 + 全仓旧标识扫描（旧域名、裸域、旧 Account/Zone ID）；已并入 `check:all` / `verify`，并在 `deploy.yml` 里成为独立一步。
- `npm run check:deploy-ready` —— 部署前闸门：`site.config.json` / `ai.config.yml` 里还有 `REPLACE_` 占位符就**拒绝部署**。
  刻意**不**并入 `check:domain`：迁移期间占位符是预期状态，让本地整套校验跟着变红会挡住其它验证；但部署必须以清晰的错误被挡住（否则 wrangler 只会抛一个跟根因无关的错）。

**以后换域名的完整动作**：① 改 `site.config.json`（新域名 + 把旧域名加进 `hostRewrites`）→ ② `npm run domain:sync` → ③ `npm run og` → ④ `npm run verify`。

## 6. 阶段 1（已完成）：媒体改由主 Worker 提供

实际落地的内容：

1. `wrangler.jsonc`：新增 `r2_buckets` 绑定（`MEDIA` → `tsinghua-guide-media`，桶名由 `domain:sync` 与 SSOT 保持一致）；`assets.run_worker_first` 从 `["/api/*"]` 改为 `["/api/*", "/media/*"]`。
2. `src/worker/media.js`（新增）：`/media/<key>` 出口 —— 只允许 GET/HEAD；路径穿越校验（含 `..%2f` 这类「点段 + 编码斜杠」）；单段 `Range`（视频拖进度条）；`If-None-Match` → 304；越界 Range → 416；`Cache-Control: public, max-age=31536000, immutable`；对象不存在 → 404；桶未绑定 → 503（与「文件不存在」区分开，避免部署事故被静默成 404）。
3. `src/worker/index.js`：接入 `/media/*` 路由（异常单独打日志，不与 404 混淆）。
4. `scripts/check-media-worker.mjs`（新增，`npm run check:media:worker`，已并入 `verify` 与 CI）：33 项断言 —— 命中、HEAD、404/405/400/503、Range 四种形态、416、304、静态兜底。
5. `public/admin/config.yml` 的 `public_url` 与文档说明（随阶段 2 一起换值）。

> 这一步**不改域名**，部署到旧站也是安全的（旧的 R2 公开域名仍然有效），可以独立合并、独立验证。

> 实测记录：这个测试第一次跑就抓出两个真问题 —— 越界 Range 返回 200 而不是 416（`end < start` 的判断顺序错了）、以及一个测试假设错误（WHATWG URL 会把 `%2e%2e` 归一化掉，真正的攻击面是 `..%2f`）。这类「页面照开、视频拖不动」的缺陷只有断言能发现。

## 7. 阶段 2（已完成）：代码全量换域名

`site.config.json` 已切成新域名（删掉 `mediaBaseUrl`、填好 `hostRewrites` 与 `legacyApexDomains`），
`npm run domain:sync` 一次性改完 16 个文件（配置 + 文档正文），`npm run og` 重新生成了 4 张分享卡片图，
`npm run check:domain` 确认全仓无旧域名残留。

### 还需要你提供的值（阶段 3 的前置）

| 值 | 从哪来 | 填到哪 |
|---|---|---|
| 账号 W 的 Account ID | 控制台 → Workers & Pages 概览右侧 | `site.config.json` 的 `cloudflare.accountId` |
| `whizzzest.com` 的 Zone ID | 控制台 → 该 zone 的 Overview | `site.config.json` 的 `cloudflare.zoneId` |
| 新的 R2 Access Key ID | 阶段 3 第 2 步：R2 API 令牌（Object Read & Write，限桶） | `site.config.json` 的 `cloudflare.r2AccessKeyId` |
| 新的 Turnstile sitekey | 阶段 3 第 3 步：新建挂件（允许域名 `thu.whizzzest.com`） | `src/data/ai.config.yml` 的 `turnstile.sitekey` |
| 新的 API Token | 阶段 3 第 4 步：权限照 `HANDOVER.md` 第 5 节，zone 只选 `whizzzest.com` | GitHub Secrets 的 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` |

前三个填完跑一次 `npm run domain:sync`（它会写进 `public/admin/config.yml`），四个都填完再跑 `npm run verify`。

## 8. 阶段 3：Cloudflare 控制台（账号 W）

每步都要验证通过再进下一步。

| # | 操作 | 验证 |
|---|---|---|
| 1 | 确认 Workers AI 可用、账号 W 现有额度占用 | 控制台可见 Workers AI |
| 2 | 建 R2 桶 `tsinghua-guide-media` + 建 R2 API 令牌（Object Read & Write，限此桶） | `npm run r2:setup -- --check` 报告「桶已存在 / 公开域名不需要」 |
| 3 | 新建 Turnstile 挂件，域名填 `thu.whizzzest.com`（本地开发用 `.dev.vars` 覆盖成 localhost） | 挂件在页面上能渲染 |
| 4 | 建 API Token（Workers Scripts/Routes Edit + Zone Read，zone 限 `whizzzest.com`）→ 填进 GitHub Secrets 的 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`；同时把 Account ID / Zone ID / R2 Access Key ID 填进 `site.config.json`、新 sitekey 填进 `src/data/ai.config.yml`，跑 `npm run domain:sync` | `npm run check:deploy-ready` 通过（占位符清零）、`npm run verify` 全绿 |
| 5 | 部署主 Worker（绑 `thu.whizzzest.com`） | `curl -I https://thu.whizzzest.com/` = 200 |
| 6 | 写 Secrets：`TURNSTILE_SECRET_KEY`（新挂件）、`ADMIN_TOKEN`、`CONFIG_ENC_KEY`（后两个可直接用 `.secrets/` 里的现成值） | `npx wrangler secret list` |
| 7 | 部署 auth-worker（`npm run auth:deploy`）+ 改 GitHub OAuth App 的 callback、Homepage | `curl -s https://auth.thu.whizzzest.com/auth \| head -c 200` 不是 `MISCONFIGURED_CLIENT` |
| 8 | 后台上传一张图，确认走 `/media/uploads/…` | 图片能打开；`curl -I` 看到 `cache-control: immutable` |
| 9 | 旧 zone（账号 N）加 Redirect Rule：`tsinghua.nathanpenny.fun/*` → `https://thu.whizzzest.com/$1`，301 | `curl -sI https://tsinghua.nathanpenny.fun/start/how-to-use/` 返回 301 且 Location 正确 |

## 9. 验证清单

**本地**（我负责）

- [ ] `npm run verify` 全绿（含 `check:domain`；AI Worker 43 项端到端、媒体出口 33 项）
- [ ] `site.config.json` 与 16 个同步文件一致；全仓无旧标识（域名 / 裸域 / 旧 Account、Zone ID）
- [ ] 占位符填完前 `npm run check:deploy-ready` 必须失败并列出 4 个占位符；填完后必须通过（防呆闸门有效）
- [ ] `npm run og` 后卡片图上的地址是新域名
- [ ] 媒体路由的端到端测试（命中 / 404 / 路径穿越 / Range / 缓存头）

**线上**（切换前逐条）

- [ ] `/`、`/sitemap-index.xml`、`/rss.xml`、`/robots.txt` 里的域名正确
- [ ] 任一文章页的 `canonical`、`og:url`、JSON-LD `url` 都是新域名
- [ ] Pagefind 站内搜索可用
- [ ] `/api/ai-config` 200 且 sitekey 是新挂件的；`/ask/` 走真实 Turnstile 拿到回答
- [ ] 后台 `https://thu.whizzzest.com/admin/` GitHub 一键登录能回到后台
- [ ] 后台上传图片 → 存 R2 → 正文引用可打开；视频能拖进度条（Range）
- [ ] 微信内置浏览器打开主域名正常

## 10. 回滚

| 出问题的位置 | 回滚动作 |
|---|---|
| 新域名部署/验证不过 | 旧站没动过；把 CI Secrets 换回账号 N 即可 |
| 已上 301 但新站有严重问题 | 删掉 Redirect Rule，旧站立刻恢复 |
| 账号 W 资源建错 | 删掉对应 Worker/桶重建，不影响已上线部分 |

唯一的不可逆点是**删账号 N 的资源**，所以它排在最后，并留 1–2 周观察期。

## 11. 风险台账

| 风险 | 影响 | 处理 |
|---|---|---|
| 账号 W 免费额度被其它 Worker 占用 | AI 问答或媒体请求提前撞限流 | §4.5；必要时下调 `daily_answers`，或上 Workers 付费档 |
| `/media/*` 把图片请求变成 Worker 请求 | 100k/天额度消耗快 | 一年期不可变缓存；`/media/` 命中的请求不进 Durable Object，只读 R2 |
| 本地 `npm run dev` 看不到媒体 | 内容作者本地预览缺图 | 文档写明用 `npm run dev:worker` |
| 旧域名到期后 301 失效 | 旧外链 404、收录流失 | 已接受（不续费）；过渡期尽早完成切换 |
| 换了 Turnstile 挂件但 sitekey 没同步 | 问答一律 403 | `ai.config.yml` + 阶段 3 第 3 步；`check:ai` 兜底 |
| 域名漏改一处 | 静默失效 | `check:domain` 守卫（CI 独立一步） |
| 迁移期搜索引擎抓到新旧两个版本 | 收录波动 | canonical 指向新域名 + 过渡期 301 |

## 12. 执行进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 域名单一来源（`site.config.json` + `domain:sync` / `check:domain` + CI） | ✅ 已完成（当地值 = 旧域名，行为不变） |
| 0b | 取消 PR 预览环境（删 `preview.yml` / `wrangler.preview.jsonc`，`show_preview_links: false`，CORS 去掉预览源） | ✅ 已完成 |
| 1 | 媒体改由主 Worker 提供 `/media/*`（绑定 + 路由 + 33 项断言） | ✅ 已完成（不改域名，可独立部署验证） |
| 2 | 全量换域名（SSOT 翻转 + 16 个文件同步 + 4 张卡片图 + 文档改写 + 守卫补 `legacyApexDomains`） | ✅ 已完成（4 个 `REPLACE_` 占位符待你填，见 §7） |
| 3 | 账号 W 控制台重建 + 部署 + 301 | ⏳ 待你提供 §7 的四个值 |
| 4 | 收尾：并入 HANDOVER、删账号 N 资源 | ⏳ 待做 |

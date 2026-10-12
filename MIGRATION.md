# 域名迁移方案：tsinghua.nathanpenny.fun → thu.whizzzest.com

> 状态：**迁移完成（2026-10-12）**。站点已在 `thu.whizzzest.com` / 新账号上线：
> 页面、AI 问答、媒体出口、后台 GitHub 一键登录、CI 自动部署 + 部署后线上冒烟全部打通，**仓库里已无任何占位符**。
>
> 两处**刻意不做**（都是用户的决定，不是遗漏）：
> 1. **旧域名 301** —— 旧账号不再处理；旧链接在域名到期后直接 404（已接受）。
> 2. **Always Use HTTPS** —— `http://thu.whizzzest.com/` 仍返回 200；canonical 是 https、站点是公开内容站，影响有限；
>    `check:live` 对这个只给警告不失败。
>
> 本文档是执行手册 + 决策记录。事实已并进 `HANDOVER.md`；本文档保留为历史记录，
> 并被 `check:domain` 列入残留白名单（只有它和 `site.config.json` 可以出现旧标识）。
>
> 最后更新：2026-10-12
>
> 分支与 PR：`migrate/thu-whizzzest`；PR <https://github.com/pan-nie/TsinghuaSurvive/pull/6>。
> 分支上跑过一次完整 CI（run [38211678042](https://github.com/pan-nie/TsinghuaSurvive/actions/runs/38211678042)）：
> **21 步全绿**，含「检查部署凭证」（token 能看到账号 W）、「部署到 Cloudflare Workers」与「线上冒烟检查（部署后）」。

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

**实测补记（2026-10-12）**：`auth.thu.whizzzest.com`（同样是二级子域名，但绑的是 **Worker Custom Domain**）
拿到了免费的公开信任证书 —— issuer `Google Trust Services`，SAN 含 `auth.thu.whizzzest.com` 与 `*.auth.thu.whizzzest.com`，
有效期到 2027-01-10 并自动续期。这条实测坐实了上面那句「Worker Custom Domain 不需要 ACM」，
也说明**「二级子域名 = 要买证书」是错的**：要买的是「在 zone 上手动挂二级子域证书」那条路。

> 相关决策：因此 `auth` 中转**保持独立子域名**，没有搬进站内 `/auth`（理由与代价见 HANDOVER.md 第 9.2 节）。

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
    "accountId": "67e59aecb10a2a8b4b4d525ff8ddcb56",
    "zoneId": "158d2b4327671b36ae8b9183a5598daf",
    "r2Bucket": "tsinghua-guide-media",
    "r2AccessKeyId": "cc4b0674a8010051a2ed0f9be83d54a7"
  },
  "hostRewrites": {
    "tsinghua.nathanpenny.fun": "thu.whizzzest.com",
    "auth.nathanpenny.fun": "auth.thu.whizzzest.com",
    "media.nathanpenny.fun": "thu.whizzzest.com/media",
    "preview.nathanpenny.fun": "thu.whizzzest.com"
  },
  "legacyApexDomains": ["nathanpenny.fun"],
  "legacyIdentifiers": ["aa23021279f1ffd6901d7093879554f3", "068decbde572025a27b25b97080e4355"]
}
```

- **`mediaBaseUrl` 故意不写**：省略即自动取 `${siteOrigin}/media`（媒体并入主站的形态）。想回到独立媒体域名时再显式写上。
- **`hostRewrites`** 是「旧域名 → 新域名」替换表，同时是守卫依据：右侧值写好后，全仓任何文件都不允许再出现左侧主机名。
- **`legacyApexDomains`** 是补漏用的：只匹配完整主机名时，`*.旧域`、zone 名、裸域这类写法会溜过守卫（C3 实测踩到，HANDOVER/auth-worker README 里就有 `*.nathanpenny.fun`）。它是显式列表而不是从主机名推导后缀，避免把 `foo.co.uk` 推成 `co.uk` 造成误报。
- **`legacyIdentifiers`** 同理补域名之外的口子：`deploy.yml` 注释里漏过一个旧 Account ID，域名扫描抓不到它。
- 三个 Cloudflare 标识与 Turnstile sitekey **都已是真值**（2026-10-12），仓库内无占位符。

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

### 这些值的状态

| 值 | 现在的值 | 状态 |
|---|---|---|
| Account ID | `67e59aecb10a2a8b4b4d525ff8ddcb56` | ✅ 已填（新浪登录 nathanpenny@qq.com 唯一可见账号，且它拥有 whizzzest.com） |
| Zone ID | `158d2b4327671b36ae8b9183a5598daf` | ✅ 已填（`whizzzest.com`，active，Free plan） |
| Turnstile sitekey | `0x4AAAAAAFUTnXn4vkXwvC5O` | ✅ 已填（新建挂件 `tsinghua-guide-ask`，域名 thu.whizzzest.com / localhost / 127.0.0.1） |
| R2 Access Key ID | `cc4b0674a8010051a2ed0f9be83d54a7` | ✅ 已填（用户 2026-10-12 创建 R2 API 令牌）。**Secret Access Key 只在创建时显示一次**，由编辑者首次打开后台媒体库时在浏览器输入，不进仓库 |
| CI 的 API Token | 已写入 GitHub Secrets | ✅ 已配（2026-10-12 14:05；CI 部署 + 线上冒烟实测通过） |

## 8. 阶段 3：Cloudflare 侧（账号 W）—— 执行结果

| # | 操作 | 结果 |
|---|---|---|
| 1 | 账号与额度盘点 | ✅ 账号 W = `67e59aecb10a2a8b4b4d525ff8ddcb56`（登录邮箱 nathanpenny@qq.com）；zone `whizzzest.com` = `158d2b4327671b36ae8b9183a5598daf`（active / Free）。⚠️ **账号里已有 7 个 Worker**（nmail-site、whizzzest、whizzzest-admin、whizzzest-game、whizzzest-im、whizzzest-merchant、whizzzest-writer）→ 100k 请求/天与 Workers AI 10k Neurons/天都是**账号级共享**，本站的 `/api/*` 与 `/media/*` 都算在里面 |
| 2 | 建 R2 桶 + 应用 CORS + R2 API 令牌 | ✅ 桶 `tsinghua-guide-media` 已建；`r2/cors.json` 已应用（`allowed_origins: https://thu.whizzzest.com, http://localhost:4321`）；R2 API 令牌由用户创建，Access Key ID 已填进 `site.config.json` 并 `domain:sync` 进 CMS 配置（`public/admin/config.yml`） |
| 3 | 新建 Turnstile 挂件 | ✅ 已建 `tsinghua-guide-ask`，域名 `thu.whizzzest.com` / `localhost` / `127.0.0.1`；sitekey `0x4AAAAAAFUTnXn4vkXwvC5O` 已填进 `src/data/ai.config.yml`；secret 存在本机 `.secrets/turnstile-secret.txt`（已写进 Worker Secret） |
| 4 | CI 的 API Token → GitHub Secrets | ✅ 已配：`gh secret list` 显示 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 均为 2026-10-12 更新；`deploy.yml` 在分支上手动触发后，凭证守卫 `ready=true`、部署与线上冒烟全部通过（见 §12 的验证记录） |
| 5 | 部署主 Worker | ✅ 已部署：369 个文件；绑定 ASK_GATE（DO）/ MEDIA（R2）/ AI / ASSETS；自定义域名 `thu.whizzzest.com` 已创建，证书已签发（HTTPS 200 / 0.72 s） |
| 6 | 写 3 个 Worker Secret | ✅ `TURNSTILE_SECRET_KEY`（新挂件）、`ADMIN_TOKEN`、`CONFIG_ENC_KEY`（后两个直接用本机 `.secrets/` 里的现成值） |
| 7 | 部署 auth-worker + 改 GitHub OAuth App | ✅ 完成：Worker 已部署，`auth.thu.whizzzest.com` 的 DNS 记录与证书就绪；用户写入 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` 并把 callback 改成 `https://auth.thu.whizzzest.com/callback`。端到端实测：`GET /auth?provider=github&site_id=thu.whizzzest.com` → **302 到 github.com/login/oauth/authorize**（不再是 MISCONFIGURED_CLIENT）；白名单反向验证 —— 陌生域名 → `UNSUPPORTED_DOMAIN` |
| 8 | 媒体出口真机验证 | ✅ 上传测试对象 → `GET /media/uploads/smoke-test.txt` = 200（`cache-control: immutable`、`etag`、`accept-ranges`）；`Range: bytes=6-10` → 206 + `content-range: bytes 6-10/22`；未知 key → 404；测试对象已删除 |
| 9 | 旧域名 301 | ❌ **按用户决定取消**（2026-10-12：「旧账号我不管了」）。旧 zone 在另一个 Cloudflare 登录里，不做 301、也不再清理旧账号资源 —— 后果是**旧链接在域名到期后直接 404**，已被接受。下面仍保留具体做法，将来若改主意可直接照做 |
| 10 | 强制 HTTPS | ⚠️ 未开启，**已记录为可接受的现状**：`http://thu.whizzzest.com/` 返回 200。canonical 已是 https，站点是公开内容站、无敏感数据，所以影响有限；`check:live` 只给警告不失败。想开的话：zone `whizzzest.com` → SSL/TLS → Edge Certificates → Always Use HTTPS = On（区域级，会影响该 zone 下其它站点） |

### 第 4 步的具体做法（CI Token）

1. 控制台 → **My Profile → API Tokens → Create Token → Custom token**，权限：
   - Account → **Workers Scripts → Edit**（部署 Worker）
   - Account → **Workers R2 Storage → Edit**（`MEDIA` 绑定要用）
   - Zone → **Workers Routes → Edit** + Zone → **Zone → Read**（绑定自定义域名）
   - Account Resources：选账号 W（`67e59aecb10a2a8b4b4d525ff8ddcb56`）；Zone Resources：Include → `whizzzest.com`
2. 写进仓库 Secrets（两种方式，任选）：
   ```bash
   # 方式 A：你自己在网页 Settings → Secrets and variables → Actions 里填
   # 方式 B：本机 gh 已登录 pan-nie，可以直接写（token 只在本地输入，不要贴进聊天）
   gh secret set CLOUDFLARE_API_TOKEN   --repo pan-nie/TsinghuaSurvive
   gh secret set CLOUDFLARE_ACCOUNT_ID  --repo pan-nie/TsinghuaSurvive --body 67e59aecb10a2a8b4b4d525ff8ddcb56
   ```
3. 验证：在 PR 上点「Merge」之前，先 `gh workflow run deploy.yml --repo pan-nie/TsinghuaSurvive && gh run watch`；
   日志里「检查部署凭证」应为 `ready=true`，末尾应看到 `thu.whizzzest.com (custom domain)`。
   > 若暂时不想建 token：**建议把旧的 `CLOUDFLARE_API_TOKEN` 删掉**（`gh secret delete CLOUDFLARE_API_TOKEN`）——
   > 这样 main 的 push 会走「缺少 token → 只构建不部署」的正常路径，而不是红一次。

### 第 7 步的具体做法（auth 中转的两个 Secret）

Worker 已经部署好了（域名与证书都在），GitHub OAuth App 的两个值也已写入 —— 本节保留为**重建配方**
（换 OAuth App、密钥泄漏、或别人 fork 后重建时照做）：

```bash
# 1. 从 GitHub OAuth App 页面取 Client ID，并 Generate a new client secret
#    同时把 Authorization callback URL 改成 https://auth.thu.whizzzest.com/callback
#    Homepage URL 改成 https://thu.whizzzest.com/
# 2. 写入 Secret（值在本地粘贴，不要写进任何文件）
cd auth-worker
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
# 3. 验证（返回 302 到 github.com/login/oauth/authorize 就对了，不再是 MISCONFIGURED_CLIENT）
curl -sI "https://auth.thu.whizzzest.com/auth?provider=github&site_id=thu.whizzzest.com" | head -3
```

### 第 9 步的具体做法（301 重定向）

控制台路径：**选中旧 zone `nathanpenny.fun` → Rules → Redirect Rules → Create rule**（旧 zone 必须仍是橙云代理；旧 Worker 的 Custom Domain 正好满足这个前提）。

**规则 1 —— 主站（必做）**

| 字段 | 填什么 |
|---|---|
| Rule name | `迁移到 thu.whizzzest.com` |
| When incoming requests match | Custom filter expression：`(http.host eq "tsinghua.nathanpenny.fun")` |
| Then → Type | Dynamic redirect |
| Expression | `concat("https://thu.whizzzest.com", http.request.uri.path)` |
| Status code | `301` |
| Preserve query string | ✅ 勾上 |

**规则 2 —— 旧媒体直链（建议做，避免老内容里的图片失效）**

同一条规则里再加一条，或另建一条：

- 匹配：`(http.host eq "media.nathanpenny.fun")`
- 跳转：`concat("https://thu.whizzzest.com/media", http.request.uri.path)`，301

**验证**

```bash
# 1. 直接看 301 与 Location（注意：校园网对刚加的记录可能有否定缓存，用 DoH 或 --resolve 旁路）
curl -sI https://tsinghua.nathanpenny.fun/start/how-to-use/ | head -3
# 2. 期望：HTTP/2 301，Location: https://thu.whizzzest.com/start/how-to-use/
# 3. 旧媒体链接也应 301 到 /media/uploads/...
curl -sI https://media.nathanpenny.fun/uploads/example.webp | head -3
```

> 为什么走控制台而不是脚本：Redirect Rule 属于 zone 级 ruleset，需要 zone rules 编辑权限，
> 而 `wrangler login` 的 OAuth scope 里没有它（对照 §8 第 2、4 步那两次 403 的经验，别白试）。
> 若你愿意给我一个带 `Zone → Config → Edit` 权限的 API Token，我可以改成一条 API 调用自动完成。

## 9. 验证清单

**本地**（我负责）

**本地**（代码侧，已全部实测）

- [x] `npm run verify` 全绿（含 `check:domain`；AI Worker 43 项端到端、媒体出口 33 项）
- [x] `site.config.json` 与 16 个同步文件一致；全仓无旧标识（域名 / 裸域 / 旧 Account、Zone ID）
- [x] `npm run og` 后卡片图上的地址是新域名（肉眼确认过生成图）
- [x] 媒体路由的端到端测试（命中 / HEAD / 404/405/400/503 / Range 四形态 / 416 / 304 / 静态兜底）
- [x] 部署闸门行为正确：填值前拒绝部署并列出占位符，填值后放行（仅 R2 Access Key ID 降级为警告）

**线上** —— 已经脚本化：`npm run check:live`（已接入 `deploy.yml`，每次部署后自动跑）

2026-10-12 实测：**16/18 通过，2 条提醒**（`npm run check:live` 的实际输出）

- [x] 首页 200；`canonical` 指向本站；`robots.txt` 的 Sitemap、`sitemap-index.xml`、`rss.xml` 域名全是新域名
- [x] `/api/ai-config` 可达，且 **sitekey / 模式 / 开关与仓库 `ai.config.yml` 一致**（换挂件忘了同步就会红）
- [x] `/api/ask` 无 token → 403 `challenge_failed`（fail-closed；若返回 503 说明缺 `TURNSTILE_SECRET_KEY`）
- [x] 媒体出口：不存在的 key → 404；`/og.png`、`/pagefind/pagefind.js` 可达；后台带 `x-robots-tag: noindex`
- [x] 未知路径 → 404；缺尾斜杠 → 307 跳到带斜杠
- [~] auth 中转：本机 DNS 未命中（校园网对新建记录的否定缓存，DoH 已证实记录存在）→ 在 CI（GitHub runner）上会真验；配置缺失只警告、白名单坏了才失败
- [~] **http 未强制跳 https** ⚠️ 这是真实待办，见 §8 第 10 步
- [ ] 人眼确认项（脚本验不了）：`/ask/` 走**真实挂件**拿到回答；后台 GitHub 一键登录；后台上传一张图；微信内置浏览器打开正常

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
| 2 | 全量换域名（SSOT 翻转 + 16 个文件同步 + 4 张卡片图 + 文档改写 + 守卫补 `legacyApexDomains`/`legacyIdentifiers`） | ✅ 已完成 |
| 3 | 账号 W 侧执行：桶 + CORS + Turnstile 挂件 + 部署 + 3 个 Secret + 媒体真机验证 | ✅ 已完成（主站已上线） |
| 3b | 账号 W 侧剩余：R2 API 令牌、CI Token、auth-worker | ✅ 全部完成（2026-10-12）；旧域名 301 按用户决定取消 |
| 4 | 收尾：并入 HANDOVER、删旧账号资源 | 🟡 事实已并入 HANDOVER；**旧账号资源不再清理**（用户决定不管），随域名到期自然废弃 |

# 需要你手工操作的步骤（迁移收尾）

> 这份清单是临时的：5 项全部完成后可以删掉它（内容并进 `HANDOVER.md`）。
> 站点**已经在线**（<https://thu.whizzzest.com>），下面都是「补齐配套能力」，不做也不会让站点挂掉。
> 你做完任意一项告诉我，我来验证；也可以让我代做（我会写明需要你给我什么）。
>
> 最后更新：2026-10-12

## 速查：会用到的固定值

| 项目 | 值 |
|---|---|
| 新账号 | `67e59aecb10a2a8b4b4d525ff8ddcb56`（登录邮箱 nathanpenny@qq.com，「Nathanpenny@qq.com's Account」） |
| Zone | `whizzzest.com`（= `158d2b4327671b36ae8b9183a5598daf`） |
| 站点 | <https://thu.whizzzest.com>　后台 <https://thu.whizzzest.com/admin/> |
| OAuth 中转 | <https://auth.thu.whizzzest.com> |
| R2 桶 | `tsinghua-guide-media` |
| Turnstile 挂件 | `tsinghua-guide-ask`（已建好，sitekey `0x4AAAAAAFUTnXn4vkXwvC5O`） |
| 仓库 / PR | `pan-nie/TsinghuaSurvive`　草稿 PR **#6** |

---

## ① R2 API 令牌 —— 让后台上传图片（约 1 分钟）

**为什么**：后台媒体库在浏览器里直接跟 R2 的 S3 接口打交道，需要一个 S3 凭据。这是唯一无法用
API 代劳的一步（`/r2/api-tokens*` 的三种路径实测 404/403，wrangler 的 OAuth 没有「API Tokens 管理」权限）。

1. 打开 <https://dash.cloudflare.com/?to=/:account/r2/api-tokens>
2. **Create API token** → 名称随意（建议 `tsinghua-guide-media-rw`）
3. 权限选 **Object Read & Write**
4. 桶只勾 **`tsinghua-guide-media`**（不要给 all buckets）
5. **Create** → 页面上会出现两样东西：
   - **Access Key ID** —— 不是密钥，**发给我**（或自己填进 `site.config.json` 的 `cloudflare.r2AccessKeyId`，再跑 `npm run domain:sync`）
   - **Secret Access Key** —— **只显示这一次**：它是给**每个编辑者**用的（第一次打开后台媒体库时在浏览器里输入一次），
     **不要发给我、不要写进任何文件、不要进仓库**。建议存进密码管理器。
6. 验证：后台打开 <https://thu.whizzzest.com/admin/> → 媒体库 → 上传一张图 → 正文引用能打开。
   （后台登录方式见 ③；在 ③ 完成前用下面的「令牌登录」）

> ⚠️ 现在仓库里唯一剩下的占位符就是它：`site.config.json` 的 `cloudflare.r2AccessKeyId`。
> 它只影响**后台传图**，不影响站点，所以部署闸门把它降级成了警告而不是拦部署。

## ② CI 部署 Token —— 让「合并到 main 就自动上线」（约 2 分钟）

**为什么**：现在仓库 Secrets 里的 `CLOUDFLARE_API_TOKEN` 还是**旧账号**的。CI 已经加了守护：
账号不匹配时会明确报错并跳过部署（不会静默部署到错账号），但要真正自动上线必须换掉它。

1. 打开 <https://dash.cloudflare.com/profile/api-tokens> → **Create Token** → **Custom token**
2. 权限（四项）：
   - Account → **Workers Scripts** → Edit
   - Account → **Workers R2 Storage** → Edit
   - Zone → **Workers Routes** → Edit
   - Zone → **Zone** → Read
3. Account Resources：Include → **Nathanpenny@qq.com's Account**
   Zone Resources：Include → **whizzzest.com**
4. Create → 复制 token（**只显示一次**）。然后二选一：
   ```bash
   # 方式 A：你自己在本机跑（token 不经过任何人）
   gh secret set CLOUDFLARE_API_TOKEN  --repo pan-nie/TsinghuaSurvive
   gh secret set CLOUDFLARE_ACCOUNT_ID --repo pan-nie/TsinghuaSurvive --body 67e59aecb10a2a8b4b4d525ff8ddcb56
   # 方式 B：网页 Settings → Secrets and variables → Actions → New repository secret（填两次）
   ```
5. 验证：
   ```bash
   gh workflow run deploy.yml --repo pan-nie/TsinghuaSurvive && gh run watch
   ```
   日志里「检查部署凭证」应为 `ready=true`，末尾应出现 `thu.whizzzest.com (custom domain)` 与「线上冒烟检查」通过。

> **暂时不想建 token**：建议先删掉旧的，让 main 走正常的「缺少 token → 只构建不部署」路径，而不是红一次：
> `gh secret delete CLOUDFLARE_API_TOKEN --repo pan-nie/TsinghuaSurvive`

## ③ auth 中转的两个 Secret —— 让后台能用 GitHub 一键登录（约 2 分钟）

**为什么**：`auth.thu.whizzzest.com` 的 Worker、域名、证书、白名单**都已就绪**，
只差 OAuth App 的两个值（旧 Cloudflare 账号里那份读不出来）。**在写完之前，后台请用「令牌登录」。**

1. 打开 <https://github.com/settings/developers> → **OAuth Apps** → 选中给本站用的那个
2. 改两个字段（**callback 必须一字不差**）：
   - Homepage URL：`https://thu.whizzzest.com/`
   - Authorization callback URL：`https://auth.thu.whizzzest.com/callback`
   - **Update application**
3. 复制 **Client ID**；再点 **Generate a new client secret** 拿到 **Client secret**
4. 写入 Worker Secret（二选一）：
   ```bash
   # 自己跑（推荐，值不经过别人）
   cd auth-worker
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   # 或把两个值给我，我替你写（Client secret 属敏感值，你自己跑更稳）
   ```
   > 不用重新 deploy：Secret 在运行时注入，Worker 已经在跑。
5. 验证：
   ```bash
   # 期望 302 到 github.com/login/oauth/authorize（不再是 MISCONFIGURED_CLIENT）
   curl -sI "https://auth.thu.whizzzest.com/auth?provider=github&site_id=thu.whizzzest.com" | head -3
   ```
   然后浏览器打开 <https://thu.whizzzest.com/admin/> → **Sign in with GitHub** → 应能回到后台。

> 小知识：本机 `curl` 可能解析不到 `auth.thu.whizzzest.com`（校园网对新建记录有否定缓存，
> 约 30 分钟过期）。用 DoH 能立刻确认记录存在：
> `curl -s "https://dns.alidns.com/resolve?name=auth.thu.whizzzest.com&type=A"`

## ④ 旧域名的 301 跳转（约 3 分钟）

**为什么**：旧域名 `tsinghua.nathanpenny.fun` 现在还是 200（两站并行 = 回滚窗口）。
加 301 能把已收录的链接与分享出去的地址引到新站。⚠️ **域名一到期跳转就失效**（你选择不续费）。

> 前提：这一步要在**旧账号**里做（拥有 `nathanpenny.fun` 的是另一个 Cloudflare 登录，当前会话看不到它）。
> 你登录旧账号后告诉我，我可以试着用 API 加；也可以你直接点（下面是点法）。

1. 登录旧账号 → 选中 zone **`nathanpenny.fun`** → **Rules → Redirect Rules → Create rule**
2. **规则 1（主站，必做）**

   | 字段 | 填什么 |
   |---|---|
   | Rule name | `迁移到 thu.whizzzest.com` |
   | When incoming requests match | Custom filter expression：`(http.host eq "tsinghua.nathanpenny.fun")` |
   | Then → Type | Dynamic redirect |
   | Expression | `concat("https://thu.whizzzest.com", http.request.uri.path)` |
   | Status code | `301` |
   | Preserve query string | ✅ |

3. **规则 2（旧媒体直链，建议做，避免老内容里的图片失效）**
   匹配 `(http.host eq "media.nathanpenny.fun")` → `concat("https://thu.whizzzest.com/media", http.request.uri.path)`，301
4. 验证：
   ```bash
   curl -sI https://tsinghua.nathanpenny.fun/start/how-to-use/ | head -3
   # 期望：HTTP/2 301，Location: https://thu.whizzzest.com/start/how-to-use/
   ```

## ⑤ 开启 Always Use HTTPS（约 30 秒）

**为什么**：冒烟检查发现 `http://thu.whizzzest.com/` 返回 **200**（明文可直接访问）。
canonical 已经是 https，所以开着更干净，也避免 http/https 各被抓一次。

1. 打开 zone **`whizzzest.com`** → **SSL/TLS → Edge Certificates** → **Always Use HTTPS** = **On**
2. 验证：`curl -sI http://thu.whizzzest.com/ | head -3` → 期望 301 到 https

> ⚠️ 这是**区域级**设置，会一并影响该 zone 下其它站点（你原有 8 个自定义域名：whizzzest / www / admin /
> game / im / merchant / writer / nmail）。通常它们也想要，但你知道就好。
> 同一页面的 **HSTS** 建议先别开：一旦开启，浏览器会记住「只能 https」，回退成本高。

---

## 全部完成后的收尾（我来做）

1. 合并草稿 PR **#6**（①②③ 做完再合；合并会触发 main 部署 + 线上冒烟）
2. 观察 1–2 周后删旧账号资源（主/预览 Worker、旧 R2 桶），把 `MIGRATION.md` 的事实并进 `HANDOVER.md`
3. 顺手看一眼 GitHub 默认分支的 3 个依赖漏洞（2 high / 1 moderate，与本次迁移无关）

## 与本次迁移无关、但值得知道的两条

- **额度共享**：新账号下有 9 个自定义域名在跑，Workers 免费档 100k 请求/天 与 AI 10k Neurons/天 是**账号级共享**的。
  问答的日闸门现在是 200 次/天（`src/data/ai.config.yml` 的 `limits.daily_answers`），如果问答量起来要下调。
- **媒体请求计入 Worker 请求**：`/media/*` 由主 Worker 读 R2，靠一年期不可变缓存让浏览器只取一次。

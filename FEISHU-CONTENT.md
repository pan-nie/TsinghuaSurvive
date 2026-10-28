# 在飞书维护内容

[总导航与编辑说明](https://my.feishu.cn/docx/S2FVdp173oWkY4x0v2dcKCcIn0f) · [原栏目文件夹](https://my.feishu.cn/drive/folder/HgRZffnUjlF0End3geYclLCznWG) · [同步运行](https://github.com/pan-nie/TsinghuaSurvive/actions/workflows/deploy.yml)

最后更新：2026-10-28（本次按仓库实现复核维护说明）。

79 篇内容页面已迁到飞书的 14 个原栏目。飞书是正文、标题和文章元信息的编辑来源；网站继续使用 `site.config.json` 中的原域名和固定页面路径。

## 日常编辑

1. 从总导航打开文章。在“正文”和“迁移信息”之间编辑；不要删除这两个分界标题。
2. 飞书标题决定页面标题。“文档信息”表格可修改作者、适用阶段、标签、摘要、内容状态、人工核对日期、导航名称与顺序。人工核对日期只填实际复核日期。
3. 保留 `【网站组件：…】` 标记，它在网站中还原问答、选课工作台、学分表、课程筛选等互动工具。代码、互动工具和课程索引数据仍由仓库维护。
4. 飞书自动保存后，GitHub Actions 每小时第 7、22、37、52 分钟检查变化。GitHub 调度可能延迟；需要立即发布可在同步运行页选择 **Run workflow**。
5. 通过检查后自动发布到原网站。`/admin/` 与文章的“编辑此页”均通向飞书。失败时线上保留上一版，在 Actions 中查看错误。

支持文字、标题、普通表格、列表、待办、引用、代码、普通超链接。指向已迁文章的飞书链接会转换成原网站路径；旧章节链接也保留。读者的清单勾选存于各自浏览器，不修改共享文档。

图片、附件、画板和嵌入的电子表格尚未接入发布，遇到这些资源会停止同步，避免丢失。新增文章、调整栏目或变更网址需要维护者先更新映射；普通内容修改无需打开代码仓库。

## 内容与代码的维护边界

| 修改对象 | 维护位置 |
| --- | --- |
| 正文、标题、作者、标签、摘要、状态、人工核对日期 | 飞书文档与「文档信息」表格 |
| 学分计算、选课工作台、课程筛选、问答交互 | `src/components/` 中的 Astro / JavaScript / TypeScript；后端问答在 `src/worker/` |
| 待办保存、链接搜索、首页与目录展示 | `FeishuChecklist.astro`、`FeishuLinkSearch.astro`、`src/utils/feishu-directory.mjs` 等 |
| 新增文章、固定路径、栏目、组件接入 | `src/data/feishu-manifest.json`、`astro.config.mjs`、`FeishuSlots.astro` 与同步转换规则 |
| 课程筛选数据 | `scripts/build-course-index.mjs` 生成 `src/data/course-index.json`；已迁飞书的书目与正文表格需要另行核对 |
| 同步、校验、部署 | `scripts/sync-feishu.mjs`、`scripts/feishu/`、`.github/workflows/deploy.yml` |

飞书的 `【网站组件：…】` 是网站组件插入标记，代码块只是展示文字，不会执行其中的 JavaScript。飞书清单和网站个人勾选互不修改；网站按文档 URL 与项序号保存进度，重排待办后应检查旧进度是否错位。

普通飞书修改不经过 GitHub PR，自动检查也不代替人工核实事实。代码修改仍需本地检查与 PR 审阅，合并 `main` 后自动发布；当前没有独立的 PR 检查或预览工作流。旧 Sveltia CMS 的 OAuth、媒体库与 `public/admin/config.yml` 保留作历史配置，不是当前写作入口。`check:admin` 现在检查飞书映射与编辑入口。

## 同步与恢复

`src/data/feishu-manifest.json` 保存固定栏目、网址和文档 ID；`scripts/sync-feishu.mjs` 使用官方飞书 CLI 的应用身份只读拉取内容。先批量读修改时间，只重新读取变化文档；全量转换、表格与待办结构比对通过后才替换本次构建副本。页面内容、搜索、AI 索引与 RSS 在同一次构建中更新。

CI 需要仓库变量 `FEISHU_APP_ID` 和加密 Secret `FEISHU_APP_SECRET`。不使用个人 OAuth 刷新令牌。应用凭证只通过 stdin 传入 CLI，不写进仓库或日志。飞书文档权限不因迁移而改为公开。

缓存仅包含已迁内容的 XML、标题、修改时间与版本，不包含评论、参考资源旁路数据或凭证。只有成功部署并验证线上 `content-version.json` 后才记录已发布版本；失败后下一次运行会继续尝试，不会把失败版本当作已上线。

```sh
npm ci
npm run sync:feishu       # 需要本机已配置官方 lark-cli；默认应用身份
npm run check:feishu
npm run verify
npm run dev             # 开发预览；构建后的预览可用 npm run preview
```

`npm run verify` 不会主动同步飞书，也不包含 `check:feishu`，上面的两项检查需要分别运行。`npm run deploy` / `deploy:dry` 同样不会主动同步；本地手动发布前先拉取最新正文并检查，避免发布仓库中的旧副本。

CI 只在本次构建副本中更新正文，不会自动提交回 GitHub；因此 GitHub 的文章副本、更新日志和提交统计不代表完整的飞书编辑记录。

离线复核已有缓存可用 `node scripts/sync-feishu.mjs --cached`。`src/content/docs/` 中迁移后的 Markdown、`feishu-custom.json`、`feishu-state.json` 和 `public/content-version.json` 是生成副本，不应作为日常编辑源。

原始文档与旧编辑器保留在 Git 历史；迁移前本地完整副本、逐篇回读报告和断点记录在 `.review/feishu-migration/`（不提交）。如需回退，先暂停 deploy workflow 的定时同步，再回退到迁移前版本，防止下一次运行覆盖回退结果。原域名、Worker、R2、AI 和限流绑定均沿用原配置。

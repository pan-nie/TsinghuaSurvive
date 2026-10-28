# 飞书独立文档库与保留工具

> **当前状态（2026-10-28）**：网站已恢复仓库维护、推送发布。飞书文档继续保留并可独立编辑，两个平台不再自动同步。本文回答飞书资源在哪、保留了什么工具及如何安全导出；网站日常维护见 [README.md](./README.md)。

[飞书总导航](https://my.feishu.cn/docx/S2FVdp173oWkY4x0v2dcKCcIn0f) · [原栏目文件夹](https://my.feishu.cn/drive/folder/HgRZffnUjlF0End3geYclLCznWG)

## 日常使用

- 飞书的 79 篇文档、14 个栏目、正文、访问权限和已有链接均保留。本次回退未修改云端文档。
- 以后可直接在飞书写作，修改不会影响网站。云端原有说明中提到的“网站自动同步”已不再适用。
- 网站文章、页面信息、链接目录与课程索引以仓库文件为准。修改仓库 → 本地检查 → 提交 / PR → 推送 `main` 后自动构建发布。
- `/admin/` 已恢复 Sveltia CMS；`/admin/ai/` 继续用于 AI 运行配置。正式发布不安装飞书 CLI、不读取飞书凭证，也没有定时同步。

## 保留的代码与资料

| 位置 | 用途与当前状态 |
| --- | --- |
| `scripts/sync-feishu.mjs` | 应用身份只读拉取与格式转换；现在仅导出到 `.review/` 的子目录 |
| `scripts/feishu/` | 转换、测试、原迁移和 CI 身份配置代码；历史迁移脚本会写云端，不作为日常命令运行 |
| `scripts/check-feishu-config.mjs` | 检查独立导出的结构与来源，不检查正式网站的 CMS |
| `scripts/check-feishu-live.mjs` | 为未来飞书预览站保留；须显式提供 `--base` 与 `--state`，不参与正式发布 |
| `src/components/Feishu*.astro`、`MarkdownContent.astro`、`src/utils/feishu-directory.mjs` | 原飞书展示组件与适配规则，保留但未接入正式站点 |
| `src/data/feishu-manifest.json` | 保留文章、固定网址、栏目、文档 ID 和组件映射 |
| `src/data/feishu-custom.json`、`feishu-state.json` | 原迁移生成快照；不再是正式页面的数据源 |
| [自动同步历史说明](./docs/feishu/AUTOMATIC-SYNC-HISTORY.md) | 原自动同步流程、支持范围与恢复设计的完整记录 |
| `docs/feishu/maintenance-index.html` | 旧飞书维护导航页源码存档，不作为网站入口发布 |
| `docs/feishu/last-published-content-version.json` | 原内容版本快照，不再发布到 `/content-version.json` |

飞书所需依赖仍保留。`npm run check:admin` 只检查恢复后的 Sveltia CMS，不会因为存在飞书映射而切换行为。

## 可选：只读导出飞书

只想在飞书写作无需运行这些命令。需要本地备份、研究转换逻辑时，可在仓库根目录运行：

```sh
npm run check:feishu
npm run sync:feishu
node scripts/check-feishu-config.mjs
```

联网导出需要本机配置官方 `lark-cli`，默认使用已有应用身份；本流程不自动创建或修改云端文档，不写个人令牌。默认输出为 `.review/feishu-export/`，其中包括转换后的文章、两个自定义页数据和版本记录。此目录已被 Git 忽略，不进入正常构建。

```sh
# 使用已有完整缓存，无需联网或配置飞书身份
node scripts/sync-feishu.mjs --cached

# 另存一份导出；目录必须位于本仓库 .review/ 下
node scripts/sync-feishu.mjs --output .review/feishu-export-copy
node scripts/check-feishu-config.mjs --output .review/feishu-export-copy
```

脚本拒绝将输出指向仓库根、`src/`、`public/` 或包含符号链接的输出路径；不会删除恢复后的 MDX，也不会覆写网站主稿。导出保留了原来的文档格式要求：分界标题、元信息表格、必要组件标记和支持的资源类型。若在飞书自由重组这些结构，可能需要先调整转换规则才能再次导出；不影响网站发布，也不影响你在飞书阅读或编辑。

当前导出是内容与数据快照，不是可直接运行的第二套网站。以后若要重新接通，需单独处理页面组件、生成目录、发布流程、资源支持与回归检查。

## 本次恢复记录

- 网站恢复基线：`227bdc6`；回退前提交：`e62ae56`。
- 可恢复版本标记：`codex/before-git-restore-2026-10-28`，包含原飞书站点实现与映射。
- 回退前已只读核对全部 79 篇飞书文档。快照与原始仓库归档保存在本地 `.review/restore-git-2026-10-28/`，不提交缓存或凭证。
- 与原仓库飞书副本相比，仅《如何使用本站》多出自动同步维护说明；恢复网站时采用原 Git 主稿，不继续展示已失效的同步说明。
- 域名、Worker、R2、AI 与限流配置沿用；飞书云端文档、目录和权限未变。

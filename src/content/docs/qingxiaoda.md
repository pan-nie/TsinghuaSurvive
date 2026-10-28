---
title: 清小搭：学校自己的 AI 助手
description: 清小搭是什么、谁现在能用、怎么开始用，以及想自己搭一个智能体时该从哪下手——本站只做介绍与跳转，不代它提供入口。
stage:
  - 全阶段
tags:
  - AI
  - 工具
  - 校内平台
authors:
  - Nathan Penny
status: stable
reviewedAt: 2026-10-06
summary: 清小搭的定位、使用入口、智能体搭建的三条路径与最小接入契约，外加官方文档索引。
sidebar: {}
editUrl: https://my.feishu.cn/docx/KGxUdJko3ofCRvxnNnOcxvNpngf
lastUpdated: 2026-10-28T10:11:23.000Z
feishu:
  url: https://my.feishu.cn/docx/KGxUdJko3ofCRvxnNnOcxvNpngf
  revision: 3
---

<b>先说清楚这一页是什么</b>：清小搭是<b>清华大学自己的</b> AI 助手，不是本站的功能。 本站不代它提供入口、不调它的接口，只负责讲清楚它是干什么的、什么时候该用它、 想自己搭智能体该看哪份文档 —— <b>剩下的你自己点过去</b>。

它和[站内问答](/ask/)是两件事，分工见下面那张表。

## 它是什么

一句话：<b>清小搭是学校官方的学生 AI 助手</b>，问答的根据是学校自己的知识库，不是网上搜来的东西。

-   <b>2024 年 8 月 14 日上线</b>，也就是 2024 级本科新生开学第一天，最早以微信小程序的形式提供 24 小时在线服务。
-   用学校的话说，它依托<b>清华自研的大模型和知识增强生成技术</b>，做的是「智能问答 + 智能伴学」。
-   技术文档站的说法是：底座是清华团队自研的<b>千亿参数大模型</b>，算法服务基于 [UltraRAG](https://github.com/OpenBMB/UltraRAG) 框架，实现了知识库问答、智能摘录、工具调用和智能体等功能。
-   <b>个人隐私敏感数据由学校信息办数据中台建设、存储和管理</b>，学校官方的说法是师生信息「不出校」。这一点和本站无关，但你如果在意数据流向，这是官方给的承诺。

### 官方列出的能力

<table><colgroup><col><col></colgroup><thead><tr><th><p>能力</p></th><th><p>具体是什么</p></th></tr></thead><tbody><tr><td><p>大模型智能问答</p></td><td><p>校园生活、课程学习、入学手续这类问题；相当于「清华百事通」</p></td></tr><tr><td><p>智能伴学工具箱</p></td><td><p>文档解读、数据分析、PPT 辅助制作、学业智能提醒、课程答疑资源匹配、智慧日历</p></td></tr><tr><td><p>个人成长云盘</p></td><td><p>记录学习成果与成长轨迹，结合清华云盘做成个人成长档案</p></td></tr><tr><td><p>学业志趣自测</p></td><td><p>填一份问卷，从六个维度给选课建议</p></td></tr><tr><td><p>智能体广场</p></td><td><p>别人搭好的各种智能体，直接拿来用；也是你想自己搭东西的地方</p></td></tr><tr><td><p>具体功能的更新</p></td><td><p>例如「模拟卷助手」（2026-06 上线，覆盖 11 门课程）、图书馆座位预约快捷入口（2026-06 上线）</p></td></tr></tbody></table>

来源分开看：智能问答、智能伴学工具箱、个人成长云盘、智能体广场四项来自 [学生学习与发展指导中心页面](https://learning.tsinghua.edu.cn/xxyfzxm/aitown/qxd.htm)； 「学业志趣自测」来自[清华官网的上线报道](https://www.tsinghua.edu.cn/info/1176/114345.htm)； 最后一行来自[官方动态页](https://www.xiaoda.tsinghua.edu.cn/news)的更新记录。

> 规模数字的口径很乱，别当成一个数
>
> 不同来源、不同时间的数字对不上，这里照实列，<b>不要把它们当成同一个口径</b>：

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>时间</p></th><th><p>数字</p></th><th><p>来源</p></th></tr></thead><tbody><tr><td><p>2024-09-20</p></td><td><p>注册 2893 人，提问 4.1 万个，准确率 90% 以上</p></td><td><p>清华官网新闻</p></td></tr><tr><td><p>2026-04-10</p></td><td><p>440 门课程 AI 赋能、构建 <b>415 个</b>「清小搭」智能体</p></td><td><p>教育部发布会（校长李路明介绍）</p></td></tr><tr><td><p>2026-05-26</p></td><td><p>注册用户 <b>2.4 万人</b>，累计提问超 <b>72 万条</b>，准确率 98% 以上</p></td><td><p>教育部新闻办推介</p></td></tr><tr><td><p>2026-07-29</p></td><td><p>知识库 <b>5.8 万余份</b>文档，智能体 <b>400 余个</b></p></td><td><p>第三方公众号拆解</p></td></tr></tbody></table>

「智能体数量」尤其容易混：有 400+ 的口径，也有 415 个的口径，还有 2025 年首届大赛时 「44 个院系部处搭建的 100 余个智能体」这种<b>校内自建</b>的口径。看数字先看它是哪一年、谁统计的。

## 你现在能用吗

<b>这是最容易过时、也最该自己确认的一件事。</b>

-   [学生学习与发展指导中心的页面](https://learning.tsinghua.edu.cn/xxyfzxm/aitown/qxd.htm)至今写着 「<b>目前处于试运行阶段，仅面向 2024 级本科生开放</b>」。
-   清小搭站内的《用户协议》也把服务对象写成「<b>清华大学 2024 级本科新生或被清华大学允许的试用或测试用户</b>」， 并写明账号<b>仅限本人使用、在清华就学期间享有使用权</b>，不得转让、借用、售卖或授权给第三方。
-   但官方动态页显示：2026 年 4 月起清小搭<b>面向全体教职工开放</b>（小程序 + Web 双端，中英双语）； 2026 年 5 月面向国际学生的版本进入试运行，当时说「预计秋季学期正式上线」。

也就是说，<b>文本上它还写着限定范围，实际上早就扩到了教职工和国际学生</b>。 别拿任何页面的「仅面向 XX 开放」当准——包括这一页。最可靠的办法是直接去登录一次。

## 怎么开始用

<table><colgroup><col><col></colgroup><thead><tr><th><p>入口</p></th><th><p>地址 / 怎么找</p></th></tr></thead><tbody><tr><td><p>网页版</p></td><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/">www.xiaoda.tsinghua.edu.cn</a></p></td></tr><tr><td><p>智能体广场（需登录）</p></td><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/login?redirect=/square">xiaoda.tsinghua.edu.cn/login?redirect=/square</a></p></td></tr><tr><td><p>微信小程序</p></td><td><p>微信里搜「清华大学学生成长助手清小搭」，或搜「清小搭」</p></td></tr><tr><td><p>Pro 桌面端</p></td><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/">官网首页</a>提供 macOS（Apple 芯片 / Intel 通用）与 Windows 10/11 下载</p></td></tr><tr><td><p>官方 CLI（终端 / IDE）</p></td><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/cli">xiaoda.tsinghua.edu.cn/cli</a> —— 在终端和主流 AI 编程工具里调用清小搭</p></td></tr><tr><td><p>官方动态</p></td><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/news">www.xiaoda.tsinghua.edu.cn/news</a></p></td></tr></tbody></table>

<b>登录用的是清华统一身份认证</b>，也就是说它面向的是清华在校师生，不是你转发给校外朋友就能用的东西。 登录方式、反馈邮箱这类操作细节，[云上清华](/campus/cloud-services/)的「1911 星球与清小搭」一节写得更细，这里不重复。

> 本站不代它提供入口，也不代它转发
>
> 这一页只放链接，<b>不做嵌入、不做转发、不做代登录、不代调接口</b>。不是懒，是三重原因叠在一起：
>
> 1.  <b>平台自己的规则不允许。</b> 清小搭站内《用户协议》4.3 条明确禁止： 「反向工程、反向汇编、编译或者以其他方式获取本服务的源代码或基础数据」、 「以批量注册账号、外挂、插件、<b>爬虫</b>、作弊等方式影响本服务正常经营秩序」、 「<b>未经我们同意，将本服务用于商业目的</b>，无论您是否从该等行为中获得收益」。 4.4 条还禁止去除生成内容里的<b>水印、标志、技术指纹</b>。
> 2.  <b>登录态是你个人的身份。</b> 协议 3.3 条写明账号<b>仅限本人使用</b>， 不得转让、赠与、借用、售卖、授权或租用给第三方。把它放进一个对外公开的站点， 等于把你的清华身份借给所有访客用。
> 3.  <b>它的内容归学校。</b> 本站是学生自己写的经验站，没资格也没必要替学校做入口。
>
> <b>所以「把清小搭接到第三方网站上」这条路，本站不走，也不推荐。</b> 想用就自己点过去，这是这一页唯一的使用方式。

> 官方确实有编程接口，但它是给你本人用的
>
> 清小搭官方提供了 <b>CLI</b>（[xiaoda.tsinghua.edu.cn/cli](https://www.xiaoda.tsinghua.edu.cn/cli)）， 可以在终端和主流 AI 编程工具里调用它，这是最接近「API」的官方形态。
>
> 但注意两点：<b>它的授权绑定你自己的账号</b>（协议 3.3 条：账号仅限本人使用）； 协议 4.3 条又明文禁止把服务转给第三方或用于商业目的。 所以它是<b>个人效率工具</b>，不是「给你的网站做后端」的通道 —— 这两件事差得很远。

## 它和站内问答的分工

两边都是「问一句答一段」，但<b>依据完全不同，用错地方会拿到错的答案</b>。

<table><colgroup><col><col><col></colgroup><thead><tr><th><p></p></th><th><p><a href="/ask/">站内问答</a>（本站）</p></th><th><p>清小搭（学校）</p></th></tr></thead><tbody><tr><td><p>谁做的</p></td><td><p>本站维护者</p></td><td><p>清华大学</p></td></tr><tr><td><p>依据什么</p></td><td><p>站内 60 多篇经验帖</p></td><td><p>学校知识库（官方文档、常用域名、校内公众号）</p></td></tr><tr><td><p>答的是</p></td><td><p>学长学姐踩过的坑</p></td><td><p>学校的官方口径与事务办理</p></td></tr><tr><td><p>站里没写的</p></td><td><p>直接拒答，不编</p></td><td><p>不适用（它答的是学校的事）</p></td></tr><tr><td><p>给出处吗</p></td><td><p>每句标到具体文章与章节</p></td><td><p>不标到本站</p></td></tr><tr><td><p>入口</p></td><td><p>就在本站</p></td><td><p>要登录，自己过去</p></td></tr></tbody></table>

<b>简单说：想知道「规定是什么、手续去哪办」，去清小搭；想知道「实际会踩什么坑、别人怎么过来的」，留在本站。</b> 两边的结论冲突时，<b>以学校官方为准</b>——这也是本站[免责声明](/start/disclaimer/)里的原则。

> 清小搭也是 AI，别把它当红头文件
>
> 它的回答同样是模型生成的。本站整理[清小搭问答精选](/guides/frequent-questions/)时就发现， 不少条目<b>没有日期、年份混杂</b>，制度细节也没法逐条对上官方文件。
>
> 所以它是一条<b>比网上搜索靠谱得多的线索</b>，但不是依据：办事、交材料之前， 仍以<b>官方通知、院系口径和现场公示</b>为准。这一点和本站问答是同一种诚实——<b>都别当文件用</b>。

## 站内已有的清小搭内容

清小搭在本站不是新面孔，下面这些页面已经在用它，<b>别重复找</b>：

<table><colgroup><col><col></colgroup><thead><tr><th><p>页面</p></th><th><p>那里有什么</p></th></tr></thead><tbody><tr><td><p><a href="/guides/frequent-questions/">常见问题速查：清小搭问答精选</a></p></td><td><p>把清小搭导出的 197 条常见问答筛成约 90 条「一句一答」。办事前扫一眼最实用，但<b>整页标注为待核对</b></p></td></tr><tr><td><p><a href="/campus/cloud-services/">云上清华</a> §1911 星球与清小搭</p></td><td><p>登录方式（统一身份认证）与反馈邮箱</p></td></tr><tr><td><p><a href="/freshman/arrival-checklist/">报到第一周清单</a>、<a href="/freshman/military-training/">军训</a></p></td><td><p>2026 年新生入学教育安排的日期，来源是清小搭的通知汇总</p></td></tr></tbody></table>

## 想自己搭一个智能体

以上是给使用者的。下面这段给<b>想自己动手搭智能体</b>的同学——比如参加[清华大学人工智能创新大赛](https://www.xiaoda.tsinghua.edu.cn/m/competition)， 或者只是想在智能体广场放一个自己的东西。

大赛<b>每年一届</b>（2026 年那届的赛期是 6 月至 9 月，报名 7 月底截止），具体时间以官方通知为准； 非赛期也照样可以自己搭了上架，不必等比赛。

### 三条路，按投入从低到高

1.  <b>在平台上直接搭。</b> 用清小搭内置的智能体共创平台（BISHENG 是清小搭侧用于智能体构建和配置的平台）， 或者用扣子（Coze）、扣子开源版（产品界面里叫 <b>Coze Studio</b>，大赛 FAQ 里写作「OpenCoze」）、 智谱清言等外部平台搭好，再通过「平台接入」同步到清小搭。智谱清言支持 OAuth 与 API Key 两种授权方式。 <em>代价</em>：官方 FAQ 明确提醒，第三方平台会持续更新，平台<b>无法保证所有 Coze 接口模式和版本都兼容</b>， 对话流模式、OAuth 未授权插件是常见的坑。
2.  <b>上传 Skill 技能包。</b> 打包成标准 ZIP 上传，让别的智能体调用你的技能。 官方要求：README 里写清<b>运行环境、依赖项、版本和配置方法</b>；关键依赖要给替代方案或异常提示； 遵循权限最小化和数据最小化；依赖来源要清晰、稳定、合法合规。
3.  <b>自己写代码，按 OpenAI 兼容标准协议接入。</b> 最通用，也最可控。下面是它的契约。

### 第 3 条路：最小接入契约

核心思路一句话：<b>把你的服务写成一个「长得像 OpenAI」的 HTTP 服务，网关由清小搭提供，你不用管。</b> 官方接入指南的原话是「你不需要实现平台网关的任何东西」。

必须实现两个端点：

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>端点</p></th><th><p>必须</p></th><th><p>用途</p></th></tr></thead><tbody><tr><td><p><code>POST {baseUrl}/chat/completions</code></p></td><td><p>✅ 必须</p></td><td><p>对话（流式 SSE + 非流式 JSON 都要）</p></td></tr><tr><td><p><code>GET {baseUrl}/models</code></p></td><td><p>🟡 强烈建议</p></td><td><p>连通性与凭证校验（不实现也行，平台会用最小对话兜底）</p></td></tr></tbody></table>

硬性要求（任何一条不满足，平台的探测就不通过）：

1.  HTTP/HTTPS，`Content-Type: application/json`；流式响应用 `text/event-stream`。
2.  支持 `Authorization: Bearer <credential>` 鉴权（或 `x-api-key` / 自定义请求头）；<b>无效凭证返回 </b> <b><code>401</code></b>。
3.  请求与响应都按 OpenAI 风格（`messages` / `choices` 那一套）。
4.  `stream: true` 时返回 SSE，<b>以 </b> <b><code>data: [DONE]</code></b> <b> 结尾</b>。
5.  `finish_reason` 只用官方那五个值之一。
6.  返回 `usage`（token 用量）字段，统计不了就填 `0`。

> `baseUrl` 填到哪个位置
>
> 填到<b>版本段为止</b>，例如 `https://your.host/v1`。网关会自己拼 `baseUrl + /chat/completions`， <b>不做 </b> <b><code>/v1</code></b> <b> 去重</b> —— 所以你多写或少写一个 `/v1`，探测都会失败。

进阶可选能力（不影响纯文本对话接入）：音频输入 `input_audio`、文件输入 `file`（pdf/word 等）、 文件产物输出 `x_soda.attachments`（返回 PDF/PPT/Word）。

### 上架流程：四步

1.  <b>平台信息</b> —— 选「标准协议接入」，填 API 地址与 API 密钥；需要自定义鉴权头时展开高级配置。
2.  <b>测试验证</b> —— 平台自动探测 `/models` 与 `/chat/completions`，给出四项检查结果；通过后可以直接试聊。
3.  <b>完善信息</b> —— 头像、智能体名称、描述、开场白、上架分类、引导问题。
4.  <b>审核上线</b> —— 提交审核，通过后上架智能体广场。

<b>第二步出红叉怎么排查</b>：`凭证校验` 对应密钥或鉴权方式；`发起最小对话` 对应 `/chat/completions`； `校验响应格式` 对应响应结构不像 OpenAI。对着上面那六条硬性要求逐条核对，通常就在里面。

### 一条不能碰的红线

官方 FAQ 写得很明确：<b>不统一开放课程表、借阅记录等涉及个人隐私或校内敏感信息的数据接口</b>， 也<b>不得通过绕过权限的方式访问校内私有数据</b>。作品需要数据能力时，只能用公开数据、 已获授权的数据、安全可访问的外部数据库或 MCP 服务，并做好脱敏与最小化采集。

> 本站的态度
>
> 「绕开权限拿校内数据」这件事，本站不写教程、不提供思路、不链接任何相关工具。 这不是技术问题，是会不会出事的问题。

## 官方文档与参考链接

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>链接</p></th><th><p>讲什么</p></th><th><p>适合谁</p></th></tr></thead><tbody><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/">清小搭官网</a></p></td><td><p>入口、Pro 桌面端下载</p></td><td><p>想用的人</p></td></tr><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/news">官方动态</a></p></td><td><p>功能更新、活动、外部报道汇总</p></td><td><p>所有人</p></td></tr><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/login?redirect=/square">智能体广场</a></p></td><td><p>找别人搭好的智能体</p></td><td><p>使用者</p></td></tr><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/qingxiaoda/openai-compatible-agent-integration-guide.md">自研 Agent 接入指南（官方）</a></p></td><td><p>标准协议接入的完整契约、探测规则、音频/文件能力</p></td><td><p>要写代码接入的人</p></td></tr><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/qingxiaoda/skills/INSTALL_GUIDE.md">SkillHub 安装指导手册（官方）</a></p></td><td><p>技能包的目录结构（<code>SKILL.md</code>）与三种安装方式</p></td><td><p>要打包或安装 Skill 的人</p></td></tr><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/qingxiaoda/community/SKILL.md">智能体社区接入指南（官方）</a></p></td><td><p>让 AI 编程工具接入清小搭社区的规则（默认只读、发言主体边界）</p></td><td><p>用 Claude Code / Cursor 这类工具的人</p></td></tr><tr><td><p><a href="https://qingxiaoda.github.io/docs/index.html">清小搭技术团队文档站</a></p></td><td><p><b>算法原理</b>：知识问答、检索模型、智能摘录、评测框架</p></td><td><p>想懂它背后怎么做的</p></td></tr><tr><td><p>↳ <a href="https://qingxiaoda.github.io/docs/arch/rag.html">知识问答（RAG）</a></p></td><td><p>检索增强生成的流程</p></td><td><p>同上</p></td></tr><tr><td><p>↳ <a href="https://qingxiaoda.github.io/docs/arch/embedding.html">检索模型</a></p></td><td><p>检索用的向量模型</p></td><td><p>同上</p></td></tr><tr><td><p>↳ <a href="https://qingxiaoda.github.io/docs/arch/webnote.html">智能摘录</a></p></td><td><p>网页/文档摘录能力</p></td><td><p>同上</p></td></tr><tr><td><p>↳ <a href="https://qingxiaoda.github.io/docs/arch/rag_eval.html">评测框架</a></p></td><td><p>怎么评的准确率</p></td><td><p>同上</p></td></tr><tr><td><p>↳ <a href="https://qingxiaoda.github.io/docs/papers.html">学术论文</a> · <a href="https://qingxiaoda.github.io/docs/projects.html">开源项目</a></p></td><td><p>团队论文与开源</p></td><td><p>同上</p></td></tr><tr><td><p><a href="https://www.tsinghua.edu.cn/info/1176/114345.htm">清华官网新闻：清小搭上线</a></p></td><td><p>2024 年上线时的官方报道与早期数据</p></td><td><p>想了解来龙去脉的</p></td></tr><tr><td><p><a href="https://learning.tsinghua.edu.cn/xxyfzxm/aitown/qxd.htm">学生学习与发展指导中心 · 清小搭</a></p></td><td><p>服务内容与使用方式（<b>开放范围那句偏旧，见上文</b>）</p></td><td><p>使用者</p></td></tr><tr><td><p><a href="https://www.xiaoda.tsinghua.edu.cn/m/competition">人工智能创新大赛</a></p></td><td><p>赛事信息、三类接入途径</p></td><td><p>想参赛的</p></td></tr><tr><td><p><a href="https://tsinghuanlp.feishu.cn/wiki/LWxAwQc4oie8rckp3g6ccapSnib">大赛常见问题（飞书）</a></p></td><td><p>接入途径、Skill 要求、数据红线、报销</p></td><td><p>想参赛/搭智能体的</p></td></tr></tbody></table>

> 两个容易误会的点
>
> -   <b>技术文档站不是「搭建教程」。</b>[qingxiaoda.github.io/docs](https://qingxiaoda.github.io/docs/index.html) 讲的是<b>算法</b>（检索、摘录、评测），不是「怎么点按钮搭一个智能体」。 要动手搭，看的是平台的「标准协议接入」向导和上面那份官方接入指南。
> -   <b>官方那几份指南都是 </b> <b><code>.md</code></b> <b> 文件，浏览器可能直接下载而不是打开。</b> 下载后用任意文本编辑器打开就行， 它们是纯 Markdown，没有排版也能读。

## 事实来源与时效

> 这一页会过时，而且会比本站别的页面过时得快
>
> 本页信息核对于 <b>2026-10-06</b>，来源是上面「参考链接」里列出的官方页面、官方技术文档站， 以及清小搭官方的开发者指南与大赛 FAQ。
>
> 清小搭在 2026 年一年里经历了「面向 2024 级本科生」→「面向全体教职工」→「面向国际学生试运行」 的多次范围变化，功能也在按月更新。<b>上面任何一个具体事实——尤其是开放范围、入口地址、 接入契约的字段要求——都可能已经变了。</b>
>
> 以你打开时官方页面上写的为准。如果发现这一页和官方对不上， <b>直接改</b>比什么都强 —— 流程见[怎么贡献一篇经验帖](/contribute/)。

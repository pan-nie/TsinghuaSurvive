---
title: 学生自建工具与脚本
description: 选课、成绩、网络学堂、洗衣机、云盘——学生和校友写的工具清单，每个都标了维护状态、支持平台和校内能不能打开。
stage:
  - 全阶段
  - 本科低年级
  - 本科高年级
tags:
  - 工具
  - 选课
  - 成绩
  - 网络
authors:
  - Nathan Penny
status: stable
summary: 第三方工具清单，带维护状态与校内可达性，以及使用它们的三条底线。
sidebar:
  order: 4
editUrl: https://my.feishu.cn/docx/IVQpdLuz5oY4wJxZbr6cVhR6nIb
lastUpdated: 2026-10-28T10:15:52.000Z
feishu:
  url: https://my.feishu.cn/docx/IVQpdLuz5oY4wJxZbr6cVhR6nIb
  revision: 4
---

学校系统解决“该做的事”，学生工具解决“做得顺不顺”。这一页把社区里仍在被人使用的工具收成一张表， 但<b>它和</b>[<b>校内常用链接</b>](/guides/links/)<b>不是一类东西</b>：

> 这一页不是推荐清单
>
> <b>收进来不等于推荐</b>，只表示“这个工具存在、有人在用、它大概解决什么问题”。 是否用它、值不值得把账号交给它，由你自己判断——下面每张卡上的状态与代价就是给你做判断用的。

<table><colgroup><col><col><col></colgroup><thead><tr><th><p></p></th><th><p>校内常用链接</p></th><th><p>这一页</p></th></tr></thead><tbody><tr><td><p>谁做的</p></td><td><p>学校官方</p></td><td><p>学生、校友、个人开发者</p></td></tr><tr><td><p>会怎么坏</p></td><td><p>域名迁移、入口改版</p></td><td><p><b>项目停更、作者毕业、接口变了</b></p></td></tr><tr><td><p>谁负责</p></td><td><p>学校</p></td><td><p>你自己判断</p></td></tr><tr><td><p>要交出去什么</p></td><td><p>你的账号（给学校）</p></td><td><p>你的账号（给一个陌生人写的程序）</p></td></tr></tbody></table>

所以每张卡都写三件事：<b>它是干什么的</b>、<b>上游项目还在不在维护</b>、<b>校园网里能不能打开</b>。

「维护状态」不是拍脑袋写的，取证据的顺序是：上游 thuservices 自己写的状态 → GitHub 仓库的 `archived` 与最近一次提交时间 → 查不到就写「未核实」。 两者冲突时（比如上游写“可用”、仓库其实已经归档）<b>以更保守的为准，并把冲突写在卡片上</b>。 核对日期（2026-10-03）显示在清单顶部 —— <b>它不是一个会自己保鲜的字段</b>，过期了就重跑一遍。

共 <b>24</b> 个工具 · 判为活跃 <b>8</b> 个 · 不活跃或已停止 <b>11</b> 个 · 状态未核实 <b>5</b> 个（用前自己看项目页）· 维护状态核对于 2026-10-03

## 选课与课表

-   [NextTHUxk（选课增强扩展）](https://github.com/smartThise/NextTHUxk)需代理仍在维护Chrome / Firefox 扩展在选课页面上叠一层工作台：按类型/学分/时间筛选全校课程、预选阶段估算中签概率、抽签阶段看课余量与候补排名、暂存多套课表方案。功能覆盖面最广，也最需要你自己核对它读走了什么。注意：第三方扩展能读到你的选课页面内容。装之前看清权限与来源，别在公共电脑上登录使用github.com来源：thuservices（thu.services）工具汇总
-   [选课冲突标记（油猴脚本）](https://greasyfork.org/en/scripts/408340-tsinghuacourseconflictmarker)未实测状态未核实油猴（Tampermonkey）脚本在选课操作界面把与已选课程时间冲突的候选课标红，鼠标悬停能看到和哪几门撞。选课季抢志愿时能省一点反复对照的工夫。注意：只支持整学期课：半学期课可能标出「假冲突」。开课信息页与选课查询页不生效，只在选课操作界面工作greasyfork.org来源：thuservices（thu.services）工具汇总
-   [选课剩余课容标记（油猴脚本）](https://greasyfork.org/en/scripts/456440-colorful-course)未实测仍在维护油猴脚本给课程的报名人数上色，一眼看出哪些课还有余量、哪些已经挤爆，帮助决定志愿排序。注意：状态依据是上游一句「脚本还在开发中」（greasyfork 在校园网内不可达，查不到更新日期）；功能会变，志愿顺序最终还是以你自己的培养方案为准greasyfork.org来源：thuservices（thu.services）工具汇总
-   [THUCourseHelper（课表 App）](https://github.com/Starrah/THUCourseHelper)需代理更新停滞Android安卓端的课程表工具，把选课结果变成一张能随时看的课表。github.com来源：thuservices（thu.services）工具汇总

## 成绩与学籍

-   [Tsinghua GPA Calculator（油猴脚本）](https://greasyfork.org/zh-CN/scripts/410960-tsinghua-gpa-calculator)未实测状态未核实油猴脚本在 INFO「全部成绩」页面直接算出全部 GPA 与必限 GPA，按新、旧两套算法分别给出，保留完整精度（官方入口只给三位有效数字）。注意：只能算已经录入系统并发布的成绩；没发布的成绩它读不到。算出来的数只用来自己心里有数，正式场合以教务处为准greasyfork.org来源：thuservices（thu.services）工具汇总
-   [清华成绩刮刮乐](https://github.com/summivox/thu-scratch)需代理更新停滞Chrome 插件 / 油猴脚本把 INFO 出成绩的页面盖住，点一下才显示一门 —— 一个纯粹的体验型小工具。github.com来源：thuservices（thu.services）工具汇总

## 网络学堂与 INFO

-   [THUInfo（移动端助手）](https://github.com/thu-info-community/thu-info-app)需代理仍在维护iOS / Android把网络学堂、校历、图书馆、教室信息等整合到一个 App 里，有 App Store 分发，是这类工具里维护最勤的一个（最近一次提交在 2026-09）。注意：要以你的账号登录第三方 App —— 介意的话用自己的设备与专用密码，并留意权限。项目已从 UNIDY2002/THUInfo 迁到 thu-info-community/thu-info-appgithub.com来源：thuservices（thu.services）工具汇总
-   [LearnX（网络学堂客户端）](https://github.com/robertying/learnX)需代理仍在维护iOS / iPadOS / macOS / Android第三方网络学堂客户端：看通知、下课件、交作业，比网页版顺手，支持 iOS / iPadOS / macOS / Android。github.com来源：thuservices（thu.services）工具汇总
-   [Learn-Project（浏览器扩展）](https://github.com/Harry-Chen/Learn-Helper)需代理仍在维护Chrome / Firefox / Edge 扩展把网络学堂里散落的事项按时间线和类型重排，明确今天该交什么。注意：项目已从 xxr3376/Learn-Project 迁到 Harry-Chen/Learn-Helpergithub.com来源：thuservices（thu.services）工具汇总
-   [thu-learn-downloader](https://github.com/liblaf/thu-learn-downloader)需代理已停止Linux / macOS / Windows（Python）批量下载网络学堂某门课的全部文件与作业，整理成目录，适合期末集中复习时一次性拉全。注意：上游写「可用」，但作者已在 2026-09 归档仓库 —— 现在仍能下载，出问题不会再有人修。边界：这是<b>把课件作业拉到本地</b>的工具，不含刷课时、不含批量提交；课程材料有版权，<b>下载只供自己复习</b>，不要再转发或上传到公开网盘github.com来源：thuservices（thu.services）工具汇总
-   [INFO 新闻 RSS（InfoTsinghuaRSS）](https://github.com/84634E1A607A/InfoTsinghuaRSS)需代理仍在维护自部署（Python）把 INFO 的通知做成一枚 RSS，支持按栏目过滤（例如排除招聘信息），不用每天手动刷门户。注意：公共实例需要校内 Git 身份登录；自己部署的话，令牌与密码只放在自己机器上github.com来源：thuservices（thu.services）工具汇总
-   [网络学堂 / INFO 消息推送机器人](https://github.com/Konano/thu-weblearn-tgbot)需代理已停止自部署（Python）把网络学堂与 INFO 的新通知推到 Telegram，适合已经用 Telegram 的人（另有 thu-info-forwarder 走别的通道）。注意：仓库已在 2026-03 归档（archived），只作了解；要用请找仍在维护的替代品github.com来源：thuservices（thu.services）工具汇总
-   [Rain Classroom Helper（雨课堂增强）](https://github.com/RainEggplant/rain-classroom-helper)需代理已停止油猴脚本给 PC / 平板上的雨课堂学生端做界面增强，大屏上课时更好用。注意：仓库已于 2022-03 归档，只作了解github.com来源：thuservices（thu.services）工具汇总

## 生活小事

-   [全校洗衣机状态（THU Info 网页版）](https://app.cs.tsinghua.edu.cn/)公网可开状态未核实网页 / 微信小程序出门前先看哪台洗衣机空着，少跑几趟楼道。官方小程序「自助智能校园」（主页下方「附近的洗衣机」）是更稳的入口。注意：这个入口是否还在维护未核实；更稳的是微信小程序「自助智能校园」里的「附近的洗衣机」。早年那个 washer.thu.services 接口已废弃，社区旧教程与机器人多数失效app.cs.tsinghua.edu.cn来源：thuservices（thu.services）工具汇总
-   [寝室电费查询脚本（TsinghuaElectric）](https://github.com/WhymustIhaveaname/TsinghuaElectric)需代理更新停滞命令行脚本把寝室电费余额抓出来，可以配合监控做低余额提醒，免得半夜断电。注意：这类脚本要填你自己的账号信息，<b>别把带密码的配置提交到公开仓库</b>github.com来源：thuservices（thu.services）工具汇总
-   [随机选择食堂（小程序）](https://github.com/SuXY15/RandomCanteen)需代理更新停滞微信小程序选择困难时的随机数发生器：转到哪个食堂就去哪个。github.com来源：thuservices（thu.services）工具汇总
-   [清华上下课铃声（macOS）](https://github.com/LyricZhao/THU-Bell)需代理更新停滞macOS在电脑上放清华的上下课铃声，假期在家自习时找回一点氛围（也用来提醒自己按课表节奏走）。github.com来源：thuservices（thu.services）工具汇总

## 资料与云盘

-   [清华云盘批量下载助手（CLI）](https://github.com/chenyifanthu/THU-Cloud-Downloader)需代理更新停滞命令行（Python）分享的文件过大时网页端不好下，这个命令行工具直接拉整个分享链接，支持带密码链接与按类型/文件夹过滤。注意：最后提交 2024-10，仍可用但不再迭代。<b>只下你有权访问的内容</b>；别人分享的课程材料不要二次分发github.com来源：thuservices（thu.services）工具汇总
-   [清华云盘下载助手（浏览器脚本）](https://github.com/lixc21/Seafile-Sharing-Link-Downloader)需代理更新停滞油猴脚本同一个问题的轻量解：不用装 Python，在浏览器里从 seafile 分享链接批量下载。注意：最后提交 2024-03；同类需求优先用上面那个下载量更大的命令行版本github.com来源：thuservices（thu.services）工具汇总
-   [清华云盘桌面客户端（seafile）](https://seafile.com/download/)公网可开仍在维护Windows / macOS / Linux官方同步客户端。Linux 上装桌面客户端（发行版里的 seafile-client）而不是终端版（seafile）：终端版需要另一个独立密码，那个密码你拿不到。seafile.com来源：thuservices（thu.services）服务指北

## 社区与备份

-   [闭社 - 清华站](https://thu.closed.social/)公网可开状态未核实网页清华的社区型站点（BBS 的后继形态之一），讨论偏校内生活与吐槽。thu.closed.social来源：thuservices（thu.services）常用校外网站
-   [thuhole memories（精品洞合集）](https://github.com/pb0316/thuhole_memories)需代理更新停滞GitHub 仓库从树洞里挑出来的内容合集。树洞本身已停止服务，全量备份的仓库也已下架，这份合集是还能找到的少数入口之一。注意：存档里可能仍含他人的具体信息。<b>看到具体的人和事，不要截图传播</b>github.com来源：thuservices（thu.services）工具汇总
-   [在线退学（工具导航）](https://tuixue.online/)公网可开状态未核实网页一个把清华各类学生工具与信息站收在一起的导航站，可以拿来交叉验证「还有哪些工具存在」。注意：导航站的收录标准不由本站把关，点进去的每个工具都要自己判断tuixue.online来源：thuservices（thu.services）常用校外网站

## 科研与实践

-   [研究生社会实践系统增强插件](https://github.com/pioet/thshijian-extension)需代理仍在维护浏览器扩展给研究生社会实践系统加内嵌侧边栏、已选人数查询、中签概率排序与提交历史。github.com来源：thuservices（thu.services）工具汇总

> 少了一个曾经很有名的东西
>
> T 大树洞的全量备份仓库（`thuhole/database_backup`）在 GitHub 上已经不存在（API 返回 404）， 所以这一页不再留那条链接 —— 留一个打不开的死链没有意义。精品洞合集还在，见「社区与备份」。

## 用之前的四条底线

这不是吓唬人：这些工具里的大多数确实好用，但<b>它们要的东西和校内系统一样多</b>。

1.  <b>看清它要什么权限，再决定装不装。</b> 油猴脚本和浏览器扩展能读你打开的页面内容 —— 包括成绩单、课表、选课操作。 App 要你的账号密码。<b>能用官方入口就先别用第三方</b>；一定要用，去项目页看一眼源码和 Issue， 比看别人推荐更有用。
2.  <b>别把密码写进命令行和脚本。</b> 进程列表、shell history、同步到公开仓库的配置文件，都是密码泄漏的常见途径。 优先选支持令牌或二次验证的工具，配置文件永远不要提交到公开仓库。
3.  <b>用脚本代替你操作课程相关系统，可能直接违反规定。</b> 自动刷视频、刷时长、批量提交这类“省事”脚本，属于[学术规范的边界](/academics/academic-integrity/)里说的问题： <b>被发现不是“用了工具”，而是学术不端。</b> 省下的那几个小时不值这个代价。
4.  <b>看到 “整合版 / 破解版 / 免登录版”，一律不用。</b> 来源不明的安装包是这类工具里最危险的一种，因为它同时要你的账号和你的设备。

## 我们特意不收录的几类

-   <b>教参平台、文泉学堂的“批量下载器”</b>：图书馆与出版社的授权是“在线浏览”，批量导出会超出授权范围， 构成侵权风险。缺书可以按图书馆页面上的方式申请扫描，那是正规路径。
-   <b>绕开认证、流量计费或端口限制的做法</b>：见[校园网进阶](/campus/network-advanced/)最后一节，边界一样。
-   <b>把校园网账号托管给第三方“代认证”的服务</b>：等于把你的账号交给陌生人，账还算在你头上。
-   <b>公开的 PT 站与影视资源站</b>：与“生存指南”无关，且风险由你承担。

## 打不开链接时

这一页的工具<b>大多托管在 GitHub</b>，国内访问时通时不通 —— 卡片上的「需代理」读作<b>打不开就挂代理</b> （实测记录见[校内常用链接](/guides/links/#%E6%A0%A1%E5%9B%AD%E7%BD%91%E9%87%8C%E6%89%93%E4%B8%8D%E5%BC%80%E7%9A%84%E4%B8%9C%E8%A5%BF)）。

-   只是看说明文档 → 打不开就挂代理，或出了校园网再看；
-   要拿代码 → `git clone` 走 SSH 更稳；
-   油猴脚本 → greasyfork 在校园网内不稳定（实测超时）。thuservices 仓库的 `misc/` 目录里有两份 <b>油猴脚本原件</b>（选课冲突标记、GPA 计算器）可以救急； 但<b>不要</b>顺手把那个目录里的 Python 脚本也用了 —— 它们把密码当命令行参数传，同机其他用户 从进程列表里就能看到（这正是上面“底线 2”说的那类做法）。
-   第三方工具不是学校官方产物，装之前先看一眼项目的 Issue 与权限说明。

## 数据在哪、怎么更新

工具清单在 `src/data/tools.ts`，加一条记录就行：名称、地址、干什么、平台、维护状态、校内可达性。 <b>维护状态不要凭印象填「活跃」</b>：先抄上游项目自己写的，再对一遍 GitHub 仓库的 `archived` 与最近一次提交（脚本没法在这一页自动跑，所以页面顶部会显示这次核对的日期）。 这一个字会被别人当成“可以放心用”。

上游清单是社区维护的 [thu.services](https://thu.services/)（thuservices）的《一些脚本和工具》， 比这一页全得多；我们只挑了对在校生日常有用的部分，并补上可达性与边界。

## 相关资料

-   [校内常用链接](/guides/links/)——学校官方入口，与这一页互补。
-   [校园网、流量与镜像加速](/campus/network-and-traffic/)——接入、认证与换镜像源的基础排查。
-   [校园网进阶：认证、命令行与服务器](/campus/network-advanced/)——网络类工具背后的原理与边界。
-   [资料与工具](/guides/resources/)——站内工具与可下载资料。
-   [外部资料库地图](/guides/archives/)——课程资料库的分工与使用红线。

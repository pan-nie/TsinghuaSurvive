---
title: 校园网、流量与镜像加速
description: 连不上校园网时的排查顺序、国际流量是怎么算的、以及把 pip/npm/conda 换到国内镜像把下载速度提上去。
stage:
  - 本科新生
  - 本科低年级
  - 全阶段
tags:
  - 网络
  - 工具
  - 生活
  - 新生
authors:
  - Nathan Penny
status: draft
reviewedAt: 2026-10-05
summary: 校园网接入、WebVPN、国际流量的概念，以及换镜像源把下载速度提上去的具体做法。
banner:
  content: 无线 SSID、免费额度与服务窗口时间是 2026 年的口径。流量政策每年可能调整，以信息化用户服务平台和网络服务部门的通知为准。
sidebar:
  order: 4
editUrl: https://my.feishu.cn/docx/QirHdPQCrob8Pixvn0mc9rjInid
lastUpdated: 2026-10-28T10:14:00.000Z
feishu:
  url: https://my.feishu.cn/docx/QirHdPQCrob8Pixvn0mc9rjInid
  revision: 4
---

网络问题有两个完全不同的类型，先分清再动手：

-   <b>「连不上 / 认证失败」</b> —— 接入问题，看本文前半部分；
-   <b>「能上网但下载慢、装包老失败」</b> —— 出口与源的问题，直接跳到[换镜像源](/campus/network-and-traffic/#%E6%8D%A2%E9%95%9C%E5%83%8F%E6%BA%90%E6%9C%80%E7%9C%81%E4%BA%8B%E7%9A%84%E6%8F%90%E9%80%9F%E6%89%8B%E6%AE%B5)。

> 先关掉代理和加速器
>
> 这是校内网络问题里最常见的原因之一：<b>挂着代理或加速器时，校内系统（信息门户、网络学堂、图书馆数据库）经常打不开</b>， 因为它们需要走校内网络出口。遇到「昨天还能用今天打不开」，第一件事是把代理关掉再试。

## 接入：无线、有线与认证

学校的无线网用 802.1X 认证，<b>不需要每次打开浏览器登录</b>，但需要先在自服务系统里给 802.1X 单独设一个密码（很多人的第一次卡壳就在这一步）：

1.  用校园网账号登录自助服务系统 [https://usereg.tsinghua.edu.cn](https://usereg.tsinghua.edu.cn/)；
2.  在里面找到 802.1X 相关的功能，<b>注册/修改 802.1X 密码</b>；
3.  在设备的无线设置里连接校园无线网，用户名填<b>校园网账号</b>，密码填<b>上一步设的 802.1X 密码</b>。

> 为什么要单独设一个密码
>
> 802.1X 密码和校园网账号密码是两套东西，<b>不要设成同一个</b>。 如果 802.1X 密码忘了或者被改过，表现就是「手机能连、电脑连不上」或者「一直提示密码错误」——回自服务系统重设即可。

不同系统的配置细节（Windows / macOS / iOS / Android / Linux）以<b>信息化用户服务平台上的说明</b>为准：[https://its.tsinghua.edu.cn/](https://its.tsinghua.edu.cn/)。 不要照抄网上搜到的旧教程，界面早就变了。

<b>要连的无线网叫什么</b>（2026 年的口径）：

<table><colgroup><col><col></colgroup><thead><tr><th><p>区域</p></th><th><p>SSID</p></th></tr></thead><tbody><tr><td><p>宿舍区</p></td><td><p><code>Tsinghua</code>、<code>Tsinghua-IPv4</code>、<code>Tsinghua-5G</code>、<code>Tsinghua-Secure</code></p></td></tr><tr><td><p>办公区</p></td><td><p><code>Tsinghua-IPv4</code>、<code>Tsinghua-IPv6</code>、<code>Tsinghua-Secure</code></p></td></tr></tbody></table>

<b>优先用 </b> <b><code>Tsinghua-Secure</code></b>：它是 802.1X 认证，只要第一次登录成功，之后会自动连上，不用每次开浏览器认证。网页认证入口是 [http://login.tsinghua.edu.cn](http://login.tsinghua.edu.cn/)。

<b>有线网</b>：宿舍与实验室的网口一般是插上就用，首次可能需要认证一次。宿舍端口的位置和可用性问宿舍楼管或院系。

## 在校外访问校内资源：WebVPN

放假回家、实习期间要查文献或进校内系统，用 [WebVPN](https://webvpn.tsinghua.edu.cn/)， 不要用第三方的「代理网站」——那些既不稳定，也意味着你要把账号交出去。

> 不要把校园网账号给别人用
>
> 账号外借既违反学校规定，也会让<b>你自己</b>承担别人操作的后果（访问记录都算在你头上）。 需要用校外资源，走 WebVPN 或图书馆的校外访问入口。

## 流量：为什么「刷视频很快，下论文很慢」

校园网对<b>境外流量</b>与校内流量是分开走的：

-   访问校内、国内站点，不出国际出口；
-   访问境外站点（Google、GitHub、arXiv、PyPI、YouTube 等）要走国际出口，<b>带宽是共享的、还有自己的访问策略</b>；
-   所以「在校园网里下 PyPI 包」和「下国内镜像的同一个包」，<b>体验差别很大</b>——慢的不是你的账号，是那条出口。这也是下一节要说的。

<b>计费口径</b>：学生账号<b>不收超出套餐的流量费</b>——也就是说，目前学生用校园网是<b>免费</b>的。这条自 2020 年 2 月起施行，学校一直按这个口径答复（来源见下）。自助服务系统是 [https://usereg.tsinghua.edu.cn](https://usereg.tsinghua.edu.cn/)，你当月的<b>使用时长与流量</b>都在「账户信息」里看得到。

> 免费的是计费，不是带宽
>
> 「不收流量费」不等于「国际出口随便跑」：出口带宽是共享的，高峰时段访问境外站点照样慢；账号也仍有在线设备数上限等限制（见[校园网进阶](/campus/network-advanced/)）。<b>账单口径以自助服务系统里的实际记录为准</b>——页面顶部的时效提示也会提醒你这一条该重新核对了。

一个被低估的做法：<b>把常用的开发工具源换到国内镜像</b>。省下的是<b>等待时间</b>，也避免了国际出口抽风时下到一半断掉。

## 换镜像源：最省事的提速手段

原理很简单：这些命令只是把「去哪下载」从官方源改成国内的镜像站，<b>包的内容是一样的</b>。

### Python：pip

终端窗口

```
# 临时用一次pip install -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple 包名# 设为默认（推荐）python -m pip install --upgrade pippip config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple
```

### Node.js：npm

终端窗口

```
npm config set registry https://registry.npmmirror.com# 想改回官方源npm config set registry https://registry.npmjs.org
```

### 其他生态（conda / apt / Homebrew / Docker / Rust…）

不要记命令，直接看官方的换源说明页，每个生态都有一份、且持续更新：

[<b>https://mirrors.tuna.tsinghua.edu.cn/help/</b>](https://mirrors.tuna.tsinghua.edu.cn/help/)

> 换源的两个坑
>
> 1.  <b>别把源删了重装</b>。改配置之前先记下原来的值（`pip config list`、`npm config get registry`）， 出问题能改回去。
> 2.  <b>镜像同步有延迟</b>。刚发布的版本可能还没同步过来，装不上时先换回官方源试一次， 确认是「包没同步」而不是你的环境坏了。

## 连不上的排查顺序

按这个顺序走，能解决九成问题：

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>顺序</p></th><th><p>检查什么</p></th><th><p>常见结论</p></th></tr></thead><tbody><tr><td><p>1</p></td><td><p><b>代理/加速器是否开着</b></p></td><td><p>关掉再试。校内系统最容易被它挡住</p></td></tr><tr><td><p>2</p></td><td><p><b>账号与 802.1X 密码</b></p></td><td><p>提示密码错误就去 <a href="https://usereg.tsinghua.edu.cn/">https://usereg.tsinghua.edu.cn</a> 重设</p></td></tr><tr><td><p>3</p></td><td><p><b>换个设备/换个位置</b></p></td><td><p>手机能连、电脑不能连 → 是设备配置问题；都连不上 → 是账号或区域覆盖问题</p></td></tr><tr><td><p>4</p></td><td><p><b>忘记网络后重连</b></p></td><td><p>系统里存了旧密码时，表现就是「一直转圈」</p></td></tr><tr><td><p>5</p></td><td><p><b>访问的是不是校内系统</b></p></td><td><p>校外访问校内系统必须先连 WebVPN</p></td></tr><tr><td><p>6</p></td><td><p><b>DNS 解析</b></p></td><td><p>校内 DNS 会缓存解析失败的结果，新绑定的域名可能要等一段时间才生效</p></td></tr><tr><td><p>7</p></td><td><p><b>还是不行</b></p></td><td><p>带着「什么设备、在哪、报什么错、什么时候开始」去找信息化用户服务平台，比说「上不了网」有效得多</p></td></tr></tbody></table>

> 报修时说什么
>
> 「什么时候开始、在哪个楼、什么设备、完整报错截图、已经试过哪些办法」—— 这五件事说清楚，处理速度会快很多。只说「网断了」通常会被要求补充信息。

## 线下窗口：什么时候必须跑一趟

有些事线上办不了，要去<b>李兆基科技大楼东门一层 B104 室</b>（信息化技术中心用户服务室）：

<table><colgroup><col><col></colgroup><thead><tr><th><p>事项</p></th><th><p>时间</p></th></tr></thead><tbody><tr><td><p>密码重置</p></td><td><p>工作日 8:00–12:00、13:00–17:00</p></td></tr><tr><td><p>缴费</p></td><td><p>工作日 13:00–16:00</p></td></tr><tr><td><p>咨询（电话 010-62784859，邮箱 <a href="mailto:its@tsinghua.edu.cn">its@tsinghua.edu.cn</a>）</p></td><td><p>工作日 8:00–12:00、13:00–17:00</p></td></tr></tbody></table>

另外记住一个上限：<b>账号可在线设备数是 1–8 台</b>。到了上限会出现「明明密码没错却登不上」的情况，这时要去自助服务系统里踢掉不用的设备。

## 相关资料

-   [校园网进阶：认证、命令行与服务器](/campus/network-advanced/)——准入/准出的机制、命令行认证、Linux 连 Tsinghua-Secure、服务器掉线排查。<b>有服务器或用 Linux 的话，那页才是你需要的。</b>
-   [校内常用链接](/guides/links/)——信息化用户服务平台、WebVPN、镜像站等入口都在这一页，带可达性角标。
-   [学生自建工具与脚本](/guides/tools/)——网络、课程与生活类的第三方工具清单，标了维护状态。
-   [外部资料库地图](/guides/archives/)——里面的校内 GitLab 镜像，就是「用校园网省国际流量」的典型例子。
-   [宿舍、校园网与一卡通](/freshman/dorm-and-network/)——新生入学的账号与基础设施清单。

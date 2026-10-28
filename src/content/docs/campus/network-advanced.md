---
title: 校园网进阶：认证、命令行与服务器
description: 准入与准出是怎么回事、命令行怎么认证、Linux 连 Tsinghua-Secure 与校内 VPN、服务器掉线怎么排查，以及那些「玄学」问题的成因。
stage:
  - 本科高年级
  - 研究生
  - 全阶段
tags:
  - 网络
  - 工具
  - 命令行
  - 科研
authors:
  - Nathan Penny
status: draft
summary: 给要跑服务器、用 Linux 或想搞清校园网机制的人：认证原理、命令行工具、常见疑难与边界。
banner:
  content: 本文的机制、命令与配置整理自社区资料（thu.services）并在校园网内做过部分复核，但没有逐条对照信息化技术中心的最新说明——涉及具体客户端、端口与客户端软件的部分，请以官方说明为准。认证系统在 2024 年末升级过一次，第三方工具的可用性会随上游项目变化，用前先看项目页。
sidebar:
  order: 5
editUrl: https://my.feishu.cn/docx/WAyvdvDhFobPGbxezQ6cIWyin8c
lastUpdated: 2026-10-28T10:10:55.000Z
feishu:
  url: https://my.feishu.cn/docx/WAyvdvDhFobPGbxezQ6cIWyin8c
  revision: 3
---

<b>这一页不是新生必读。</b> 只连手机和笔记本的话，[校园网、流量与镜像加速](/campus/network-and-traffic/) 那一页就够了。

这一页写给三种人：<b>要在机房或实验室跑服务器的人</b>、<b>用 Linux 当主力系统的人</b>、<b>想把「为什么连不上」查到底的人</b>。 内容的事实来自社区维护的 [thu.services](https://thu.services/)（thuservices）的《清华服务使用指北》， 本站重写了组织方式，并把「哪些不能做」单独标出来。

## 一、准入与准出：校园网的两道门

校园网把「能上网」拆成两步，很多“连上了却上不了外网”的问题都出在这里：

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>状态</p></th><th><p>IPv4 能做什么</p></th><th><p>IPv6 能做什么</p></th></tr></thead><tbody><tr><td><p>都没有</p></td><td><p>只能 ping 通 <code>166.111.8.28</code> 和 <code>2402:f000:1:801::8:28</code>（校园 DNS）</p></td><td><p>同左</p></td></tr><tr><td><p><b>只有准入</b></p></td><td><p>校内机器可达，<b>不能上外网</b></p></td><td><p><b>能上外网</b></p></td></tr><tr><td><p><b>准入 + 准出</b></p></td><td><p>外网可达</p></td><td><p>能上外网</p></td></tr></tbody></table>

几条容易踩的规则：

-   <b>IPv4 有两道门，IPv6 只有准入一道门。</b> 所以「v6 能上、v4 上不去」是常见现象，不是你配置错了。
-   <b>二层接入</b>（紫荆宿舍网、教学楼无线、部分院系）v4 与 v6 准入<b>联动</b>：v4 准入时 v6 一起准入。
-   <b>三层接入</b>（部分院系网）v4 与 v6 <b>要分别准入</b>，所以会出现「同一个笔记本在宿舍好好的，搬到系馆就上不了 v6」。
-   <b>Tsinghua-Secure 走的是另一套 802.1X 认证</b>，和上面这套准入/准出并行。

> 三分钟自查
>
> 连上网络后先看两件事：能不能 `ping 166.111.8.28`（通 = 准入在），能不能打开外网（通 = 准出在）。 这一步做完，就知道该去修准入还是准出，不用把两种问题混在一起猜。

## 二、网页认证与命令行认证

网页认证的入口是 `net.tsinghua.edu.cn`（准出）和 `auth4` / `auth6`（v4 / v6 准入）。 一个反直觉的坑：<b>不要直接打开 </b> <b><code>auth4</code></b> <b> / </b> <b><code>auth6</code></b>，认证需要正确的 `ac_id` 参数， 一般通过 `info` 或 `learn` 的登录页跳转过去才带得上；`3.3.3.3`（v4）和 `[3:3:3::3]`（v6）也是常用的跳转地址。

服务器和 Linux 上更常用命令行工具。[GoAuthing](https://github.com/z4yx/GoAuthing)（命令名 `auth-thu`）是其中覆盖面最广的一个：

终端窗口

```
auth-thu auth        # v4 准入auth-thu deauth      # 解除 v4 准入auth-thu auth -6     # v6 准入auth-thu deauth -6   # 解除 v6 准入auth-thu online      # 保持在线（心跳）
```

要开机自动认证，把项目里附带的 `goauthing.service` / `goauthing@.service` 放进 `/etc/systemd/system/`， 改好程序与配置文件的路径，然后：

终端窗口

```
sudo systemctl enable --now goauthing.service
```

> 一个很实际的细节
>
> 未认证时连 GitHub 也打不开，而认证工具恰好托管在 GitHub 上。GoAuthing 的发布文件在 [TUNA 镜像](https://mirrors.tuna.tsinghua.edu.cn/github-release/z4yx/GoAuthing/LatestRelease/) 有备份 —— <b>先有鸡还是先有蛋的问题，在这里是被解决过的</b>：还没认证也能从校内镜像把认证工具拉下来。

## 三、这些工具现在还能用吗

2024 年末准入认证系统升级过一轮，<b>升级前停更的工具基本不能再指望</b>。社区汇总表（thuservices 的《一些脚本和工具》）里的结论大致是：

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>工具</p></th><th><p>形态</p></th><th><p>升级后状态</p></th></tr></thead><tbody><tr><td><p><a href="https://github.com/z4yx/GoAuthing">GoAuthing</a></p></td><td><p>CLI，全平台全架构</p></td><td><p>可用；有 systemd 服务与 TUNA 镜像</p></td></tr><tr><td><p><a href="https://github.com/Berrysoft/tunet-rust">tunet-rust</a></p></td><td><p>CLI / GUI / 服务</p></td><td><p>可用；带流量与余额监控</p></td></tr><tr><td><p><a href="https://github.com/adamanteye/tunet_bash">tunet_bash</a></p></td><td><p>Bash 脚本</p></td><td><p>可用；轻量</p></td></tr><tr><td><p>官方 Tunet-2025</p></td><td><p>Windows GUI / Linux CLI</p></td><td><p>可用；入口见<a href="/guides/links/">校内常用链接</a></p></td></tr><tr><td><p>tunet-python / tunet-c / TsinghuaTunet</p></td><td><p>Python / C</p></td><td><p>上游标注为「未测试」，最后提交都在升级之前（很可能没适配），别在服务器上用</p></td></tr><tr><td><p>auth-tsinghua、TsinghuaNet</p></td><td><p>JS / C#</p></td><td><p>已停止维护，项目已重定向到上面的替代品</p></td></tr></tbody></table>

> 别在服务器上跑停更的工具
>
> 认证工具要拿你的账号密码去换网络准入，跑一个两年没更新的脚本，风险不只是“用不了”。 <b>优先用官方工具或仍在维护的项目</b>；上游项目页写的状态比任何二手列表都准。

## 四、服务器场景：代认证与掉线排查

<b>服务器没有浏览器，怎么让它上网？</b> 官方的做法是「准入代认证」：在 [校园网自助服务系统](https://usereg.tsinghua.edu.cn/) 里填入服务器的 IPv4 地址 （形如 `166.111.x.x`、`59.66.x.x`、`101.x.x.x`），选择是否同时开准出，就能替它完成准入。 三层接入的机器也可以在这里单独给 v6 准入。

几个实际会遇到的问题：

-   <b>30 分钟无流量会掉准入。</b> 长时间空闲的机器可能被认证系统断开，需要靠上面这类客户端做保活。
-   <b>掉准出后补不回来。</b> 有些长期运行的机器会掉准出，且 usereg 里显示“在准出表中”但实际访问不了外网 —— 这通常是校内设备状态不同步，不一定是你的问题。
-   <b><code>usereg</code></b> <b> 的反馈比命令行少。</b> 把它当状态面板，认证动作交给命令行或网页，排查会清楚得多。
-   <b>只能 </b> <b><code>ssh</code></b> <b> 进去、没有浏览器时</b>：可以用 `ssh -D <端口> 主机` 在本地开一个 socks5 代理，再在浏览器里走这个代理去网页认证。

> 一个可能让你永久失联的操作
>
> 网上流传的“先 `deauth` 再 `auth` 刷新状态”确实可能修好掉准出，但<b>解除准入会让正在进行的 ssh 连接断开</b>。 如果服务器只有这一条网络路径、又没有带外管理（IPMI / 远程控制卡）或校内同学能到场， <b>不要在没有恢复手段的情况下做这个操作。</b>

## 五、DNS 与 NTP

校园网建议至少把 DNS 与 NTP 指向校内服务：

```
166.111.8.28          166.111.8.292402:f000:1:801::8:28 2402:f000:1:801::8:29
```

两个值得知道的现象：

-   <b>校园网内基本只能用校园网 DNS</b>，其他公共 DNS 不保证工作。
-   <b>对公共 DNS 的拦截是真实存在的</b>：被拦截的地址表现为 `ping` 延迟异常低（<1 ms）、`traceroute` 在校园网出口附近就消失。此时换回校园网 DNS（或 TUNA 的 `101.6.6.6` / `2001:da8::666`）通常立刻正常。

> 这不是“你网坏了”
>
> DNS 被拦的表现很像“网页打不开”，但机制完全不同：包根本没出校门。 所以排查顺序里，「DNS 用的是哪个」应该排在「重装网卡驱动」前面。

## 六、用命令行连校内 VPN

Linux 上没有官方的 PULSE SECURE 图形客户端，可以用 `openconnect` 连 SSLVPN：

终端窗口

```
# Debian / Ubuntusudo apt-get install openconnect# Arch Linuxsudo pacman -S openconnect# 基本连法sudo openconnect --juniper https://sslvpn.tsinghua.edu.cn# 需要拿到 IPv6 地址与路由时：换成 pulse 协议并指定 UserAgentsudo openconnect --protocol=pulse https://sslvpn.tsinghua.edu.cn \  --useragent Pulse-Secure/9.1.11.6725
```

用 `--juniper` 时不会分配 IPv6 地址；用 `--protocol=pulse` 且带上 UserAgent 才能正确拿到 v6 路由。 只查文献、进校内系统的话，[WebVPN](https://webvpn.tsinghua.edu.cn/) 更省事 —— <b>只有需要真正的网络层接入（ssh 到校内机器、跑需要校内出口的任务）时才值得折腾 SSLVPN。</b>

## 七、Linux 连 Tsinghua-Secure

流程和手机一样，关键只有一条：<b>在自服务系统里给 802.1X 单独设一个密码</b>（不要用 info 的密码）。 不同客户端的配置（NetworkManager / wpa\_supplicant / iwd）在 thuservices 的 [服务指北](https://thu.services/services/#tsinghua-secure) 里有可直接抄的样例，这里只说三个最容易出错的点：

1.  <b>一定校验证书。</b> 早期官方 SOP 曾指引用户“不校验证书”，那是不安全的做法。正确配置是信任系统证书库 （`/etc/ssl/certs/ca-certificates.crt`）并限定 `domain-suffix-match=wifi.tsinghua.edu.cn`。 用系统证书库而不是某个具体证书文件，学校换证书时你才不会突然连不上。
2.  <b>只用校内登录时可以写 </b> <b><code>用户名@tsinghua</code></b><b>。</b> 这样登录不会占用你的“准出名额”， 避免把别的设备（比如正在远程连的服务器）挤出准出表。
3.  <b>别把网上的旧教程整段抄。</b>`phase1="tls_disable_tlsv1_0=0"` 这类参数在认证系统升级后已经不需要了； 以信息化技术中心的最新配置说明为准。

> 想验证“我的配置对不对”，看现象就够
>
> 连上后 `ping 166.111.8.28` 通、能打开校内系统 —— 说明准入没问题； 打不开外网而校内正常 —— 这正是 `@tsinghua` 仅校内登录的预期表现，不是故障。

## 八、那几个“玄学”问题的成因

这些现象看着像玄学，其实都有明确机制。知道成因，就不用反复重装系统了。

<table><colgroup><col><col><col></colgroup><thead><tr><th><p>现象</p></th><th><p>成因</p></th><th><p>常见处理</p></th></tr></thead><tbody><tr><td><p>同一个 <code>/24</code> 里的两台机器互相 ping 不通</p></td><td><p>接入交换机的二层隔离（v4）/ 邻居发现隔离（v6），ARP 或 NDP 不生效</p></td><td><p>给两端加一条指向网关的静态路由（<code>ip r a ...</code>），v6 用网关的 <code>fe80::</code> 地址</p></td></tr><tr><td><p>自建服务在外面连不上，但校内正常</p></td><td><p>IPv4 对低端口（0–1024、8000–8100、3389、9100 等）有阻断，常用代理端口也在列；2022 秋季起 v6 也有部分阻断</p></td><td><p>换高位端口，或把服务放到反代后面</p></td></tr><tr><td><p>IP 每天变，写不进配置文件</p></td><td><p>动态分配（DHCP / SLAAC）</p></td><td><p>用 DDNS，或在 SLAAC 下设置 IPv6 静态后缀（<code>ip token set</code>）</p></td></tr><tr><td><p><code>systemd-networkd</code> 有线拿不到 IPv4</p></td><td><p>学校 DHCP 不接受非 MAC 的 Client ID，而 systemd-networkd 默认发 DUID</p></td><td><p>在网络配置里加 <code>[DHCP]ClientIdentifier=mac</code></p></td></tr><tr><td><p>有线拿不到 IPv6 地址</p></td><td><p>学校 DHCPv6 只认部分 DUID（DUID-LLT）</p></td><td><p>在配置里指定 <code>DUIDType=link-layer-time</code>（dhcpcd 则用 DUID-LLT）</p></td></tr><tr><td><p>v6 准入过一段时间就掉</p></td><td><p>IPv6 隐私扩展让地址不断变化，而准入是按地址记的</p></td><td><p>关掉临时 IPv6 地址，或用自动认证客户端保活</p></td></tr><tr><td><p>机器能被 ping 通，但 ssh 不上</p></td><td><p>未准入时的放行策略只允许 ICMP 回包</p></td><td><p>先完成准入，别怀疑防火墙</p></td></tr></tbody></table>

> 哪一条最常被误判
>
> 「自建服务校内能开、校外打不开」几乎总被当成学校封了端口。实际是<b>低端口阻断</b> —— 换到 10000 以上的端口再试一次，比写邮件问网络中心快得多。

## 九、怎么判断一台机器在不在校内网络

写条件判断、配白名单或者判断“这次访问算不算国际流量”时，会需要这些网段：

```
166.111.0.0/16   重要校园服务（主页、门户等），教学楼与图书馆无线也常在这里101.5.0.0/16     机房与院系网；2024 年 4 月后也用于学生区无线101.6.0.0/16     同上59.66.0.0/16     紫荆、C 楼等学生区与南部居民区183.172.0.0/16   无线网183.173.0.0/16   无线网118.229.0.0/20   网络基础设施内部使用
```

IPv6 一般用 `2402:f000::/32`；网研院有 `2001:250:200::/48`。 这些段来自 thuservices 的整理，<b>判断用途可以，别当成安全边界</b>去用。

## 十、这一页刻意不写的东西

有些网上流传的做法，本站在这里明确不收录、也不建议：

-   <b>利用未准入状态的协议特性搭“代认证”通道</b>：那是在绕过准入设计，属于[内容边界](/start/disclaimer/)里说的“绕过权限”；
-   <b>把密码写进命令行参数或明文脚本的老工具</b>：同机其他用户能从进程列表里看到你的密码；
-   <b>把校园网账号借给别人用</b>：访问记录都算在你头上，出了事是你担着；
-   <b>绕开认证、端口限制或计费规则的做法</b>：省下的那点代价，赔不起（校园网目前对学生不收费，就更没有绕的理由）。

## 相关资料

-   [校园网、流量与镜像加速](/campus/network-and-traffic/)——接入、认证与换镜像源的基础排查，先看那页。
-   [校内常用链接](/guides/links/)——认证入口、自助服务系统、正版软件等，带可达性与核对状态。
-   [学生自建工具与脚本](/guides/tools/)——网络、课程与生活类的第三方工具清单。
-   [命令行与 Linux 基础](/skills/command-line/)——本文用到的 `ssh`、`systemd`、`ip` 命令的入门。
-   上游资料：[https://thu.services/](https://thu.services/)（thuservices）——这一页的事实来源，也是最全的社区汇总。

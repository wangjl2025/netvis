# 🌐 NetVis — 网络协议可视化学习平台

> **让抽象协议变得可见、可操作、可理解。**  
> 中文 · 步进交互 · 深度教学 · 零依赖 · 开箱即用

[![GitHub Pages](https://img.shields.io/badge/在线体验-GitHub%20Pages-blue?style=flat-square&logo=github)](https://wangjl2025.github.io/netvis/)
[![协议数量](https://img.shields.io/badge/协议覆盖-18个-green?style=flat-square)](#已支持协议)
[![技术栈](https://img.shields.io/badge/技术栈-纯HTML%2FCSS%2FJS-orange?style=flat-square)](#技术栈)
[![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)](LICENSE)

---

## ✨ 为什么用 NetVis？

学网络最难的不是理论，是**不知道那些包长什么样**。

- 📚 教材只有流程图，看完还是懵
- 🔧 Wireshark 抓到包，但不知道每个字段什么意思
- 💻 实验环境难搭，光装系统就花半天

**NetVis 的做法**：把 18 个常见协议做成交互式动画，每一步都有详细旁白、字段解析、思考题——打开浏览器就能学，手机也能用。

---

## 🎯 核心功能

### 1. 步进式协议动画
每个协议拆成 4～8 个关键步骤，一步一步走，每步配有：
- **旁白文字**：告诉你这一步发生了什么
- **字段推导**：seq/ack 等值的来源一目了然（如 `100 + 1 = 101`）
- **知识点卡片**：关联的核心概念
- **思考题**：可展开/收起答案，主动学习

**键盘快捷键**：← → 切步骤 · Space 播放/暂停 · `?` 查看全部快捷键

### 2. 模拟抓包对照（Wireshark 风格）
18 个协议均提供完整的模拟报文，与动画步骤联动高亮：
- 报文列表（编号 · 时间 · 源/目 · 协议 · 描述）
- 点击任意报文展开字段详情，字段含义逐一解释
- 切换动画步骤时，对应报文自动高亮

### 3. 协议对比视图
4 组关键对比，并排展示差异：
| 对比组 | 核心差异 |
|---|---|
| TCP vs UDP | 可靠性、连接、开销 6 维度 |
| HTTP vs HTTPS | 加密、证书、握手流程 |
| DNS 递归 vs 迭代 | 查询路径、服务器角色 |
| FTP 主动 vs 被动 | 连接方向、防火墙穿透 |

### 4. 错误演练模式
从所有协议题库随机出题（选择题 + 问答题），完成后给出百分制评分。

### 5. 速记卡
从协议知识点自动生成抽认卡，支持翻转、分组筛选、随机打乱，移动端友好。

### 6. 徽章进度系统
走完一个协议的最后一步解锁对应徽章，进度持久化存储（localStorage）。

---

## 📡 已支持协议（18 个）

### 应用层
| 协议 | 步数 | 亮点 |
|---|---|---|
| DNS 域名解析 | 7 | 递归 / 迭代双模式切换 |
| HTTP 请求响应 | 6 | 完整报文 + 状态码 |
| HTTPS / TLS 1.3 | 8 | ECDH 握手 + 前向安全 |
| DHCP 地址分配 | 4 | DORA + T1/T2 续租 |
| WebSocket | 5 | HTTP Upgrade + 帧格式 |
| SMTP 邮件发送 | 6 | STARTTLS + AUTH + 信封 |
| SSH 安全登录 | 6 | 算法协商 + ECDH + 加密信道 |
| FTP 文件传输 | 6 | 主动 / 被动双模式对比 |

### 传输层
| 协议 | 步数 | 亮点 |
|---|---|---|
| TCP 三次握手 | 6 | seq/ack 推导 + 异常场景 |
| TCP 四次挥手 | 7 | TIME_WAIT + 为什么四次 |
| UDP 数据报 | 4 | 无连接特性 + 与 TCP 性能对比 |
| TCP 拥塞控制 | 6 | 慢启动 → 拥塞避免 → 快恢复 + cwnd 折线图 |

### 网络层
| 协议 | 步数 | 亮点 |
|---|---|---|
| ICMP / Ping | 5 | TTL + Traceroute 原理 |
| NAT 地址转换 | 5 | SNAT / DNAT 双模式 + NAPT 表 |
| IP 路由转发 | 6 | 最长前缀匹配 + 逐跳封帧 |
| OSPF 路由协议 | 7 | Hello → DBD → LSR → LSU → Full |

### 数据链路层
| 协议 | 步数 | 亮点 |
|---|---|---|
| ARP 地址解析 | 4 | 广播请求 + 单播应答 |
| VLAN 虚拟局域网 | 6 | 802.1Q 标签 + Trunk/Access 端口 |

---

## 🚀 快速开始

**在线体验（推荐）**：[https://wangjl2025.github.io/netvis/](https://wangjl2025.github.io/netvis/)

**本地运行**：

> 协议数据使用动态加载，需通过 HTTP 服务器打开（不能直接双击 index.html）

```bash
# 克隆仓库
git clone https://github.com/wangjl2025/netvis.git
cd netvis

# 方法一：Python（推荐，无需安装依赖）
python -m http.server 8766
# 访问 http://localhost:8766

# 方法二：Node.js
node server.js
# 访问 http://localhost:8765
```

---

## 🗂️ 项目结构

```
netvis/
├── index.html          # 主框架（~210KB）
├── styles.css          # 全局样式（48KB 压缩版 styles.min.css）
├── data/               # 协议数据文件（懒加载，18个）
│   ├── tcp3.js         # TCP 三次握手
│   ├── tcp4.js         # TCP 四次挥手
│   ├── dns.js          # DNS（递归模式）
│   ├── dns-iter.js     # DNS（迭代模式）
│   ├── http.js         # HTTP 请求响应
│   ├── tls.js          # TLS 1.3 握手
│   ├── dhcp.js         # DHCP 地址分配
│   ├── smtp.js         # SMTP 邮件发送
│   ├── websocket.js    # WebSocket
│   ├── ssh.js          # SSH 安全登录
│   ├── ftp.js          # FTP 文件传输
│   ├── udp.js          # UDP 数据报
│   ├── arp.js          # ARP 地址解析
│   ├── icmp.js         # ICMP / Ping
│   ├── nat.js          # NAT（SNAT）
│   ├── nat-dnat.js     # NAT（DNAT/端口转发）
│   ├── iproute.js      # IP 路由转发
│   ├── ospf.js         # OSPF 路由协议
│   ├── vlan.js         # VLAN 虚拟局域网
│   └── tcpcong.js      # TCP 拥塞控制
├── modules/            # 功能模块（懒加载）
│   ├── badge.js        # 徽章/进度系统
│   ├── capture.js      # 模拟抓包对照（18协议）
│   ├── drill.js        # 错误演练模式
│   ├── flashcard.js    # 速记卡
│   └── share.js        # 分享海报
├── sitemap.xml
├── robots.txt
└── server.js           # 本地开发服务器
```

---

## 🛠️ 技术栈

**纯 HTML + CSS + JavaScript，零依赖，零构建工具。**

- 协议数据按需加载（`requestIdleCallback` 空闲预加载）
- 模块化：每个功能拆成独立 `modules/*.js`，不污染主文件
- 没有 React / Vue / Webpack / Chart.js，克隆即用
- GitHub Pages 直接部署，无需服务端

---

## 🤝 贡献

欢迎 PR！

- **新增协议**：参考 `data/dhcp.js` 的结构，创建 `data/your-proto.js`，并在 `index.html` 的 `protocolDB` 中注册
- **修复内容**：协议步骤有错误？直接提 Issue 或修改对应 `data/*.js`
- **功能建议**：提 Issue 描述需求即可

---

## 📄 License

MIT © 2026 [wangjl2025](https://github.com/wangjl2025)

---

> ⭐ 如果这个项目帮到了你，欢迎点个 Star，让更多人发现它！

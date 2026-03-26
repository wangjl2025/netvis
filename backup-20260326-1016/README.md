# 网络协议可视化 · NetViz

> 交互式网络协议动画学习平台 — 让抽象协议变得可见、可操作、可理解

🔗 **在线访问**：[https://你的用户名.github.io/neetwork/](https://github.io)

---

## 功能特性

- 🎬 **步进动画**：逐步拆解每一个协议报文交换过程，支持键盘快捷键（← → / 空格）
- 💡 **步骤旁白**：每步自动更新解读文字，读懂不用费力
- 📋 **字段推导标注**：seq/ack 数值来源一目了然（如 `100 + 1 = 101`）
- 🤔 **配套思考题**：主动提问式学习，可展开/收起答案
- ⚠️ **异常场景模拟**：丢包 → 重传完整演示
- ⚡ **TCP vs UDP 对照**：一键并排对比两种传输协议的本质区别
- 🔧 **自定义参数**：修改初始序列号，动画自动推导所有 ack/seq
- 📱 **移动端适配**：响应式设计，手机/平板均可正常使用
- ⚡ **按需加载**：协议数据拆分为独立文件，主页面加载更快

## 已支持协议（12个）

| 协议 | 层级 | 状态 |
|------|------|------|
| TCP 三次握手 | 传输层 | ✅ 完整（含三层教学增强 + 异常场景） |
| TCP 四次挥手 | 传输层 | ✅ 完整 |
| HTTP 请求响应 | 应用层 | ✅ 完整 |
| HTTPS/TLS 1.3 握手 | 应用层 | ✅ 完整 |
| DNS 解析 | 应用层 | ✅ 完整（8步递归解析） |
| UDP 数据报 | 传输层 | ✅ 完整 |
| ARP 地址解析 | 网络层 | ✅ 完整 |
| ICMP / Ping | 网络层 | ✅ 完整（含 Traceroute 原理） |
| DHCP（DORA） | 应用层 | ✅ 完整（含续租机制） |
| SMTP 邮件发送 | 应用层 | ✅ 完整（含 STARTTLS + SPF/DKIM/DMARC） |
| WebSocket | 应用层 | ✅ 完整（含帧格式 + 全双工原理） |
| SSH 安全登录 | 应用层 | ✅ 完整（含 ECDH 密钥交换 + 前向安全） |

## 本地运行

> **注意**：协议数据使用动态加载，需要通过 HTTP 服务器打开，直接双击 `index.html` 协议内容可能无法加载。

```bash
# 方法一：Python（推荐）
cd neetwork
python -m http.server 8765
# 访问 http://localhost:8765

# 方法二：Node.js
node server.js
# 访问 http://localhost:8765
```

## 项目结构

```
neetwork/
├── index.html          # 主页面（~180KB，主框架 + CSS + JS）
├── data/               # 协议数据文件（按需动态加载）
│   ├── tcp3.js         # TCP 三次握手
│   ├── tcp4.js         # TCP 四次挥手
│   ├── http.js         # HTTP 请求响应
│   ├── tls.js          # TLS 1.3 握手
│   ├── dns.js          # DNS 解析
│   ├── udp.js          # UDP 数据报
│   ├── arp.js          # ARP 地址解析
│   ├── icmp.js         # ICMP / Ping
│   ├── dhcp.js         # DHCP（DORA）
│   ├── smtp.js         # SMTP 邮件发送
│   ├── websocket.js    # WebSocket
│   └── ssh.js          # SSH 安全登录
├── server.js           # 本地开发服务器（Node.js）
└── README.md
```

## 部署到 GitHub Pages

1. Fork 或 Clone 本仓库
2. 进入仓库 Settings → Pages
3. Source 选择 `main` 分支，根目录 `/`，点击 Save
4. 等待约 1 分钟，访问 `https://<你的用户名>.github.io/neetwork/`

> GitHub Pages 是标准 HTTP 服务器，动态加载完全正常。

## 技术栈

纯 HTML + CSS + JavaScript，**零依赖，零构建工具**，任何静态托管均可部署。

- 协议数据拆分为独立 JS 文件，主 HTML 仅 180KB
- 支持按需加载（点击协议时动态加载对应数据）
- 页面空闲时预加载常用协议，提升响应速度

## 截图预览

| 首页 | 协议库 | TCP 播放器 |
|------|--------|------------|
| 暗色科技风 Hero | 搜索+筛选 | 步进控制+字段解析+思考题 |

---

> 欢迎 Star ⭐ 和提 Issue

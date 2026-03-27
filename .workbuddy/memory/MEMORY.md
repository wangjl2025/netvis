# MEMORY.md — 长期记忆

## 项目：NetVis 网络协议可视化平台

**定位**：中文 · 步进交互 · 深度教学，做"深而精的教学工具"，不做"大而全的模拟器"
**目标用户**：计算机/网工专业学生、自学开发者、初中级网络工程师
**用户信息**：网络专业学生，正在起步阶段

## 部署与仓库
- GitHub 仓库：https://github.com/wangjl2025/netvis
- GitHub Pages：https://wangjl2025.github.io/netvis/
- 本地调试：`node server.js`（端口 8766）
- 邮箱：wangaihau@qq.com

## 文件结构约定
- `index.html`（主框架，~210KB，**警戒线 280KB**）+ `styles.css`（源）+ `styles.min.css`（实际加载）
- `data/`（20个协议 JS，懒加载）+ `modules/`（6个功能模块）
- **约定**：新功能全部拆成 `modules/*.js`，不内联主文件；不引入 React/Vue/Chart.js/Webpack
- **⚠️ 关键**：页面实际加载 `styles.min.css`（preload + link），改 `styles.css` 后**必须**重新压缩同步

## 已完成协议（20个）
- 应用层：DNS、HTTP、TLS、DHCP、WebSocket、SMTP、SSH、FTP、HTTP/2、QUIC/HTTP3
- 传输层：TCP三次握手、TCP四次挥手、UDP、TCP拥塞控制
- 网络层：ICMP/Ping、NAT地址转换、IP路由转发、OSPF
- 数据链路层：ARP、VLAN

## 已完成功能模块
- 步进式飞行动画、键盘快捷键（← → Space 1~9 Esc ?）
- DNS 递归/迭代双模式、NAT SNAT/DNAT 双模式
- 对比视图（TCP/UDP、HTTP/HTTPS、DNS递归/迭代、FTP主动/被动）—— COMPARE_REGISTRY 通用架构
- 徽章/进度系统（localStorage，TOTAL=20）
- 错误演练模式（drill.js）、速记卡（flashcard.js）、抓包对照（capture.js，19协议）
- 学习路径推荐（learning.js）、分享海报（share.js）
- PWA 离线支持（sw.js + manifest.json）
- SEO 优化（title/meta/OG/JSON-LD/sitemap.xml/robots.txt）
- 移动端适配、系统字体栈（零外部请求）

## 多模式协议架构
- DNS：`dns`（递归）+ `dns-iter`（迭代），切换条 `dnsModeBar`，`_dnsMode` 变量
- NAT：`nat`（SNAT）+ `nat-dnat`（DNAT），切换条 `natModeBar`，`_natMode` 变量
- `effectivePid` 在 `rebuildSidePanel()` 和 `renderStep()` 两处都要更新

## TCP拥塞控制架构要点
- 专属画布 `#congestionDiagram`，canvasMap 映射 `tcpcong → congestionDiagram`
- renderStep() 头部特判：`if (activeProtocol === 'tcpcong') { renderCongestionChart(currentStep); return; }`
- SVG 坐标系：PAD_L=44, W=520, H=200；13个 chartPoints 数据点；stepHighlight 数组控制高亮

## 产品扩展方向
- **华为认证模块** — 强烈推荐，目标用户高度契合，技术实现难度可控
- **网络安全模块** — 谨慎推荐，定位"安全教育"而非"黑客工具"

## 6周路线图（均已完成）
Week1: 协议层级地图+徽章 | Week2: 分享海报+NAT双模式 | Week3: 错误演练+TCP拥塞
Week4: 对比视图+IP路由 | Week5: 速记卡+SEO | Week6: 性能优化+抓包对照

---

## ⚠️ 开发前必读：历史错误清单（26条）

> **每次开发新功能前必须过一遍！**

### 【CSS 类】

**① styles.css 改了不等于生效**
- 页面加载 `styles.min.css`，每次改 `styles.css` 后必须重新压缩同步
- 压缩：`python -c "import re; css=open('styles.css').read(); css=re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL); css=re.sub(r'\s+', ' ', css); css=re.sub(r'\s*([{};:,>~+])\s*', r'\1', css); open('styles.min.css','w').write(css.strip())"`

**② CSS 里写 `display:none` 被 JS 清空后仍隐藏**
- `el.style.display = ''` 清空 inline style 后，CSS 规则接管，元素仍隐藏
- 正确：初始隐藏只写 HTML inline style；JS 显示时明确设 `el.style.display = 'flex'`

**③ CSS 大括号没配对，静默破坏后续所有规则**

**④ 新增颜色类必须同时加到 styles.css 和 styles.min.css**
- 已有：`packet-label-blue / purple / cyan / green`

---

### 【JS 对象字面量】

**⑤ replace_in_file 匹配错位会破坏整个 JS 对象**
- 全站崩溃无响应，**必做**：修改 JS 对象后验证语法
- `node -e "eval(require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1])"`

**⑥ JS 对象里禁止重复 key**
- 追加新协议后 grep 检查是否有重复

---

### 【协议数据文件格式】

**⑦ stepData 字段名必须对齐规范**（参照 `data/ssh.js`）
- `bannerText` → `banner`
- `clientStateId: 'xxx'` → `leftState`（值为显示文字，不是元素 ID）
- `serverStateId: 'xxx'` → `rightState`
- `fields[].val` → `fields[].value`
- `fields[].body` → `fields[].desc`（⑰ 同类错误）

**⑧ 新协议必须有 `rows` 数组，且数量 = steps 数量**
- 格式：`{ dir: 'c2s'|'s2c', color: 'packet-label-blue/purple/cyan/green', label: '...' }`

**⑨ 文件名 / protocolDB key / 预加载列表 三者必须一致**
- 任意一个不一致 → 404 无响应

**⑱ knowledge 条数必须 ≥ steps 条数**
- `knowledge[currentStep - 1]` 越界取到 undefined，历史上 7 个协议都犯过

---

### 【注册点遗漏】

**⑩ 新协议有 8 个注册点，一个都不能漏**

| 注册点 | 位置 |
|--------|------|
| 卡片激活（coming-soon → 可点击） | index.html |
| preloadAll 预加载列表 | index.html |
| PROTO_META（节点名/图标/颜色） | index.html |
| searchIndex 搜索索引 | index.html |
| badge.js TOTAL +1 | modules/badge.js |
| badge.js PROTO_INFO | modules/badge.js |
| capture.js 抓包报文 | modules/capture.js |
| learning.js 难度/前置依赖 | modules/learning.js |
| sitemap.xml URL 条目 | sitemap.xml |

---

### 【画布与布局】

**⑪ 专属画布不要用 `canvas-inner` 做容器**（高度不稳定）
- 用 `position:absolute; inset:0` 贴满父容器；tcpcong 踩过三轮

**⑫ SVG 在 flex 容器里 `height:auto` 会折叠为 0**
- 必须给父容器设 `min-height` 或 SVG 设固定 `height`

**⑬ `canvas-inner` 的 `align-items:center` 会压缩子元素宽度**
- 专属画布需覆盖：`align-items:stretch; justify-content:flex-start`

**⑭ genericDiagram 行数固定 1~16，多余行必须在 switchProtocol 里隐藏**

---

### 【事件绑定与 DOM】

**⑮ 事件绑定必须在 `DOMContentLoaded` 内**

**⑯ HTML 元素必须有 `id`，JS 才能找到它**

---

### 【硬编码与状态重置】

**⑲ 展示文字不能硬编码**，切协议不更新；一律加 `id`，在 `switchProtocol` 里更新

**⑳ 旁白框、模态框切协议时必须隐藏或重置**

---

### 【跳转逻辑】

**㉑ 协议卡片 onclick 必须用 `openProtocol(pid)`**，不能只用 `showPage`

**㉒ gotoStep 里变量名用 `activeProtocol`，不是 `currentProto`**

---

### 【多协议同步更新】

**㉓ 改协议总数时，SEO meta / JSON-LD / stats-bar 数字全部同步**
- 改完后全局 grep 确认没有遗漏

**㉔ 没有 `abnormal` 数据的协议，隐藏异常场景按钮**

---

### 【流程纪律】

**㉕ 每次迭代前备份**：`robocopy . backup-YYYYMMDD-HHMM /E /COPYALL`

**㉖ 每次修改 JS 对象字面量后必须验证语法**（见⑤）

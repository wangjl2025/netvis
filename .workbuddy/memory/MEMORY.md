# MEMORY.md — 长期记忆

## 项目：网络协议可视化网站/App

**项目背景**（2026-03-25）
- 用户是网络专业学生，想做一个网络协议可视化动画的网站/App
- 市场缺口真实：目前无系统化、交互式的协议动画产品
- 竞品：Cisco Packet Tracer（太重）、YouTube视频（不交互）——真正的交互步进式产品几乎没有

**产品定位**
- 交互式、可步进的网络协议动画学习平台
- 目标用户：计算机/网工专业学生、自学开发者、初中级网络工程师、高校/培训机构

**技术选型共识**
- 前端：Next.js 15 + Tailwind CSS + shadcn/ui + TypeScript
- 动画引擎：GSAP（步进时间线）+ React Flow（拓扑图）+ Framer Motion（UI动效）
- 后端：Supabase（数据库+Auth）+ Vercel（部署）
- 动画数据结构：JSON脚本化描述（协议步骤 + 动画指令 + 状态变化），内容与渲染分离

**MVP计划**
- 优先做 TCP三次握手/四次挥手、HTTP请求响应、HTTPS/TLS握手、DNS解析
- MVP目标：一个能传播的爆款单页，发到知乎/掘金/V2EX/B站验证需求
- 预计周期：4周完成MVP并发布

## 竞品调研核心结论（2026-03-25）

**直接竞品**
- ChatTCP（chattcp.com）：最强直接竞品，仅有TCP一个协议，无步进控制；国内小团队运营
- 传输层可视化模拟器（zym9863.github.io）：个人开源项目，仅TCP，无步进，UI粗糙，无持续运营
- Networking Animations（dabh.github.io）：2021年停更，内容极少，已死亡

**间接竞品**
- Cisco Packet Tracer：功能强但太重，是设备模拟器而非协议学习工具
- 国内MOOC平台：被动视频，无交互，可考虑合作

**参考标杆**
- VisuAlgo（visualgo.net）：算法可视化领域的成功案例，有步进控制+伪代码高亮+系统覆盖，被全球高校采用——网络协议领域完全没有对应产品
- HowDNS.works：漫画式讲解DNS，证明有趣的协议内容能持续传播；但无动画交互
- ByteByteGo：静态图解即有50万+订阅，动态交互版天花板更高

**核心机会**：中文+系统多协议+步进交互+面向学习+持续运营——同时满足这些条件的产品几乎为零

## UI原型进度（最后更新 2026-03-26 00:35）

**文件结构（已拆分 + 已修复）**：
- `index.html`（主框架，183KB）+ `data/` 目录（12 个协议 JS，共 108KB）
- 本地调试需 HTTP 服务器：`python -m http.server 8766 --directory .` 或 `node server.js`
- GitHub Pages 部署后动态加载完全正常

**已修复的 Bug（2026-03-26 01:00）**：
1. `rebuildStepData()` 未写入 `protocolDB['tcp3']` → 在函数末尾添加了直接赋值
2. `data/tcp3.js` 引用了主 HTML 变量（不可独立加载）→ 改为占位符，tcp3 由主 HTML 函数生成
3. `PROTO_META` 缺少 `ssh` 条目 → 已补充 ssh 的 nodes 配置
4. `openProtocol` 懒加载守卫对 tcp3 也触发加载 → 修复为 tcp3 不走动态加载
5. `switchProtocol`（tab 切换）没有懒加载守卫 → 添加了懒加载守卫
6. `preloadAll` 预热列表包含 tcp3 → 移除 tcp3，改为只预热其他11个协议
7. `rebuildSidePanel` 清空 `#tab-steps` 时把 `knowledgeBlock`/`quizBlock` 也删掉了 → 将步骤卡包裹在 `#steps-list` 子容器，rebuildSidePanel 只清空该子容器，知识点/思考题不受影响

**架构说明**：
- 「自定义参数」（ISN 输入框）只在 tcp3 显示，这是**设计意图**，不是 bug：该功能是 TCP 三次握手的专属教学增强
- `#tab-steps` 的结构：`#steps-list`（步骤卡，rebuildSidePanel 管）+ `#knowledgeBlock`（知识点，renderStep 管）+ `#quizBlock`（思考题，renderStep 管）

**已完成的全部功能**：
- TCP 三次握手：完整（3步 + 三层教学增强 + 自定义ISN + 异常场景 + TCP vs UDP）
- TCP 四次挥手：完整（4步 + 字段表 + 旁白 + 4道思考题）
- HTTP 请求响应：完整（5步 + 字段表 + 旁白 + 5道思考题）
- TLS 1.3 握手：完整（4步 + 字段表 + 旁白 + 4道思考题）
- DNS 解析：完整（8步 + 字段表 + 旁白 + 5道思考题）
- **UDP 数据报：完整（4步 + 字段表 + 旁白 + 4道思考题）** ← 2026-03-25新增
- **ARP 地址解析：完整（5步 + 字段表 + 旁白 + 5道思考题）** ← 2026-03-25新增
- **ICMP / Ping：完整（5步 + Traceroute原理 + 5道思考题）** ← 2026-03-25新增
- **DHCP（DORA）：完整（4步 + 租约续约机制 + 4道思考题）** ← 2026-03-25新增
- **SMTP：完整（6步 + STARTTLS + SPF/DKIM/DMARC + 4道思考题）** ← 2026-03-26新增
- **WebSocket：完整（5步 + 帧格式 + 全双工原理 + 4道思考题）** ← 2026-03-26新增
- **SSH：完整（6步 + DH密钥交换 + PFS + 端口转发 + 4道思考题）** ← 2026-03-26新增

**通用画布架构（已建立）**：
- `genericDiagram`：共用 HTML 画布（支持最多16行，id=gen-row-1~16）
- PROTO_META 里 `nodes` 字段控制节点文字/图标
- protocolDB 里 `rows` 字段初始化箭头方向和标签
- stepData 使用 `banner`/`leftState`/`rightState`/`fields` 字段名（已兼容旧格式）
- steps 使用 `{title, emoji}` 格式（已兼容旧的 `{title, desc, packet}` 格式）
- quiz 使用 `{q, options, answer, exp}` 格式（已兼容旧的 `{q, a}` HTML格式）

**待开发（剩余10个）**：NAT、VLAN、FTP、IP路由、TCP拥塞控制、HTTP/2、QUIC/HTTP3、OSPF、BGP（共10个）

## 动画升级进度（2026-03-26）

**MVP 方向一：数据包飞行动画** ✅ 已完成
- 将旧的「无限循环粒子动画」(.packet-dot) 替换为「步进触发式飞行动画」(.packet-fly)
- 每次切换步骤，当前激活行的箭头上出现一个小球从发送方飞向接收方（0.72s，cubic-bezier缓动）
- 飞行结束后目标节点闪光（node-pulse 动画，蓝色/紫色根据方向）
- 切换协议时第一步也触发动画（通过 _forceAnim 标志控制）
- 向右（c2s）蓝色，向左（s2c）紫色，青色包用 .fly-cyan 修饰类
- 所有12个协议（tcp3/tcp4/http/tls/dns/udp/arp/icmp/dhcp/smtp/websocket/ssh）均生效

**约定：每次迭代前必须备份** → backup-YYYYMMDD-HHMM/ 目录

## 架构分析（2026-03-26）

**当前架构**：单体 index.html（183KB）+ data/ 懒加载（104KB，12个协议JS）
- CSS 1433行（37%）/ HTML 1215行（32%）/ JS ~1134行（29%）
- 28个全局函数，零外部框架依赖
- 唯一外部依赖：Google Fonts → 已替换为系统字体栈

**字体方案（已替换）**：
- `--font-sans`: Inter → Segoe UI → SF Pro Display → PingFang SC → Microsoft YaHei UI → system-ui
- `--font-mono`: JetBrains Mono → Fira Code → Cascadia Code → Consolas → Monaco → monospace
- 零外部网络请求，国内用户首屏速度提升约 1~3 秒

**架构调优结论**：
- MVP 阶段无需重构，现有架构已满足需求
- 正式版再考虑：CSS 拆分（减少 index.html 体积）、JS 命名空间模块化、Service Worker 离线缓存

## 部署计划（2026-03-25）
- 已准备 index.html + README.md，可直接上传 GitHub
- 部署方案：GitHub Pages（免费，零备案）
- 上线后计划发知乎/掘金做传播验证
- 竞品最强者：EM Notebook（elecmonkey.com），协议覆盖广但UI学术风、无推导/思考题
- ChatTCP（chattcp.com）仅TCP，功能与当前原型持平

## 产品路线图（2026-03-26 确定）

**定位**：中文 · 步进交互 · 深度教学 的网络协议可视化平台，做"深而精的教学工具"，不做"大而全的模拟器"

**Phase 1（近期 2~3周）**：教学深度升级
- DNS 5节点层级拓扑（优先级最高，教育价值大）
- 协议对比视图（TCP vs UDP 等，竞品全无）
- 异常场景扩展（TCP四次挥手、TLS、DNS、HTTP）
- 键盘快捷键（← → Space 1~9 Esc）

**Phase 2（2周）**：用户体验打磨
- 学习路径地图（协议按层次展示，有完成感）
- 分享单步截图（带水印，适合知乎/掘金）
- 移动端适配优化

**Phase 3（3~4周）**：内容扩充
- 新增10个协议（优先：NAT、TCP拥塞控制）
- TCP 拥塞控制专题页（cwnd 折线图动画）

**Phase 4（4周）**：产品化
- localStorage 学习进度记录
- iframe 嵌入模式
- SEO 独立 URL 路由

**立刻可以开始的**：DNS 5节点拓扑 → 协议对比视图 → 键盘快捷键

## Phase 1 完成进度（2026-03-26）

✅ DNS 飞行动画升级：launchPacketDns + pulseDnsNode，数据包在5节点间正确飞行
✅ 键盘快捷键完整版：← → ↑ ↓ 切步骤 / Space 播放 / 1~9 直跳步 / Esc 关闭 / ? 显示帮助
✅ 协议对比视图（TCP vs UDP）：protocol-switcher 新增"⚔️ TCP vs UDP"按钮，compareCanvas 画布，左右双栏同步步进 + 差异对比面板 + 步骤描述
- 对比视图数据：COMPARE_STEPS_TCP_UDP（3步）+ COMPARE_DIFF_TCP_UDP（6维度）
- _compareInitialized 标志防止重复初始化
- 对比视图随 switchProtocol 正确显示/隐藏
✅ **DNS 迭代查询模式**（2026-03-26 14:40）：
- dnsCanvas 顶部新增模式切换条：🔄 递归查询 / 🔁 迭代查询
- data/dns.js 末尾追加 protocolDB['dns-iter']（7步 + lanes配置 + stepData + narration）
- switchDnsMode() 动态重建泳道 HTML（rebuildDnsIterLanes/rebuildDnsRecursiveLanes）
- renderStep() / rebuildSidePanel() 均感知 _dnsMode，迭代模式走 dns-iter 数据
- 切换协议时自动重置 _dnsMode = 'recursive'
- **Bug 修复（2026-03-26 14:50）**：
  1. switchDnsMode 重写为同步优先：protocolDB['dns-iter'] 存在时直接同步执行，不用 Promise.then
  2. launchPacketDns 用 data-from/data-to 属性确定目标节点（支持跨多段箭头，如步骤7节点4→0）
  3. rebuildDnsIterLanes 给每个 row div 加 data-from/data-to 属性
  4. renderStep 里补充迭代模式旁白：从 lanes[stepIndex].narration 获取
  5. 移除 switchDnsMode 的重复点击守卫（允许重复点击重置到第1步）
- **Bug 修复（2026-03-26 15:07）**：5个节点卡片状态不更新
  - 根因：dns-iter stepData 里用的是 activeNodes 字段，但 renderStep 只处理 clientStateId/serverStateId（TCP/HTTP 格式），没有处理 DNS 5节点
  - 修复：①dns-iter 每步 stepData 补充 nodeStates 数组（5项，各含 text/cls）②renderStep 添加 nodeStates 处理块（dns-node-0~4）③switchDnsMode 递归分支加 _resetDnsNodes 重置（防状态残留）

- **Bug 修复（2026-03-26 15:28）**：DNS 迭代模式节点名称未切换
  - 问题：迭代查询模式下第2个节点卡片名称仍显示"递归解析器"，应改为"迭代解析器"
  - 修复：在 `_applyDnsMode` 前新增 `_updateDnsNodeLabels(modeKey)` 函数，切换模式时同步更新5个节点卡片的 name/sub/icon
  - DNS_NODE_LABELS 配置：recursive（递归解析器🔄）vs iterative（迭代解析器🔁）

**待做（Phase 1 剩余）**：TLS/HTTP/DNS/TCP4 异常场景扩展

## 用户信息
- 网络专业学生，正在起步阶段探索项目方向

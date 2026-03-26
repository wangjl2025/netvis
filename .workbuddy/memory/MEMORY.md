# MEMORY.md — 长期记忆

## 项目：NetVis 网络协议可视化平台

**定位**：中文 · 步进交互 · 深度教学的网络协议可视化平台，做"深而精的教学工具"，不做"大而全的模拟器"
**目标用户**：计算机/网工专业学生、自学开发者、初中级网络工程师
**核心机会**：中文+系统多协议+步进交互+面向学习+持续运营——同时满足这些条件的产品几乎为零

## 部署与仓库
- GitHub 仓库：https://github.com/wangjl2025/netvis
- GitHub Pages：https://wangjl2025.github.io/netvis/
- 本地调试：`python -m http.server 8766 --directory .` 或 `node server.js`
- 邮箱：wangaihau@qq.com

## 文件结构
- `index.html`（主框架，~224KB，警戒线280KB）+ `data/`（12个协议JS，懒加载）
- `modules/badge.js`：进度/徽章系统，页面加载后500ms异步挂载
- **约定**：新功能全部拆成 `modules/*.js`，不内联主文件；不引入 React/Vue/Chart.js/Webpack

## 已完成协议（15个）
- 应用层：DNS、HTTP、TLS、DHCP、WebSocket、SMTP、SSH
- 传输层：TCP三次握手、TCP四次挥手、UDP、TCP拥塞控制
- 网络层：ICMP/Ping、NAT地址转换、**IP路由转发**（Week4新增）
- 数据链路层：ARP

## 已完成功能（截至 2026-03-27）
- ✅ 步进式飞行动画（.packet-fly，切步骤触发）
- ✅ 键盘快捷键（← → Space 1~9 Esc ? 全套）
- ✅ DNS递归/迭代查询双模式切换
- ✅ TCP vs UDP 对比视图（compareCanvas，6维度差异面板）
- ✅ 协议库页四层分组展示（应用/传输/网络/数据链路层）
- ✅ 徽章/进度系统（localStorage，走完最后一步解锁，TOTAL=15）
- ✅ 移动端适配（960px堆叠，640px压缩，横向滚动）
- ✅ 系统字体栈（零外部网络请求）
- ✅ **分享海报功能**（modules/share.js，html2canvas按需CDN加载，截图+水印+下载）
- ✅ **NAT 双模式**：SNAT（出口NAT）+ DNAT（端口转发），模式切换条复用 dns-mode-bar CSS
- ✅ **关于/反馈弹窗**：footer 两个链接点击弹出 info-modal-backdrop 弹窗
- ✅ **TCP拥塞控制**（tcpcong）：专属 SVG cwnd 折线图画布，6步步进
- ✅ **错误演练模式**（modules/drill.js）：从所有协议 quiz 自动收题，随机出题，选择题+问答题，得分统计，百分制评级；协议库页「🎯 错误演练」按钮；player顶栏「🎯 演练」按钮；懒加载1800ms
- ✅ **IP路由转发**（iproute）：6步步进（最长前缀匹配/TTL/逐跳封帧），场景192.168.1.10→10.0.3.5经R1→R2两跳

## TCP拥塞控制架构要点
- 专属画布 `#congestionDiagram`，不用通用 genericDiagram
- canvasMap 映射：`tcpcong → congestionDiagram`
- renderStep() 头部特判：`if (activeProtocol === 'tcpcong') { renderCongestionChart(currentStep); return; }`
- SVG 坐标系：PAD_L=44, W=520, H=200；toSvgX/toSvgY 函数转换
- chartPoints 数组定义 13 个数据点（x=RTT轮次, y=cwnd MSS, phase=阶段）
- stepHighlight 数组：每步高亮到哪个点（0-based index）
- **⚠️ 重要踩坑**：数据文件名必须和 protocolDB key 一致！`openProtocol('tcpcong')` 调用 `loadProtocolData('tcpcong')` 会加载 `data/tcpcong.js`；如果文件名写成 `congestion.js`，点击时会 404 失败无响应。正确做法：文件名 = `data/tcpcong.js`，数据 key = `protocolDB['tcpcong']`，预加载列表 = `'tcpcong'`，三者统一
- **⚠️ CSS display:none 覆盖 JS**：在 CSS 里给专属元素（如 `#congestionDiagram`）写 `display:none` 是危险的！JS 用 `el.style.display = ''` 清除 inline style 后，CSS 规则会接管，元素仍然隐藏。正确做法：只在 HTML inline style 里写 `display:none` 作为初始值；JS 显示时对 canvas-inner 类元素明确设 `display='flex'`
- **⚠️ 专属画布布局方案**：`congestionDiagram` 等专属画布，不要用 `canvas-inner`（`height:100%` 在 flex 链里不稳定），而应用 `position:absolute; inset:0`（贴满父容器），JS 控制 `display:flex/none`，这是最可靠的方案

## 多模式协议架构（规律）
- DNS：`dns`（递归）+ `dns-iter`（迭代），切换条 `dnsModeBar`，`_dnsMode` 变量，`switchDnsMode()` 函数
- NAT：`nat`（SNAT）+ `nat-dnat`（DNAT/端口转发），切换条 `natModeBar`，`_natMode` 变量，`switchNatMode()` 函数
- 共用模式：`effectivePid` 在 `rebuildSidePanel()` 和 `renderStep()` 两处都要更新；切换协议时在 `switchProtocol()` 里控制模式条显隐

## 待开发协议（10个）
NAT、VLAN、FTP、IP路由、TCP拥塞控制、HTTP/2、QUIC/HTTP3、OSPF、BGP

## 6周产品路线图
- **Week1**（本周）：首页协议层级地图 + 徽章进度系统 ✅ 完成
- **Week2**：分享海报 + NAT协议 + NAT双模式（SNAT+DNAT）✅ 完成
- **Week3**：错误演练模式 + TCP拥塞控制 ✅ 完成
- **Week4**：对比视图扩展 + IP路由 ✅ IP路由完成；对比视图扩展待做
- **Week5**：速记卡 + SEO优化
- **Week6**：性能审计 + 抓包对照模式初版

## 关键架构规则
- `nth-of-type` 是按标签类型（div）计数，不是按类名——筛选/选择卡片应用 `data-proto` 属性直接映射
- CSS 游离大括号会破坏后续所有规则解析——每次写 CSS 片段要检查大括号是否配对
- `filter-tag` 事件绑定必须在 `DOMContentLoaded` 内执行，不能在顶层脚本里直接绑
- 每次迭代前必须备份：`backup-YYYYMMDD-HHMM/` 目录

## 用户信息
- 网络专业学生，正在起步阶段

## 产品扩展方向
**华为认证模块** - 强烈推荐,目标用户高度契合,技术实现难度可控
**网络安全模块** - 谨慎推荐,强调"防御优先",定位"安全教育"而非"黑客工具"

# NetViz 架构文档

**版本**：1.1  
**最后更新**：2026-03-27  
**维护者**：QClaw 小助手

---

## 📐 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    用户浏览器                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  index.html (~260KB，警戒线 280KB)                   │   │
│  │  ├─ HTML 结构 (协议库卡片、播放器、侧边栏)          │   │
│  │  ├─ CSS 设计令牌系统 (颜色、字体、动画)             │   │
│  │  └─ JS 核心逻辑 (交互、渲染、状态管理)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  data/ (16 个协议文件，按需动态加载)                │   │
│  │  ├─ tcp3.js   (TCP 三次握手，stepData 动态生成)     │   │
│  │  ├─ tcp4.js   (TCP 四次挥手)                        │   │
│  │  ├─ http.js   (HTTP/1.1)                            │   │
│  │  ├─ tls.js    (TLS 1.3)                             │   │
│  │  ├─ dns.js    (DNS 递归查询)                        │   │
│  │  ├─ dns-iter.js (DNS 迭代查询)                      │   │
│  │  ├─ udp.js    (UDP 数据报)                          │   │
│  │  ├─ arp.js    (ARP 地址解析)                        │   │
│  │  ├─ icmp.js   (ICMP/Ping)                           │   │
│  │  ├─ dhcp.js   (DHCP)                                │   │
│  │  ├─ smtp.js   (SMTP 邮件)                           │   │
│  │  ├─ websocket.js (WebSocket)                        │   │
│  │  ├─ ssh.js    (SSH 安全登录)                        │   │
│  │  ├─ nat.js    (NAT SNAT 出口转换)                   │   │
│  │  ├─ nat-dnat.js (NAT DNAT 端口转发)                 │   │
│  │  ├─ tcpcong.js (TCP 拥塞控制，含 SVG cwnd 图表)     │   │
│  │  └─ iproute.js (IP 路由转发，最长前缀匹配)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  modules/ (功能模块，异步挂载)                       │   │
│  │  ├─ badge.js  (进度徽章系统，500ms 后加载)          │   │
│  │  ├─ share.js  (分享海报，1200ms 后加载)             │   │
│  │  └─ drill.js  (错误演练模式，1800ms 后加载)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 核心模块说明

### 1. **index.html — 主框架**

#### 文件结构
```
index.html (224KB)
├─ <head>
│  ├─ 元数据 (charset, viewport, title)
│  ├─ 设计令牌系统 (CSS 变量)
│  ├─ 全局样式 (reset, layout, animation)
│  └─ 协议数据初始化 (window.protocolDB)
│
├─ <body>
│  ├─ 导航栏 (#navbar)
│  ├─ 首页 (#home-page)
│  │  ├─ Hero 区域
│  │  ├─ 协议库卡片网格
│  │  └─ 分类筛选
│  │
│  ├─ 播放器页面 (#player-page)
│  │  ├─ 进度条 (#progress-bar)
│  │  ├─ 画布区域 (#canvas-container)
│  │  │  ├─ 通用画布 (#genericDiagram)
│  │  │  ├─ TCP 拥塞控制画布 (#congestionDiagram)
│  │  │  └─ 其他专属画布
│  │  ├─ 侧边栏 (#side-panel)
│  │  │  ├─ 字段面板 (#fields-panel)
│  │  │  ├─ 知识点面板 (#knowledge-panel)
│  │  │  └─ 思考题面板 (#quiz-panel)
│  │  ├─ 底部旁白框 (#step-narration)
│  │  └─ 控制条 (#control-bar)
│  │
│  ├─ 模态框
│  │  ├─ 关于弹窗 (#info-modal-backdrop)
│  │  ├─ 反馈弹窗
│  │  └─ 其他弹窗
│  │
│  └─ <script>
│     ├─ 全局变量和常量
│     ├─ 核心函数
│     │  ├─ loadProtocolData(protocolId)
│     │  ├─ openProtocol(protocolId)
│     │  ├─ switchProtocol(protocolId)
│     │  ├─ renderStep(stepIndex)
│     │  ├─ rebuildSidePanel()
│     │  ├─ rebuildStepData()
│     │  ├─ renderCongestionChart(stepIndex)
│     │  └─ 其他渲染函数
│     │
│     ├─ 事件监听
│     │  ├─ 键盘快捷键 (← → Space 1~9 Esc ?)
│     │  ├─ 卡片点击
│     │  ├─ 筛选标签点击
│     │  └─ 控制按钮点击
│     │
│     └─ 初始化代码 (DOMContentLoaded)
```

#### 关键变量
```javascript
// 全局状态
window.protocolDB = {}              // 协议数据库
window.activeProtocol = 'tcp3'      // 当前协议
window.currentStep = 0              // 当前步骤
window._dnsMode = 'recursive'       // DNS 模式（递归/迭代）
window._natMode = 'snat'            // NAT 模式（SNAT/DNAT）

// 缓存
window.loadedProtocols = {}         // 已加载的协议
window.preloadedProtocols = [...]   // 预加载列表

// 徽章系统
window.badgeState = {}              // 徽章状态（localStorage）
```

#### 关键函数

##### loadProtocolData(protocolId)
```javascript
/**
 * 动态加载协议数据文件
 * @param {string} protocolId - 协议 ID (如 'tcp3', 'dns')
 * @returns {Promise} 加载完成后的 Promise
 * 
 * 流程：
 * 1. 检查 loadedProtocols 缓存
 * 2. 如果已加载，直接返回
 * 3. 否则，创建 <script> 标签加载 data/{protocolId}.js
 * 4. 脚本加载完成后，protocolDB[protocolId] 会被填充
 * 5. 标记为已加载，返回 Promise
 */
```

##### openProtocol(protocolId)
```javascript
/**
 * 打开协议播放器
 * @param {string} protocolId - 协议 ID
 * 
 * 流程：
 * 1. 隐藏首页，显示播放器页面
 * 2. 调用 loadProtocolData() 加载数据
 * 3. 调用 switchProtocol() 初始化播放器
 * 4. 调用 renderStep(0) 渲染第一步
 */
```

##### switchProtocol(protocolId)
```javascript
/**
 * 切换协议（播放器内部）
 * @param {string} protocolId - 新协议 ID
 * 
 * 流程：
 * 1. 更新 activeProtocol
 * 2. 重置 currentStep = 0
 * 3. 调用 rebuildStepData() 重建步骤数据
 * 4. 更新 UI（进度条、协议名、模式条等）
 * 5. 调用 renderStep(0) 渲染第一步
 * 
 * 特殊处理：
 * - DNS：显示/隐藏 dnsModeBar，初始化 _dnsMode
 * - NAT：显示/隐藏 natModeBar，初始化 _natMode
 * - TCP 拥塞控制：隐藏 stepNarration，显示 congestionDiagram
 */
```

##### renderStep(stepIndex)
```javascript
/**
 * 渲染指定步骤
 * @param {number} stepIndex - 步骤索引（0-based）
 * 
 * 流程：
 * 1. 获取 protocolDB[activeProtocol].stepData[stepIndex]
 * 2. 特判：如果是 tcpcong，调用 renderCongestionChart()，然后返回
 * 3. 否则，调用通用渲染逻辑：
 *    - 更新画布（genericDiagram）
 *    - 更新侧边栏（字段、知识点、思考题）
 *    - 更新底部旁白
 *    - 更新进度条
 * 4. 触发飞行动画（.packet-fly）
 */
```

##### rebuildSidePanel()
```javascript
/**
 * 重建侧边栏（字段、知识点、思考题）
 * 
 * 流程：
 * 1. 获取当前步骤的 stepData
 * 2. 渲染字段面板（fields）
 * 3. 渲染知识点面板（knowledge）
 * 4. 渲染思考题面板（quiz）
 * 5. 绑定思考题展开/收起事件
 * 
 * 关键：
 * - 字段面板：显示 name、val、desc、derive
 * - 知识点面板：显示当前步骤对应的知识点（可能为空）
 * - 思考题面板：显示当前步骤对应的思考题（可能为空）
 */
```

##### rebuildStepData()
```javascript
/**
 * 重建步骤数据（主要用于 TCP 三次握手）
 * 
 * 流程：
 * 1. 获取 protocolDB[activeProtocol].steps
 * 2. 根据用户配置（初始序列号等）动态生成 stepData
 * 3. 计算 seq/ack 推导关系
 * 4. 填充 protocolDB[activeProtocol].stepData
 * 
 * 注意：
 * - 大多数协议的 stepData 是静态的（在 data/*.js 中定义）
 * - 只有 TCP 三次握手需要动态生成
 */
```

##### renderCongestionChart(stepIndex)
```javascript
/**
 * 渲染 TCP 拥塞控制图表
 * @param {number} stepIndex - 步骤索引
 * 
 * 流程：
 * 1. 获取 protocolDB['tcpcong'].chartPoints（13 个数据点）
 * 2. 根据 stepHighlight 确定当前步骤要高亮的点
 * 3. 在 SVG 画布上绘制折线图
 * 4. 标注阶段（慢启动、拥塞避免、快重传、快恢复）
 * 5. 更新侧边栏（字段、知识点、思考题）
 * 
 * 坐标系：
 * - X 轴：RTT 轮次（0~12）
 * - Y 轴：cwnd（拥塞窗口，单位 MSS）
 * - 转换函数：toSvgX()、toSvgY()
 */
```

---

### 2. **data/ — 协议数据文件**

#### 数据结构规范

```javascript
protocolDB['protocol_id'] = {
  // 基本信息
  name: '协议名称',
  category: 'application|transport|network|datalink',
  level: 'beginner|intermediate|advanced',
  
  // 步骤定义
  steps: [
    {
      title: '第 1 步：步骤标题',
      desc: '步骤描述文字',
      packet: '报文示意'
    },
    // ... 更多步骤
  ],
  
  // 步骤数据（渲染用）
  stepData: [
    {
      // 左侧客户端状态
      clientState: '状态文字',
      clientClass: 'state-xxx',
      clientStateId: 'node-id',
      
      // 右侧服务器状态
      serverState: '状态文字',
      serverClass: 'state-xxx',
      serverStateId: 'node-id',
      
      // 进度条
      activeRow: 1,
      bannerText: '🌐 第 1 / 8 步 — ...',
      bannerClass: '',
      
      // 字段面板
      fieldTitle: '字段标题',
      fields: [
        {
          name: '字段名',
          val: '字段值',
          desc: '字段描述',
          highlight: true,
          derive: '推导过程（可选）'
        },
        // ... 更多字段
      ],
      
      // 底部旁白
      narration: '旁白文字'
    },
    // ... 更多步骤数据
  ],
  
  // 知识点（与 stepData 一一对应）
  knowledge: [
    '知识点 1',
    '知识点 2',
    // ... 与 stepData 数量相同
  ],
  
  // 思考题（可少于 stepData）
  quiz: [
    {
      question: '问题文字',
      answer: '答案文字'
    },
    // ... 更多思考题
  ]
}
```

#### 关键约定

1. **文件名必须与 protocolDB key 一致**
   ```javascript
   // ✅ 正确
   // 文件：data/tcp3.js
   protocolDB['tcp3'] = { ... }
   
   // ❌ 错误
   // 文件：data/tcp3.js
   protocolDB['tcp_three_way'] = { ... }  // 不匹配！
   ```

2. **knowledge 数量必须与 stepData 数量相同**
   ```javascript
   stepData.length === knowledge.length  // 必须相等
   ```

3. **quiz 可以少于 stepData，但不能多于**
   ```javascript
   quiz.length <= stepData.length  // 必须满足
   ```

4. **字段描述必须使用 desc，不能用 body**
   ```javascript
   // ✅ 正确
   { name: 'AA 标志', val: '1', desc: '权威应答标志' }
   
   // ❌ 错误
   { name: 'AA 标志', val: '1', body: '权威应答标志' }  // renderStep 只读 desc
   ```

---

### 3. **modules/ — 功能模块**

#### modules/badge.js — 进度徽章系统

```javascript
/**
 * 徽章系统
 * 
 * 功能：
 * - 追踪用户完成进度
 * - 显示徽章和进度条
 * - 使用 localStorage 持久化
 * 
 * 数据结构：
 * {
 *   completed: {
 *     'tcp3': true,
 *     'dns': true,
 *     ...
 *   },
 *   totalProtocols: 14
 * }
 * 
 * 触发条件：
 * - 用户走完某个协议的最后一步时，自动解锁徽章
 * - 徽章显示在协议卡片上
 * - 进度条显示完成百分比
 */
```

#### modules/share.js — 分享海报功能

```javascript
/**
 * 分享海报
 * 
 * 功能：
 * - 生成当前步骤的截图
 * - 添加水印和分享信息
 * - 下载为 PNG 文件
 * 
 * 依赖：
 * - html2canvas（按需从 CDN 加载）
 * 
 * 流程：
 * 1. 用户点击分享按钮
 * 2. 动态加载 html2canvas
 * 3. 截图当前画布区域
 * 4. 添加水印（NetViz logo + 链接）
 * 5. 下载为 PNG
 */
```

#### modules/drill.js — 错误演练模式

```javascript
/**
 * 错误演练模式
 * 
 * 功能：
 * - 自动从所有协议的 quiz 数据收集题目（选择题 + 问答题）
 * - 随机打乱出题，逐题作答，统计得分
 * - 选择题：点选后立即高亮正解/错误答案 + 展示解析
 * - 问答题：展开答案后自评正确/错误
 * - 结果页：百分制评级（优秀/良好/及格/需加油）
 * 
 * 入口：
 * - 协议库页右上角「🎯 错误演练」按钮
 * - player 顶栏「🎯 演练」按钮（移动端隐藏）
 * 
 * 加载时机：
 * - 页面 load 后 1800ms 异步加载（最后加载，不影响首屏）
 * 
 * 全局暴露：
 * - window.DrillModule.open() — 打开演练弹窗
 */
```



### 设计令牌

```css
:root {
  /* 背景色阶 */
  --bg-0: #060912;        /* 最深底色 */
  --bg-1: #0b0f1e;        /* 主背景 */
  --bg-2: #0f1628;        /* 次背景 */
  --bg-card: #131b2e;     /* 卡片面 */
  
  /* 主色系（蓝） */
  --blue-500: #4f8ef7;
  --blue-glow: rgba(79,142,247,0.25);
  
  /* 文字色阶 */
  --text-0: #ffffff;      /* 主文字 */
  --text-1: #e8edf8;      /* 次文字 */
  --text-2: #a0aec0;      /* 辅助文字 */
  --text-3: #64748b;      /* 弱文字 */
  
  /* 字体 */
  --font-sans: 'Inter', 'Segoe UI', ...;
  --font-mono: 'JetBrains Mono', ...;
  
  /* 圆角 */
  --r-xs: 4px;
  --r-sm: 6px;
  --r-md: 10px;
  
  /* 动画 */
  --t-fast: 150ms;
  --t-normal: 250ms;
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
}
```

### 关键动画

```css
/* 飞行动画 */
@keyframes packet-fly {
  0% { opacity: 0; transform: translate(-20px, -20px); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translate(20px, 20px); }
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 渐入动画 */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## ⌨️ 键盘快捷键

| 快捷键 | 功能 | 备注 |
|--------|------|------|
| `←` | 上一步 | 播放器模式 |
| `→` | 下一步 | 播放器模式 |
| `Space` | 播放/暂停 | 播放器模式 |
| `1~9` | 跳转到第 N 步 | 播放器模式 |
| `Esc` | 返回首页 | 播放器模式 |
| `?` | 显示帮助 | 全局 |

---

## 🔄 多模式协议架构

### DNS 协议（递归 vs 迭代）

```javascript
// 模式切换
window._dnsMode = 'recursive';  // 或 'iterative'

// 切换函数
function switchDnsMode(mode) {
  _dnsMode = mode;
  rebuildStepData();
  renderStep(0);
}

// 在 renderStep() 中
if (activeProtocol === 'dns') {
  const effectivePid = _dnsMode === 'recursive' ? 'dns' : 'dns-iter';
  // 使用 effectivePid 加载对应的 stepData
}
```

### NAT 协议（SNAT vs DNAT）

```javascript
// 模式切换
window._natMode = 'snat';  // 或 'dnat'

// 切换函数
function switchNatMode(mode) {
  _natMode = mode;
  rebuildStepData();
  renderStep(0);
}

// 在 renderStep() 中
if (activeProtocol === 'nat') {
  const effectivePid = _natMode === 'snat' ? 'nat' : 'nat-dnat';
  // 使用 effectivePid 加载对应的 stepData
}
```

---

## 🐛 常见 Bug 和解决方案

### Bug 1：CSS display:none 覆盖 JS

**问题**：
```css
#congestionDiagram { display: none; }  /* ❌ 危险 */
```

```javascript
el.style.display = '';  // 清除 inline style，但 CSS 规则仍生效
```

**解决**：
```css
/* ✅ 只在 HTML inline style 中设置初始值 */
```

```html
<div id="congestionDiagram" style="display:none;">...</div>
```

```javascript
el.style.display = 'flex';  // 明确设置为 flex
```

### Bug 2：SVG height:auto 在 flex 中折叠

**问题**：
```css
svg { height: auto; }  /* ❌ 在 flex 中无法自动计算 */
```

**解决**：
```css
svg { 
  height: auto;
  min-height: 160px;  /* ✅ 添加最小高度 */
}
```

### Bug 3：绝对定位 vs flex 布局

**问题**：
```css
.canvas-inner {
  display: flex;
  height: 100%;  /* ❌ 在 flex 链中不稳定 */
}
```

**解决**：
```css
#congestionDiagram {
  position: absolute;
  inset: 0;  /* ✅ 贴满父容器 */
}
```

---

## 📊 性能优化建议

### 1. 按需加载
- ✅ 已实现：协议数据按需加载
- ✅ 已实现：模块异步加载
- 建议：分析热力图，优化预加载列表

### 2. 体积控制
- 当前：index.html 256KB（警戒线 280KB）
- 建议：审计 CSS，删除冗余规则
- 建议：考虑将大型 CSS 块拆分为 modules/

### 3. 渲染性能
- 建议：使用 Chrome DevTools Performance 审计
- 建议：检查 SVG 画布是否有过度重绘
- 建议：移动端长列表考虑虚拟滚动

---

## 🚀 扩展指南

### 添加新协议

1. **创建数据文件** `data/protocol_id.js`
   ```javascript
   protocolDB['protocol_id'] = {
     name: '协议名称',
     category: 'application',
     steps: [...],
     stepData: [...],
     knowledge: [...],
     quiz: [...]
   }
   ```

2. **更新协议库** `index.html`
   ```javascript
   const protocolLibrary = [
     { id: 'protocol_id', name: '协议名称', category: 'application' },
     // ...
   ]
   ```

3. **添加到预加载列表**（可选）
   ```javascript
   const preloadedProtocols = ['tcp3', 'dns', 'protocol_id', ...]
   ```

4. **测试**
   - 运行 `scripts/check_all.py` 验证数据结构
   - 在浏览器中测试所有步骤
   - 检查移动端适配

### 添加新功能模块

1. **创建文件** `modules/feature_name.js`
   ```javascript
   (function() {
     // 功能代码
     function init() {
       // 初始化逻辑
     }
     
     // 在 DOMContentLoaded 后调用
     if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', init);
     } else {
       init();
     }
   })();
   ```

2. **在 index.html 中加载**
   ```html
   <script src="modules/feature_name.js"></script>
   ```

3. **测试**
   - 检查是否正确加载
   - 检查是否与其他模块冲突

---

## 📚 相关文档

- [PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md) — 项目审查报告
- [QUICK_CLEANUP_CHECKLIST.md](./QUICK_CLEANUP_CHECKLIST.md) — 快速清理清单
- [README.md](./README.md) — 项目介绍
- [.workbuddy/MEMORY.md](./.workbuddy/MEMORY.md) — 项目记忆

---

**文档版本**：1.0  
**最后更新**：2026-03-27 00:10  
**维护者**：QClaw 小助手

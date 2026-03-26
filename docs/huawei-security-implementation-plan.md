# 华为认证 & 网络安全模块技术实现方案

> 基于 NetVis 现有架构(v224KB + 模块化懒加载)的扩展设计

---

## 📋 现有架构分析

### 核心优势
```
index.html (~224KB, 主框架)
├─ CSS 样式系统
├─ JS 渲染引擎
└─ 事件处理系统

data/ (协议数据, 懒加载)
├─ protocolDB[pid].steps[]       // 步骤标题+描述
├─ protocolDB[pid].stepData[]    // 每步的状态/字段/旁白
└─ 支持多模式切换 (DNS/NAT)

modules/ (功能模块, 异步挂载)
├─ badge.js (进度系统)
└─ share.js (分享海报)
```

### 关键技术约束
1. **零依赖** - 不引入 React/Vue/Chart.js/Webpack
2. **按需加载** - 协议数据拆为独立 JS 文件
3. **警戒线 280KB** - index.html 不能超过此大小
4. **CSS 规则** - `nth-of-type` 按标签计数,游离大括号会破坏解析

---

## 🔵 方案一: 华为认证模块 (HCIA/HCIP/HCIE)

### 1.1 数据结构设计

#### 新增数据文件位置
```
data/huawei/
├─ hcia-vlan.js          // VLAN 基础配置
├─ hcia-stp.js           // 生成树协议
├─ hcia-ospf.js          // OSPF 邻居建立
├─ hcip-bgp.js           // BGP 邻居建立
├─ hcip-mpls.js          // MPLS 标签转发
└─ hcie-troubleshoot.js  // 故障排查场景
```

#### 数据结构示例 (`data/huawei/hcia-vlan.js`)

```javascript
protocolDB['hcia-vlan'] = {
  category: 'huawei',           // 新增字段: huawei/protocol/security
  level: 'HCIA-Datacom',        // 认证级别
  examWeight: '15%',            // 考试权重
  steps: [
    { title:'第 1 步: 创建 VLAN', desc:'在交换机上创建 VLAN 10,配置描述为"财务部"' },
    { title:'第 2 步: 端口接入', desc:'将 GigabitEthernet0/0/1 加入 VLAN 10' },
    { title:'第 3 步: Trunk 配置', desc:'配置上行端口为 Trunk,允许所有 VLAN 通过' },
    { title:'第 4 步: 验证配置', desc:'使用 display vlan 查看配置结果' }
  ],
  stepData: [
    {
      // 华为特色: 命令行可视化
      deviceType: 'switch',      // switch/router/firewall
      activePort: 'GE0/0/1',
      bannerText: '🔧 第 1 / 4 步 — 创建 VLAN',
      command: 'vlan 10\n description 财务部',
      commandOutput: 'VLAN 10 已创建',
      topology: {
        devices: [
          { id:'sw1', type:'switch', name:'Core-SW', x:200, y:150,
            state:{ vlan:['10'], ports:['GE0/0/1','GE0/0/2'] } },
          { id:'pc1', type:'pc', name:'PC1', x:100, y:250, vlan:'10' },
          { id:'pc2', type:'pc', name:'PC2', x:300, y:250, vlan:'10' }
        ],
        links: [
          { from:'pc1', to:'sw1', port:'GE0/0/1', color:'orange' },
          { from:'pc2', to:'sw1', port:'GE0/0/2', color:'orange' }
        ]
      },
      fields: [
        { name:'VLAN ID', val:'10', desc:'VLAN 标识,范围 1-4094', highlight:true },
        { name:'描述', val:'财务部', desc:'便于识别 VLAN 用途', highlight:false },
        { name:'端口模式', val:'Access', desc:'接入端口,只属于一个 VLAN', highlight:true }
      ],
      narration: '在华为交换机上使用 `vlan <id>` 命令创建 VLAN。VLAN 隔离了二层广播域,相同 VLAN 的设备可以互通,不同 VLAN 之间需要路由。Access 端口只允许一个 VLAN 的流量通过,适合连接终端设备。',
      examPoint: 'VLAN ID 范围 1-4094,其中 VLAN 1 为默认 VLAN 且不可删除。'
    },
    // ... 后续步骤
  ]
};
```

### 1.2 UI 组件扩展

#### 新增组件 (不内联,拆为 `modules/huawei-ui.js`)

```javascript
// modules/huawei-ui.js

// 1. 华为命令行终端模拟器
function renderCommandTerminal(command, output, cursorPos = command.length) {
  return `
    <div class="huawei-terminal">
      <div class="terminal-header">
        <span class="terminal-title">Huawei eNSP 终端模拟</span>
        <span class="terminal-prompt">[SW1]</span>
      </div>
      <div class="terminal-body">
        <div class="terminal-line prompt"><span class="user">&lt;SW1&gt;</span> ${command.substring(0, cursorPos)}<span class="cursor">_</span></div>
        <div class="terminal-line output">${output}</div>
      </div>
    </div>
  `;
}

// 2. 拓扑图可视化
function renderTopology(topology) {
  let devicesHtml = topology.devices.map(d => `
    <div class="topo-device ${d.type}" style="left:${d.x}px;top:${d.y}px">
      <div class="device-icon">${d.type === 'switch' ? '🖧' : d.type === 'router' ? '🌐' : '💻'}</div>
      <div class="device-name">${d.name}</div>
      ${d.state ? `<div class="device-state">${JSON.stringify(d.state)}</div>` : ''}
    </div>
  `).join('');

  let linksHtml = topology.links.map(l => `
    <div class="topo-link" style="${getLinkStyle(l)}">
      ${l.port ? `<span class="link-port">${l.port}</span>` : ''}
    </div>
  `).join('');

  return `
    <div class="topology-canvas">
      ${devicesHtml}
      ${linksHtml}
    </div>
  `;
}

// 3. 考试重点标注
function renderExamPoint(point) {
  return `
    <div class="exam-point">
      <span class="exam-badge">📚 考试重点</span>
      <p class="exam-text">${point}</p>
    </div>
  `;
}

// 4. 认证级别标签
function renderCertLevel(level, weight) {
  return `
    <div class="cert-level">
      <span class="level-badge ${level}">${level}</span>
      <span class="exam-weight">考试权重: ${weight}</span>
    </div>
  `;
}
```

#### CSS 样式 (内联到 `index.html`)

```css
/* 华为命令行终端 */
.huawei-terminal {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Consolas', 'Monaco', monospace;
  margin: 16px 0;
}
.terminal-header {
  background: #323232;
  padding: 8px 16px;
  color: #fff;
  display: flex;
  justify-content: space-between;
}
.terminal-body {
  padding: 12px 16px;
  color: #d4d4d4;
  line-height: 1.6;
}
.terminal-line.prompt .user {
  color: #4ec9b0;
}
.terminal-line.output {
  color: #ce9178;
}

/* 拓扑图 */
.topology-canvas {
  position: relative;
  width: 100%;
  height: 300px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 8px;
  overflow: hidden;
}
.topo-device {
  position: absolute;
  text-align: center;
  color: #fff;
}
.device-icon {
  font-size: 32px;
}
.device-name {
  font-size: 12px;
  margin-top: 4px;
}
.topo-link {
  position: absolute;
  height: 3px;
  background: #00ff00;
  transform-origin: left center;
}

/* 考试重点 */
.exam-point {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border-left: 4px solid #ffc107;
  padding: 12px 16px;
  border-radius: 4px;
  margin: 16px 0;
}
.exam-badge {
  display: inline-block;
  background: #ffc107;
  color: #000;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

/* 认证级别 */
.cert-level {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.level-badge.HCIA-Datacom { background: #4caf50; color: #fff; }
.level-badge.HCIP-Datacom { background: #2196f3; color: #fff; }
.level-badge.HCIE-Datacom { background: #9c27b0; color: #fff; }
.exam-weight {
  font-size: 12px;
  color: #666;
}
```

### 1.3 功能模块扩展

#### 新增 `modules/huawei-loader.js` (异步挂载)

```javascript
// 华为模块加载器 - 页面加载后 500ms 异步挂载
(function() {
  setTimeout(function() {
    const script = document.createElement('script');
    script.src = 'modules/huawei-loader.js';
    script.onload = function() {
      console.log('[华为模块] 加载完成');
      // 注入华为分类到协议库
      injectHuaweiCategory();
    };
    document.head.appendChild(script);
  }, 500);
})();

function injectHuaweiCategory() {
  const filterContainer = document.querySelector('.filter-container');
  if (!filterContainer) return;

  // 添加华为分类标签
  const huaweiFilter = document.createElement('button');
  huaweiFilter.className = 'filter-tag';
  huaweiFilter.setAttribute('data-category', 'huawei');
  huaweiFilter.innerHTML = '🎓 华为认证';
  huaweiFilter.onclick = function() {
    filterProtocols('huawei');
  };

  filterContainer.appendChild(huaweiFilter);
}

function filterProtocols(category) {
  const cards = document.querySelectorAll('.proto-card');
  cards.forEach(card => {
    const cardCategory = card.getAttribute('data-category');
    if (category === 'all' || cardCategory === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}
```

### 1.4 实现优先级

#### Phase 1: 基础场景 (Week 5-6)
- ✅ HCIA-Datacom: VLAN 配置 (data/huawei/hcia-vlan.js)
- ✅ HCIA-Datacom: STP 生成树 (data/huawei/hcia-stp.js)
- ✅ HCIA-Datacom: 静态路由 (data/huawei/hcia-static-route.js)

#### Phase 2: 进阶场景 (Week 7-8)
- ✅ HCIP-Datacom: OSPF 邻居建立 (data/huawei/hcip-ospf.js)
- ✅ HCIP-Datacom: BGP 邻居建立 (data/huawei/hcip-bgp.js)
- ✅ HCIP-Datacom: MPLS 标签转发 (data/huawei/hcip-mpls.js)

#### Phase 3: 综合场景 (Week 9-10)
- ✅ HCIE-Datacom: 故障排查 (data/huawei/hcie-troubleshoot.js)
- ✅ HCIE-Datacom: 拓扑设计 (data/huawei/hcie-design.js)

---

## 🔒 方案二: 网络安全模块 (防御可视化优先)

### 2.1 核心原则

```
❌ 禁止项:
- 不提供可执行的攻击脚本
- 不展示具体的攻击工具使用步骤
- 不涉及灰色/黑色产业链内容

✅ 必须项:
- 每个攻击演示配对应的防御方案
- 强调"知己知彼,方能防守"的教育意义
- 学习前需同意道德声明
- 聚焦"原理演示",避免可复现细节
```

### 2.2 数据结构设计

#### 新增数据文件位置
```
data/security/
├─ mitm-attack.js         // MITM 中间人攻击 + TLS 防御
├─ ddos-attack.js         // DDoS 攻击原理 + SYN Cookie 防御
├─ dns-hijack.js          // DNS 劫投毒 + DNSSEC 验证
├─ fw-packet-filter.js    // 防火墙包过滤
├─ vpn-ipsec.js           // IPSec VPN 隧道建立
└─ ids-snort.js           // 入侵检测规则匹配
```

#### 数据结构示例 (`data/security/mitm-attack.js`)

```javascript
protocolDB['mitm-attack'] = {
  category: 'security',
  level: '网络安全基础',
  examWeight: '20%',
  moralWarning: true,  // 需要道德声明弹窗
  steps: [
    { title:'第 1 步: ARP 欺骗原理', desc:'攻击者发送伪造 ARP 响应,欺骗受害者和网关' },
    { title:'第 2 步: 流量劫持', desc:'受害者流量经过攻击者,实现中间人位置' },
    { title:'第 3 步: TLS 如何防御', desc:'TLS 证书验证 + 密钥交换 + 数据加密' }
  ],
  stepData: [
    {
      deviceType: 'attacker',
      bannerText: '⚠️ 第 1 / 3 步 — ARP 欺骗原理',
      topology: {
        devices: [
          { id:'attacker', type:'attacker', name:'攻击者', x:200, y:100, color:'#f44336' },
          { id:'victim', type:'pc', name:'受害者', x:100, y:250 },
          { id:'gateway', type:'router', name:'网关', x:300, y:250 }
        ],
        links: [
          { from:'attacker', to:'victim', type:'arp-spoof', dashed:true },
          { from:'attacker', to:'gateway', type:'arp-spoof', dashed:true }
        ]
      },
      fields: [
        { name:'攻击类型', val:'ARP 欺骗', desc:'伪造 ARP 响应,篡改 IP-MAC 映射', highlight:true },
        { name:'目标', val:'受害者 & 网关', desc:'双向欺骗,攻击者处于中间位置', highlight:true },
        { name:'风险等级', val:'🔴 高危', desc:'可截获、篡改所有未加密流量', highlight:true }
      ],
      narration: 'ARP 协议无认证机制,攻击者可以发送伪造的 ARP 响应,告诉受害者"我是网关"(攻击者 MAC),同时告诉网关"我是受害者"。这样受害者和网关之间的流量都会经过攻击者。',
      defense: {
        title: '🛡️ 防御方案',
        content: [
          '1. 静态 ARP 绑定: 在网关和关键设备上绑定 IP-MAC 映射',
          '2. 动态 ARP 检测 (DAI): 交换机验证 ARP 报文的合法性',
          '3. 端口安全: 限制端口学习的 MAC 地址数量',
          '4. 使用 HTTPS/TLS: 即使流量被劫持,加密数据也无法解密'
        ]
      }
    },
    {
      deviceType: 'tls',
      bannerText: '🔒 第 3 / 3 步 — TLS 如何防御',
      topology: {
        devices: [
          { id:'client', type:'pc', name:'客户端', x:100, y:250 },
          { id:'server', type:'server', name:'服务器', x:300, y:250 },
          { id:'attacker', type:'attacker', name:'攻击者', x:200, y:100, color:'#f44336' }
        ],
        links: [
          { from:'client', to:'server', type:'encrypted', label:'🔐 TLS 加密通道' },
          { from:'attacker', to:'client', type:'intercept', dashed:true, opacity:0.3 },
          { from:'attacker', to:'server', type:'intercept', dashed:true, opacity:0.3 }
        ]
      },
      fields: [
        { name:'TLS 1.3 握手', val:'ECDH + PSK', desc:'密钥交换,攻击者无法获取会话密钥', highlight:true },
        { name:'证书验证', val:'CA 签名验证', desc:'防止伪造服务器证书', highlight:true },
        { name:'前向安全', val:'是', desc:'即使长期私钥泄露,过去会话仍安全', highlight:true }
      ],
      narration: 'TLS 通过非对称加密交换会话密钥,通过证书验证服务器身份,通过前向安全保证历史会话安全。即使攻击者成功实施 ARP 欺骗,截获的 TLS 加密流量也无法解密,因为攻击者没有会话密钥。',
      examPoint: 'TLS 1.3 移除了 RSA 密钥交换,全面采用 ECDH/ECDHE,提供更强的前向安全性。'
    }
  ]
};
```

### 2.3 UI 组件扩展

#### 新增组件 (不内联,拆为 `modules/security-ui.js`)

```javascript
// modules/security-ui.js

// 1. 道德声明弹窗
function showMoralWarning(callback) {
  const modalHtml = `
    <div class="moral-warning-backdrop" id="moral-warning-modal">
      <div class="moral-warning-content">
        <div class="moral-warning-header">
          <h2>⚠️ 重要声明</h2>
        </div>
        <div class="moral-warning-body">
          <p>本模块内容仅用于<strong>网络安全教育和防御</strong>目的。</p>
          <p>在学习攻击原理时,您承诺:</p>
          <ul>
            <li>✅ 仅在授权环境中进行实验</li>
            <li>✅ 不利用所学知识进行非法攻击</li>
            <li>✅ 遵守《网络安全法》等相关法律法规</li>
            <li>✅ 将所学技能用于防御和保护网络安全</li>
          </ul>
          <p><strong>违反上述承诺将承担法律责任。</strong></p>
        </div>
        <div class="moral-warning-footer">
          <button class="moral-agree-btn" id="moral-agree-btn">我同意,开始学习</button>
          <button class="moral-cancel-btn" id="moral-cancel-btn">取消</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('moral-agree-btn').onclick = function() {
    document.getElementById('moral-warning-modal').remove();
    localStorage.setItem('moral-warning-agreed', 'true');
    callback();
  };

  document.getElementById('moral-cancel-btn').onclick = function() {
    document.getElementById('moral-warning-modal').remove();
  };
}

// 2. 防御方案展示
function renderDefensePlan(defense) {
  return `
    <div class="defense-plan">
      <h3 class="defense-title">${defense.title}</h3>
      <ul class="defense-list">
        ${defense.content.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `;
}

// 3. 风险等级标签
function renderRiskLevel(level) {
  const colors = {
    '高危': { bg: '#f44336', text: '#fff' },
    '中危': { bg: '#ff9800', text: '#fff' },
    '低危': { bg: '#4caf50', text: '#fff' }
  };
  const config = colors[level] || colors['低危'];

  return `
    <span class="risk-badge" style="background:${config.bg};color:${config.text}">
      ${level}
    </span>
  `;
}

// 4. 攻击链可视化
function renderAttackChain(steps) {
  return `
    <div class="attack-chain">
      ${steps.map((step, index) => `
        <div class="chain-step">
          <div class="step-number">${index + 1}</div>
          <div class="step-content">
            <div class="step-title">${step.title}</div>
            <div class="step-desc">${step.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
```

#### CSS 样式 (内联到 `index.html`)

```css
/* 道德声明弹窗 */
.moral-warning-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.moral-warning-content {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}
.moral-warning-header h2 {
  color: #f44336;
  margin-bottom: 24px;
  font-size: 24px;
}
.moral-warning-body ul {
  list-style: none;
  padding: 16px 0;
}
.moral-warning-body li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.moral-warning-footer {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}
.moral-agree-btn {
  flex: 1;
  background: #4caf50;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}
.moral-cancel-btn {
  flex: 1;
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

/* 防御方案 */
.defense-plan {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-left: 4px solid #4caf50;
  padding: 16px 20px;
  border-radius: 4px;
  margin: 16px 0;
}
.defense-title {
  color: #2e7d32;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}
.defense-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.defense-list li {
  padding: 6px 0;
  color: #1b5e20;
}
.defense-list li::before {
  content: '✓';
  color: #4caf50;
  font-weight: bold;
  margin-right: 8px;
}

/* 风险等级 */
.risk-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* 攻击链 */
.attack-chain {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 16px 0;
}
.chain-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.step-number {
  width: 32px;
  height: 32px;
  background: #f44336;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}
.step-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}
.step-desc {
  color: #666;
  font-size: 14px;
}
```

### 2.4 功能模块扩展

#### 新增 `modules/security-loader.js` (异步挂载)

```javascript
// 安全模块加载器 - 页面加载后 600ms 异步挂载
(function() {
  setTimeout(function() {
    const script = document.createElement('script');
    script.src = 'modules/security-loader.js';
    script.onload = function() {
      console.log('[安全模块] 加载完成');
      // 注入安全分类到协议库
      injectSecurityCategory();
    };
    document.head.appendChild(script);
  }, 600);
})();

function injectSecurityCategory() {
  const filterContainer = document.querySelector('.filter-container');
  if (!filterContainer) return;

  // 添加安全分类标签
  const securityFilter = document.createElement('button');
  securityFilter.className = 'filter-tag';
  securityFilter.setAttribute('data-category', 'security');
  securityFilter.innerHTML = '🔒 网络安全';
  securityFilter.onclick = function() {
    // 检查道德声明
    if (!localStorage.getItem('moral-warning-agreed')) {
      showMoralWarning(() => {
        filterProtocols('security');
      });
    } else {
      filterProtocols('security');
    }
  };

  filterContainer.appendChild(securityFilter);
}
```

### 2.5 实现优先级

#### Phase 1: 防御可视化优先 (Week 8-9)
- ✅ 防火墙包过滤 (data/security/fw-packet-filter.js)
- ✅ IPSec VPN 隧道建立 (data/security/vpn-ipsec.js)
- ✅ 入侵检测规则匹配 (data/security/ids-snort.js)

#### Phase 2: 攻击原理演示 (Week 10-11)
- ✅ MITM 攻击 + TLS 防御 (data/security/mitm-attack.js)
- ✅ DDoS 攻击 + SYN Cookie 防御 (data/security/ddos-attack.js)
- ✅ DNS 劫投毒 + DNSSEC 验证 (data/security/dns-hijack.js)

#### Phase 3: 综合防御方案 (Week 12-13)
- ✅ 零信任架构 (data/security/zero-trust.js)
- ✅ 安全合规审计 (data/security/security-audit.js)
- ✅ 应急响应流程 (data/security/incident-response.js)

---

## 🎯 整体集成方案

### 协议库页面改造

```html
<!-- 修改 index.html 中的协议库分类 -->
<div class="filter-container">
  <button class="filter-tag active" data-category="all">📚 全部</button>
  <button class="filter-tag" data-category="protocol">🌐 网络协议</button>
  <button class="filter-tag" data-category="huawei">🎓 华为认证</button>
  <button class="filter-tag" data-category="security">🔒 网络安全</button>
</div>

<!-- 修改协议卡片布局,增加 category 属性 -->
<div class="proto-card" data-proto="tcp3" data-category="protocol">
  <h3>🤝 TCP 三次握手</h3>
  <p>传输层 • 可靠连接建立</p>
</div>

<div class="proto-card" data-proto="hcia-vlan" data-category="huawei">
  <h3>🎓 VLAN 配置</h3>
  <p>HCIA-Datacom • 交换机二层隔离</p>
</div>

<div class="proto-card" data-proto="fw-packet-filter" data-category="security">
  <h3>🔒 防火墙包过滤</h3>
  <p>网络安全 • 访问控制策略</p>
</div>
```

### 模块加载时序

```javascript
// 页面加载时的模块挂载顺序
DOMContentLoaded →
  badge.js (500ms) →
  share.js (600ms) →
  huawei-loader.js (700ms) →
  security-loader.js (800ms)
```

### 数据懒加载策略

```javascript
// 修改现有的 switchProtocol 函数,增加 category 判断
function switchProtocol(pid, btnEl) {
  // 检查道德声明 (安全模块)
  if (pid.startsWith('security-') && !localStorage.getItem('moral-warning-agreed')) {
    showMoralWarning(() => {
      loadAndRenderProtocol(pid, btnEl);
    });
    return;
  }

  loadAndRenderProtocol(pid, btnEl);
}

function loadAndRenderProtocol(pid, btnEl) {
  // 确定数据文件路径
  let dataPath = 'data/';
  if (pid.startsWith('hcia-') || pid.startsWith('hcip-') || pid.startsWith('hcie-')) {
    dataPath += 'huawei/';
  } else if (pid.startsWith('security-')) {
    dataPath += 'security/';
  }

  // 动态加载协议数据
  const script = document.createElement('script');
  script.src = `${dataPath}${pid}.js`;
  script.onload = function() {
    // 渲染协议内容
    rebuildSidePanel();
    renderStep();
  };
  document.head.appendChild(script);
}
```

---

## 📊 工作量评估

### 华为认证模块
- **Phase 1 (2周)**: 3个基础场景 × 3天/场景 = 9天
- **Phase 2 (2周)**: 3个进阶场景 × 3天/场景 = 9天
- **Phase 3 (2周)**: 2个综合场景 × 5天/场景 = 10天
- **总计**: ~6周

### 网络安全模块
- **Phase 1 (2周)**: 3个防御场景 × 3天/场景 = 9天
- **Phase 2 (2周)**: 3个攻击场景 × 4天/场景 = 12天
- **Phase 3 (2周)**: 3个综合场景 × 4天/场景 = 12天
- **总计**: ~6周

### 联合优化
- 两个模块共用 UI 组件 (命令行终端、拓扑图、卡片布局)
- 两个模块共用分类筛选逻辑
- 两个模块共用进度徽章系统

---

## ✅ 下一步行动

### Week 5: 华为模块第一个场景
1. 创建 `data/huawei/` 目录
2. 实现 `data/huawei/hcia-vlan.js` (VLAN 配置)
3. 创建 `modules/huawei-ui.js` (命令行终端+拓扑图)
4. 创建 `modules/huawei-loader.js` (分类筛选)
5. 测试并优化

### Week 6: 华为模块第二/三个场景
1. 实现 `data/huawei/hcia-stp.js` (STP 生成树)
2. 实现 `data/huawei/hcia-static-route.js` (静态路由)
3. 优化拓扑图渲染性能
4. 添加考试重点标注功能

### Week 8: 安全模块第一个场景
1. 创建 `data/security/` 目录
2. 实现 `data/security/fw-packet-filter.js` (防火墙包过滤)
3. 创建 `modules/security-ui.js` (道德声明+防御方案)
4. 创建 `modules/security-loader.js` (安全分类)
5. 测试道德声明弹窗

---

## 🎓 成功指标

### 华为认证模块
- 新增 8+ 华为认证场景
- 用户学习完成率 ≥ 70%
- 考试重点覆盖率 ≥ 90%
- 用户反馈评分 ≥ 4.5/5

### 网络安全模块
- 新增 9+ 安全场景 (6攻击+6防御)
- 道德声明同意率 = 100%
- 防御方案覆盖率 = 100%
- 用户反馈评分 ≥ 4.7/5

---

*本方案基于 NetVis 现有架构设计,遵循零依赖、按需加载、警戒线 280KB 的技术约束。*

# 🔧 快速修复清单 — NetViz 功能参数优化

**优先级**：🔴 立即执行  
**预计时间**：2.5 小时  
**目标**：修复数据对齐问题，优化参数说明

---

## ✅ 任务 1：补充 DNS 知识点（30 分钟）

### 当前状态
```javascript
protocolDB['dns'] = {
  steps: 8 步
  stepData: 8 条
  knowledge: 4 条  ← 不对齐！
  quiz: 4 道
}
```

### 问题
- 步骤 5-8 无对应的知识点显示
- 用户学习体验不完整

### 修复步骤

#### 1. 打开 `data/dns.js`

#### 2. 找到 knowledge 数组（约第 200 行）
```javascript
knowledge:[
  { title:'💡 DNS 递归查询流程', body:'...' },
  { title:'💡 根服务器与 TLD 的区别', body:'...' },
  { title:'💡 DNS 缓存机制', body:'...' },
  { title:'💡 DNS 报文格式', body:'...' },
  // ← 需要补充 4 条
],
```

#### 3. 补充 4 条知识点
```javascript
knowledge:[
  { title:'💡 DNS 递归查询流程', body:'浏览器向递归解析器发起查询，递归解析器代为完整查询，最后返回结果。这是大多数用户的查询方式。' },
  { title:'💡 根服务器与 TLD 的区别', body:'根服务器知道所有顶级域（.com/.org/.cn）的 NS 地址，但不知道具体域名。TLD 服务器知道该顶级域下所有域名的权威 NS，但不知道 IP。权威 NS 才知道具体 IP。' },
  { title:'💡 DNS 缓存机制', body:'DNS 有多级缓存：浏览器缓存 → OS 缓存 → ISP 递归解析器缓存 → 权威 NS。每级缓存都有 TTL（生存时间），TTL 内无需重新查询。' },
  { title:'💡 DNS 报文格式', body:'DNS 报文包含：Transaction ID（标识符）、QR（查询/响应）、QNAME（域名）、QTYPE（记录类型）、RD（递归标志）。UDP 端口 53，响应 >512 字节时切换 TCP。' },
  { title:'💡 DNS 记录类型', body:'A（IPv4）、AAAA（IPv6）、CNAME（别名）、MX（邮件）、NS（名称服务器）、TXT（文本）、SOA（授权起点）。不同记录类型用于不同用途。' },
  { title:'💡 DoH 与 DoT', body:'DNS over HTTPS（DoH）和 DNS over TLS（DoT）加密 DNS 查询，防止 ISP 窥探。DoH 用 HTTPS 端口 443，DoT 用 TCP 端口 853。提升隐私性。' },
  { title:'💡 DNS 污染与防护', body:'DNS 污染：攻击者伪造 DNS 响应，将用户导向恶意网站。防护：使用可信 DNS（8.8.8.8）、DNSSEC 验证、DoH/DoT 加密。' },
  { title:'💡 DNS 性能优化', body:'减少 DNS 查询次数：① 增加 TTL；② 使用 DNS 预解析（<link rel="dns-prefetch">）；③ 使用 CDN 就近解析；④ 本地缓存。' },
],
```

### 验证
```bash
# 运行检查脚本
python scripts/check_dns_kb.py
# 应该显示：knowledge 8 条 vs stepData 8 条 ✅ 对齐
```

---

## ✅ 任务 2：补充 DNS-iter 知识点（30 分钟）

### 当前状态
```javascript
protocolDB['dns-iter'] = {
  steps: 8 步
  stepData: 8 条
  knowledge: 4 条  ← 不对齐！
  quiz: 4 道
}
```

### 修复步骤

#### 1. 打开 `data/dns.js`

#### 2. 找到 dns-iter 的 knowledge 数组（约第 400 行）

#### 3. 补充 4 条知识点（与递归查询不同的地方）
```javascript
// dns-iter 的 knowledge
knowledge:[
  { title:'💡 DNS 迭代查询流程', body:'浏览器直接向根服务器查询，根返回 TLD 地址；浏览器再向 TLD 查询，TLD 返回权威 NS 地址；浏览器最后向权威 NS 查询。浏览器自己完成整个查询过程。' },
  { title:'💡 递归 vs 迭代的区别', body:'递归：客户端只问一次，服务器代为完整查询。迭代：客户端逐步查询，每次得到下一跳地址。递归对服务器压力大，迭代对客户端压力大。' },
  { title:'💡 迭代查询的优势', body:'① 减轻递归解析器压力；② 客户端可缓存中间结果；③ 便于调试（可追踪每一跳）。缺点：客户端需要实现完整查询逻辑。' },
  { title:'💡 DNS 权威性转介', body:'每一跳返回的不是最终答案，而是"权威性转介"：我不知道，但这个服务器知道。同时附带胶水记录（Glue Record）避免循环查询。' },
  { title:'💡 DNS 根提示（Root Hints）', body:'DNS 客户端内置 13 组根服务器 IP（a~m.root-servers.net），无需查询就能直接联系根。这些 IP 很少变化，但需要定期更新。' },
  { title:'💡 DNS 查询性能对比', body:'递归查询：1 次往返（客户端 ↔ 递归解析器）。迭代查询：多次往返（客户端 ↔ 根 ↔ TLD ↔ 权威）。递归更快，但依赖递归解析器。' },
  { title:'💡 DNS 权威 NS 的作用', body:'权威 NS 是域名所有者配置的 DNS 服务器，存储该域名的所有记录（A/AAAA/CNAME/MX 等）。通常由 DNS 服务商（如 Cloudflare）提供。' },
  { title:'💡 DNS 故障排查', body:'使用 nslookup/dig 工具进行迭代查询，逐步排查问题：① 本地缓存；② ISP DNS；③ 根服务器；④ TLD；⑤ 权威 NS。' },
],
```

### 验证
```bash
python scripts/check_dns_kb.py
# 应该显示：dns-iter knowledge 8 条 vs stepData 8 条 ✅ 对齐
```

---

## ✅ 任务 3：审计 HTML 体积（1 小时）

### 当前状态
```
index.html: 257KB
警戒线: 280KB
剩余空间: 23KB ← 危险！
```

### 审计步骤

#### 1. 分析 CSS 体积
```bash
# 在浏览器开发者工具中
# 1. 打开 index.html
# 2. 右键 → 检查 → Sources
# 3. 查看 <style> 标签的大小
```

#### 2. 识别冗余 CSS
```css
/* 查找以下问题 */
/* ① 重复的选择器 */
.nav { ... }
.nav { ... }  ← 重复

/* ② 未使用的类 */
.old-feature { ... }  ← 检查是否在 HTML 中使用

/* ③ 过度的媒体查询 */
@media (max-width: 640px) { ... }  ← 检查是否必要

/* ④ 冗余的颜色变量 */
--blue-100, --blue-200, --blue-300, ...  ← 是否都用到了？
```

#### 3. 删除冗余代码
```css
/* 示例：删除未使用的类 */
/* 删除前 */
.old-feature { ... }  /* 5KB */
.deprecated-style { ... }  /* 3KB */

/* 删除后 */
/* 节省 8KB */
```

#### 4. 考虑拆分 CSS
```html
<!-- 当前 -->
<style>
  /* 所有 CSS 都在这里，257KB */
</style>

<!-- 建议 -->
<style>
  /* 核心 CSS（必须的），~150KB */
</style>
<link rel="stylesheet" href="modules/style-advanced.css">
<!-- 高级功能 CSS，按需加载 -->
```

#### 5. 验证体积
```bash
# 检查修改后的体积
ls -lh index.html
# 目标：< 270KB（留出 10KB 缓冲）
```

### 预期结果
- 🎯 目标：减少 10-20KB
- 📊 新体积：237-247KB
- 💾 剩余空间：33-43KB

---

## ✅ 任务 4：改进 TCP3 占位符注释（10 分钟）

### 当前状态
```javascript
// data/tcp3.js
// TCP 三次握手数据由主 HTML 的 rebuildStepData() 函数动态生成，
// 直接写入 protocolDB['tcp3']，不需要通过本文件加载。
// 此文件为占位符，不应被 loadProtocolData() 调用。
```

### 问题
- 注释不够详细
- 容易误导开发者

### 修复步骤

#### 1. 打开 `data/tcp3.js`

#### 2. 替换注释
```javascript
/**
 * TCP 三次握手 — 动态生成数据
 * 
 * ⚠️ 重要：此文件是占位符，不包含实际数据！
 * 
 * 数据生成流程：
 * 1. 用户打开播放器时，调用 openProtocol('tcp3')
 * 2. index.html 中的 rebuildStepData() 函数被触发
 * 3. rebuildStepData() 根据用户配置（初始序列号等）动态生成 stepData
 * 4. 生成的数据直接写入 protocolDB['tcp3']
 * 5. renderStep() 读取 protocolDB['tcp3'].stepData 进行渲染
 * 
 * 为什么要动态生成？
 * - TCP 三次握手的 seq/ack 数值需要根据初始序列号推导
 * - 用户可以自定义初始序列号，查看不同场景
 * - 动态生成允许实时计算 seq/ack 关系（如 100 + 1 = 101）
 * 
 * 如何修改 TCP3 数据？
 * - 编辑 index.html 中的 rebuildStepData() 函数
 * - 修改 steps 数组（步骤标题和描述）
 * - 修改 knowledge 数组（知识点）
 * - 修改 quiz 数组（思考题）
 * 
 * 不要在此文件中添加代码！
 */

// 此文件保持为空，仅作为占位符存在
```

### 验证
- ✅ 注释清晰详细
- ✅ 说明了为什么要动态生成
- ✅ 指导开发者如何修改

---

## 📋 验证清单

完成上述 4 个任务后，请逐一验证：

### 任务 1 验证
- [ ] DNS knowledge 补充到 8 条
- [ ] 运行 `scripts/check_dns_kb.py` 通过
- [ ] 在浏览器中打开 DNS 协议，检查知识点显示

### 任务 2 验证
- [ ] DNS-iter knowledge 补充到 8 条
- [ ] 运行 `scripts/check_dns_kb.py` 通过
- [ ] 在浏览器中打开 DNS 迭代模式，检查知识点显示

### 任务 3 验证
- [ ] 审计 CSS 代码，识别冗余部分
- [ ] 删除冗余代码
- [ ] 检查 index.html 体积 < 270KB
- [ ] 在浏览器中测试所有功能正常

### 任务 4 验证
- [ ] TCP3 占位符注释更新
- [ ] 注释清晰详细
- [ ] 在浏览器中打开 TCP3 协议，功能正常

---

## 🎯 后续优化（可选）

### 中期任务（下周）
1. **为协议补充 derive 字段**
   - 为涉及计算的字段添加推导过程
   - 预计 2 小时

2. **统一旁白长度**
   - 目标：100-150 字
   - 预计 1.5 小时

3. **统一答案长度**
   - 目标：100-200 字
   - 预计 1.5 小时

4. **补充思考题**
   - 为每个协议补充 2-3 道题
   - 预计 3 小时

### 长期任务（2-3 周）
1. **建立体积监控机制**
   - 在 CI/CD 中添加体积检查
   - 预计 1 小时

2. **添加难度分级**
   - 为思考题标注难度
   - 预计 1.5 小时

3. **扩展新协议**
   - VLAN、STP、OSPF、BGP 等
   - 预计 20+ 小时

---

## 💾 提交建议

完成所有修复后，建议提交到 GitHub：

```bash
git add data/dns.js
git add index.html
git add data/tcp3.js
git commit -m "fix: align DNS knowledge points, optimize HTML size, improve TCP3 comments"
git push origin main
```

---

**清单创建时间**：2026-03-27 00:29  
**预计完成时间**：2.5 小时  
**优先级**：🔴 立即执行

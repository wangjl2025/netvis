  protocolDB['dns'] = {
      steps:[
        { title:'第 1 步：浏览器检查本地缓存', desc:'浏览器先查自身 DNS 缓存，再查操作系统缓存（hosts 文件 + OS 缓存）。命中则直接返回 IP，整个过程 <1ms。', packet:'本地缓存查询 example.com' },
        { title:'第 2 步：向递归解析器发起查询', desc:'缓存未命中，浏览器向配置的 DNS 服务器（如 8.8.8.8 或 ISP 提供）发送递归查询请求。', packet:'query: example.com A 记录? → 8.8.8.8' },
        { title:'第 3 步：递归解析器询问根服务器', desc:'递归解析器查自身缓存未命中，向全球 13 组根服务器之一查询 .com 顶级域的权威服务器地址。', packet:'.com 的 NS 是谁? → 根服务器' },
        { title:'第 4 步：根服务器返回 TLD 地址', desc:'根服务器不知道 example.com，但知道 .com 由 Verisign 管理，返回 .com TLD 服务器（a.gtld-servers.net）的地址。', packet:'根 → TLD: a.gtld-servers.net' },
        { title:'第 5 步：递归解析器询问 TLD 服务器', desc:'递归解析器拿到 TLD 地址后，向 .com TLD 服务器询问 example.com 的权威 DNS 服务器是谁。', packet:'example.com 的 NS? → TLD 服务器' },
        { title:'第 6 步：TLD 返回权威服务器地址', desc:'.com TLD 服务器返回 example.com 的权威 DNS 服务器地址（ns1.example.com），这是最终能给出 A 记录的服务器。', packet:'TLD → 权威: ns1.example.com' },
        { title:'第 7 步：向权威服务器查询 A 记录', desc:'递归解析器向权威服务器发起最终查询，请求 example.com 的 A 记录（IPv4 地址）。', packet:'example.com A 记录? → 权威服务器' },
        { title:'第 8 步：获得 IP，返回浏览器', desc:'权威服务器返回 A 记录（93.184.216.34），递归解析器缓存结果（按 TTL）并返回给浏览器。解析完成！', packet:'IP: 93.184.216.34 ✓ → 浏览器' },
      ],
      stepData:[
        {
          clientState:'查询中', clientClass:'state-httpready',
          serverState:'等待', serverClass:'state-synsent',
          clientStateId:'dns-node-0', serverStateId:'dns-node-1',
          activeRow:1, bannerText:'🌐 第 1 / 8 步 — 浏览器检查本地 DNS 缓存…', bannerClass:'',
          fieldTitle:'DNS 本地缓存查询',
          fields:[
            { name:'查询域名', val:'example.com', desc:'待解析的域名', highlight:true, derive:'' },
            { name:'查询类型', val:'A（IPv4）', desc:'A 记录返回 IPv4 地址；AAAA 返回 IPv6；CNAME 返回别名', highlight:true, derive:'' },
            { name:'浏览器缓存', val:'未命中', desc:'浏览器自身维护短期 DNS 缓存', highlight:false, derive:'' },
            { name:'OS 缓存', val:'未命中', desc:'操作系统 DNS 缓存（Windows: ipconfig /displaydns 可查）', highlight:false, derive:'' },
            { name:'hosts 文件', val:'未命中', desc:'/etc/hosts（Linux/Mac）或 C:\\Windows\\System32\\drivers\\etc\\hosts', highlight:false, derive:'' },
          ],
          narration:'DNS 查询有多级缓存，大多数请求在本地就能解决。查询顺序：① 浏览器缓存（最快）→ ② OS 缓存 → ③ hosts 文件 → ④ 本地 DNS 服务器缓存。只有全部未命中，才需要真正的递归查询过程（步骤 2~8）。日常访问常用网站几乎都命中缓存。',
        },
        {
          clientState:'查询中', clientClass:'state-synsent',
          serverState:'处理中', serverClass:'state-synrcvd',
          clientStateId:'dns-node-0', serverStateId:'dns-node-1',
          activeRow:2, bannerText:'🌐 第 2 / 8 步 — 向递归解析器发起查询…', bannerClass:'',
          fieldTitle:'DNS 查询报文字段',
          fields:[
            { name:'Transaction ID', val:'0x1a2b', desc:'标识符，用于匹配请求和响应', highlight:false, derive:'' },
            { name:'QR', val:'0（Query）', desc:'0=查询，1=响应', highlight:false, derive:'' },
            { name:'QNAME', val:'example.com', desc:'查询的域名，以点分层级存储', highlight:true, derive:'' },
            { name:'QTYPE', val:'A（1）', desc:'查询类型代码，1=A记录', highlight:true, derive:'' },
            { name:'RD', val:'1（Recursion Desired）', desc:'告知服务器"请帮我递归查完"', highlight:true, derive:'' },
            { name:'传输协议', val:'UDP:53', desc:'DNS 默认用 UDP 端口 53，响应 >512 字节时切换 TCP', highlight:false, derive:'' },
          ],
          narration:'浏览器向配置的 DNS 服务器（递归解析器）发送查询。报文中 RD=1（Recursion Desired）告诉服务器"我不想自己一步步查，请你帮我完整解析"。DNS 默认使用 UDP 协议（端口 53）而不是 TCP，因为查询响应通常很小，UDP 无连接开销更低。',
        },
        {
          clientState:'等待', clientClass:'state-synsent',
          serverState:'查询根', serverClass:'state-synrcvd',
          clientStateId:'dns-node-1', serverStateId:'dns-node-2',
          activeRow:3, bannerText:'🌐 第 3 / 8 步 — 递归解析器询问根服务器…', bannerClass:'',
          fieldTitle:'根服务器查询',
          fields:[
            { name:'查询', val:'.com NS 记录', desc:'问根服务器：.com 由哪些 NS 服务器负责？', highlight:true, derive:'' },
            { name:'根服务器', val:'a.root-servers.net 等', desc:'全球 13 组根服务器（a~m），每组实际有数百台（任播）', highlight:true, derive:'' },
            { name:'根 IP（硬编码）', val:'198.41.0.4 等', desc:'递归解析器内置根服务器 IP，不需要查 DNS', highlight:false, derive:'' },
          ],
          narration:'全球只有 13 组根服务器（命名 a~m.root-servers.net），但每组实际有数百台物理服务器通过 IP 任播（Anycast）分布在全球。递归解析器内置了这 13 组 IP（称为 root hints），无需查询就能直接联系根服务器。根服务器只知道顶级域（.com/.org/.cn 等）的 NS，不知道具体域名。',
        },
        {
          clientState:'等待', clientClass:'state-synsent',
          serverState:'返回 TLD', serverClass:'state-established',
          clientStateId:'dns-node-1', serverStateId:'dns-node-2',
          activeRow:4, bannerText:'🌐 第 4 / 8 步 — 根服务器返回 .com TLD 地址…', bannerClass:'',
          fieldTitle:'根服务器响应',
          fields:[
            { name:'AUTHORITY', val:'.com NS: a.gtld-servers.net', desc:'.com 的权威 NS 服务器列表', highlight:true, derive:'' },
            { name:'ADDITIONAL', val:'a.gtld-servers.net → IP', desc:'顺带附上 TLD 服务器的 IP（胶水记录）', highlight:true, derive:'' },
            { name:'TTL', val:'172800（2天）', desc:'该 NS 记录缓存时间，2天内不需要再问根', highlight:false, derive:'' },
          ],
          narration:'根服务器的响应是"权威性转介"：我不知道 example.com 的 IP，但我知道 .com 是 Verisign 管理的，你去问 a.gtld-servers.net。响应还附带"胶水记录"（Glue Record）——TLD 服务器的 IP，避免循环查询（如果要知道 NS 的 IP 还需要再查 NS，就死循环了）。',
        },
        {
          clientState:'等待', clientClass:'state-synsent',
          serverState:'查询 TLD', serverClass:'state-synrcvd',
          clientStateId:'dns-node-1', serverStateId:'dns-node-3',
          activeRow:5, bannerText:'🌐 第 5 / 8 步 — 递归解析器询问 TLD 服务器…', bannerClass:'',
          fieldTitle:'TLD 服务器查询',
          fields:[
            { name:'查询', val:'example.com NS 记录', desc:'问 TLD：example.com 由哪个 NS 服务器负责？', highlight:true, derive:'' },
            { name:'TLD 服务器', val:'a.gtld-servers.net', desc:'Verisign 管理的 .com TLD 服务器', highlight:false, derive:'' },
          ],
          narration:'递归解析器拿到 TLD 地址后，向 .com TLD 服务器发起查询：example.com 的权威 NS 是谁？TLD 服务器掌握着所有 .com 域名的 NS 记录，但不存储 A 记录（不知道具体 IP）。域名注册时，注册商会把 NS 记录写入 TLD 服务器。',
        },
        {
          clientState:'等待', clientClass:'state-synsent',
          serverState:'返回权威', serverClass:'state-established',
          clientStateId:'dns-node-1', serverStateId:'dns-node-3',
          activeRow:6, bannerText:'🌐 第 6 / 8 步 — TLD 返回权威服务器地址…', bannerClass:'',
          fieldTitle:'TLD 服务器响应',
          fields:[
            { name:'AUTHORITY', val:'example.com NS: ns1.example.com', desc:'example.com 的权威 DNS 服务器', highlight:true, derive:'' },
            { name:'TTL', val:'3600（1小时）', desc:'NS 记录缓存时间', highlight:false, derive:'' },
            { name:'胶水记录', val:'ns1.example.com → IP', desc:'权威 NS 的 IP，避免循环', highlight:false, derive:'' },
          ],
          narration:'TLD 服务器告诉递归解析器：example.com 的权威 DNS 是 ns1.example.com（通常由域名所有者自己配置的 DNS 服务器，如 Cloudflare、Route53 等）。递归解析器记录下来，下次有人查 example.com，直接去问权威服务器（TTL 内）。',
        },
        {
          clientState:'等待', clientClass:'state-synsent',
          serverState:'查询权威', serverClass:'state-synrcvd',
          clientStateId:'dns-node-1', serverStateId:'dns-node-4',
          activeRow:7, bannerText:'🌐 第 7 / 8 步 — 向权威服务器查询 A 记录…', bannerClass:'',
          fieldTitle:'权威服务器查询',
          fields:[
            { name:'查询', val:'example.com A 记录', desc:'最终查询，请求具体的 IPv4 地址', highlight:true, derive:'' },
            { name:'权威服务器', val:'ns1.example.com', desc:'由域名所有者控制，掌握该域所有 DNS 记录', highlight:true, derive:'' },
            { name:'AA 标志', val:'1（Authoritative Answer）', body:'响应中 AA=1 表示"我就是权威，这个答案是最终结果"', highlight:false, derive:'' },
          ],
          narration:'权威服务器是整个 DNS 树中掌握最终答案的服务器，由域名所有者配置（可以是 Cloudflare DNS、AWS Route53、自建 BIND 等）。它存储着 A 记录（example.com → 93.184.216.34）、MX 记录（邮件服务器）、TXT 记录等所有该域的 DNS 数据。',
        },
        {
          clientState:'解析完成', clientClass:'state-established',
          serverState:'已返回', serverClass:'state-established',
          clientStateId:'dns-node-0', serverStateId:'dns-node-1',
          activeRow:8, bannerText:'✅ DNS 解析完成！IP: 93.184.216.34', bannerClass:'banner-success',
          fieldTitle:'DNS 响应报文字段',
          fields:[
            { name:'ANSWER', val:'example.com A 93.184.216.34', desc:'A 记录：域名 → IPv4 地址', highlight:true, derive:'' },
            { name:'TTL', val:'3600（1小时）', desc:'缓存时间：1小时内无需重新查询', highlight:true, derive:'' },
            { name:'AA', val:'1', desc:'权威应答，这是最终结果', highlight:false, derive:'' },
            { name:'总耗时', val:'~50ms（首次）', desc:'有缓存时 <1ms；首次查询需经过多轮迭代', highlight:true, derive:'' },
          ],
          narration:'权威服务器返回 A 记录（93.184.216.34），递归解析器将结果按 TTL 缓存后转发给浏览器。整个递归查询过程约需 50~200ms（视网络延迟），但缓存后后续查询 <1ms。浏览器拿到 IP 后，开始 TCP 三次握手，DNS 解析完成使命。',
        },
      ],
      knowledge:[
        { title:'💡 DNS 查询的两种方式：递归 vs 迭代', body:'<strong>递归查询</strong>：客户端把任务完全交给递归解析器，解析器负责把结果找回来（浏览器→递归解析器是递归）。<strong>迭代查询</strong>：递归解析器依次问根→TLD→权威，每次只获得"下一步问谁"的指引，自己逐步完成（递归解析器→各级 NS 是迭代）。' },
        { title:'💡 TTL 是什么？设太短或太长有什么影响？', body:'TTL（Time-To-Live）是 DNS 记录的缓存时间（秒）。<strong>太长</strong>（如 86400=1天）：切换 IP 时全球生效慢，老 IP 还被访问；<strong>太短</strong>（如 60=1分钟）：每分钟都要真正查询，增加延迟和 DNS 服务器压力。最佳实践：日常设 3600（1小时），迁移前 48 小时改为 300（5分钟）。' },
        { title:'💡 DNS 污染和 DNS 劫持是什么？', body:'<strong>DNS 污染</strong>：在 UDP 查询响应中注入伪造答案，返回错误 IP。<strong>DNS 劫持</strong>：ISP 或网络设备篡改 DNS 响应（如广告注入、屏蔽）。防御方案：① DoH（DNS over HTTPS）把 DNS 放在 HTTPS 里，防止窥探和篡改；② DoT（DNS over TLS）；③ DNSSEC（对 DNS 记录数字签名）。' },
        { title:'💡 为什么全球只有 13 个根服务器 IP？', body:'这是历史原因：早期 DNS 用 UDP，单包最大 512 字节，13 个根服务器的信息刚好能放进去（A 记录 IP + 名称）。现在 13 是逻辑上的限制，每个"根服务器"实际上是由数百台物理服务器通过 IP 任播（Anycast）实现，全球有 1000+ 台根服务器实体，任播让你总是访问最近的一台。' },
      ],
      quiz:[
        { q:'DNS 用 UDP 还是 TCP？为什么？', a:'<strong>默认 UDP（端口 53）</strong>，因为 DNS 请求/响应通常很小（几十到几百字节），UDP 无连接开销，一个来回即可。但当响应超过 512 字节（如 DNSSEC 签名、多条 MX 记录）时，服务器会在响应中设置 TC（Truncated）标志，客户端收到后切换到 TCP 重试，TCP 无大小限制。' },
        { q:'如果 DNS 查询总是从根服务器开始，根服务器压力不会太大吗？', a:'不会——因为<strong>多级缓存</strong>。大多数请求在递归解析器的缓存中就能解决（全球有数百万个递归解析器，如 8.8.8.8、1.1.1.1）。根服务器只处理缓存未命中的请求，且 NS 记录 TTL 通常为 1~2 天，热门域名几乎不需要到达根服务器。' },
        { q:'CNAME 记录是什么？和 A 记录有什么区别？', a:'<strong>A 记录</strong>：domain → IP 地址（最终结果）。<strong>CNAME 记录</strong>：domain → 另一个域名（别名），客户端需要再解析这个别名才能得到 IP。例如：www.example.com CNAME example.com，再查 example.com A 93.184.216.34。CNAME 的好处是改变 IP 时只需修改最终指向的 A 记录，所有 CNAME 自动跟随。' },
        { q:'为什么修改了 DNS A 记录，但有些用户还是访问旧 IP？', a:'因为 <strong>TTL 缓存</strong>：修改 DNS 前旧记录已被各地 DNS 缓存，需要等旧 TTL 到期才会刷新。全球 DNS 生效需要 TTL 时间（通常数小时到数天）。最佳实践：迁移前 48 小时把 TTL 降低到 300 秒，迁移后再改回 3600。' },
        { q:'什么是 DoH（DNS over HTTPS）？为什么有些人推荐使用？', a:'传统 DNS 是明文 UDP，任何中间设备都能看到你查询的域名（即使用 HTTPS 访问网站，DNS 查询泄露了你访问了哪个域名）。<strong>DoH</strong> 把 DNS 查询包装成 HTTPS 请求（通常发到 cloudflare-dns.com 或 dns.google），加密且伪装成普通 HTTPS 流量，防止 ISP/网络层监控。Chrome、Firefox 默认支持 DoH。' },
      ],
    };

  /* ── DNS 迭代查询步骤数据 ──────────────────────────────────
     迭代查询视角：递归解析器（node-1）主动逐级查询，
     每次收到"去问谁"的指引后自己发起下一轮查询。
     节点布局：浏览器(0) → 递归解析器(1) → 根(2) → TLD(3) → 权威(4)
     箭头对应 dns-row 的 data-from / data-to 属性（由 JS 动态渲染）
  ──────────────────────────────────────────────────── */
  protocolDB['dns-iter'] = {
    steps: [
      { title:'第 1 步：浏览器向递归解析器发起递归请求', emoji:'🖥️' },
      { title:'第 2 步：解析器→根服务器：.com 的 NS？', emoji:'🔄' },
      { title:'第 3 步：根服务器→解析器：去问 TLD', emoji:'🌍' },
      { title:'第 4 步：解析器→TLD：example.com 的 NS？', emoji:'🔄' },
      { title:'第 5 步：TLD→解析器：去问权威服务器', emoji:'🏷️' },
      { title:'第 6 步：解析器→权威服务器：A 记录？', emoji:'🔄' },
      { title:'第 7 步：权威→解析器→浏览器：返回 IP', emoji:'✅' },
    ],
    /* 每步泳道配置：from/to 是节点索引（0~4），dir 是箭头方向 */
    lanes: [
      { from:0, to:1, dir:'right', color:'green',  label:'query: example.com A？（RD=1）',
        narration:'浏览器设置 RD=1（Recursion Desired），把解析任务完全交给递归解析器，自己只需等待最终结果。这是"递归查询"——只有这一步是递归。' },
      { from:1, to:2, dir:'right', color:'blue',   label:'example.com A？→ 根服务器',
        narration:'递归解析器缓存未命中，向内置的根服务器 IP 发起迭代查询：example.com 的 A 记录在哪？注意：这里 RD=0，解析器不要求对方递归，只要对方告诉它"下一步问谁"。' },
      { from:2, to:1, dir:'left',  color:'orange', label:'去问 .com TLD: a.gtld-servers.net',
        narration:'根服务器回答："我不知道 example.com，但 .com 由 Verisign 管理，你去问 a.gtld-servers.net（附带胶水记录：其 IP 为 192.5.6.30）。" 这就是迭代——我不帮你跑，我告诉你下一步去哪。' },
      { from:1, to:3, dir:'right', color:'purple', label:'example.com A？→ TLD 服务器',
        narration:'递归解析器拿到 TLD 地址后，再次主动发起查询：example.com 的 A 记录是什么？还是迭代查询（RD=0），TLD 只管告诉下一步。' },
      { from:3, to:1, dir:'left',  color:'purple', label:'去问权威: ns1.example.com',
        narration:'TLD 服务器回答："example.com 的权威 NS 是 ns1.example.com，你去找它要 A 记录（附带胶水记录其 IP）。" 依然是迭代：给指引，不代劳。' },
      { from:1, to:4, dir:'right', color:'cyan',   label:'example.com A？→ 权威服务器',
        narration:'递归解析器终于找到了权威服务器，发起最终查询。权威服务器掌握 example.com 所有 DNS 记录（A、AAAA、MX、TXT...），这次一定能得到答案。' },
      { from:4, to:0, dir:'left',  color:'green',  label:'93.184.216.34 ✓ → 浏览器',
        narration:'权威服务器返回 A 记录，递归解析器将结果缓存（按 TTL=3600s）后转发给浏览器。整个迭代过程：解析器自己跑了 3 轮查询（根→TLD→权威），浏览器只发了 1 次请求，收到 1 次回答——这就是"递归"和"迭代"的分工。' },
    ],
    stepData: [
      {
        activeNodes:[0,1], bannerText:'🌐 第 1 / 7 步 — 浏览器委托递归解析器…', bannerClass:'',
        fieldTitle:'浏览器发起递归查询', activeRow:1,
        /* 节点0=浏览器 节点1=递归解析器 节点2=根 节点3=TLD 节点4=权威 */
        nodeStates:[
          { text:'查询中', cls:'state-httpready' },
          { text:'接收中', cls:'state-synrcvd' },
          { text:'在线', cls:'state-listen' },
          { text:'在线', cls:'state-listen' },
          { text:'在线', cls:'state-listen' },
        ],
        fields:[
          { name:'QNAME', val:'example.com', desc:'查询域名', highlight:true },
          { name:'QTYPE', val:'A（1）', desc:'IPv4 地址记录', highlight:true },
          { name:'RD', val:'1（Recursion Desired）', desc:'让解析器代劳全程查询', highlight:true },
          { name:'传输', val:'UDP:53', desc:'无连接，快速', highlight:false },
        ],
      },
      {
        activeNodes:[1,2], bannerText:'🌐 第 2 / 7 步 — 解析器向根服务器迭代查询…', bannerClass:'',
        fieldTitle:'解析器→根服务器（迭代）', activeRow:2,
        nodeStates:[
          { text:'等待', cls:'state-synsent' },
          { text:'查询根', cls:'state-httpready' },
          { text:'接收中', cls:'state-synrcvd' },
          { text:'在线', cls:'state-listen' },
          { text:'在线', cls:'state-listen' },
        ],
        fields:[
          { name:'目标', val:'a.root-servers.net', desc:'根服务器 IP 硬编码在解析器中', highlight:true },
          { name:'RD', val:'0（不要求递归）', desc:'迭代查询：只要求对方给指引', highlight:true },
          { name:'问题', val:'.com 的 NS 服务器是谁？', desc:'根服务器知道各 TLD 的 NS', highlight:false },
        ],
      },
      {
        activeNodes:[2,1], bannerText:'🌐 第 3 / 7 步 — 根服务器指向 TLD…', bannerClass:'',
        fieldTitle:'根服务器迭代响应', activeRow:3,
        nodeStates:[
          { text:'等待', cls:'state-synsent' },
          { text:'接收', cls:'state-synrcvd' },
          { text:'已回复', cls:'state-established' },
          { text:'在线', cls:'state-listen' },
          { text:'在线', cls:'state-listen' },
        ],
        fields:[
          { name:'AUTHORITY', val:'.com NS: a.gtld-servers.net', desc:'.com TLD 的权威服务器', highlight:true },
          { name:'ADDITIONAL', val:'a.gtld-servers.net 192.5.6.30', desc:'胶水记录，避免循环查询', highlight:true },
          { name:'TTL', val:'172800（2天）', desc:'2天内 .com NS 不变，可缓存', highlight:false },
          { name:'AA', val:'0（非权威）', desc:'根服务器对 example.com 非权威', highlight:false },
        ],
      },
      {
        activeNodes:[1,3], bannerText:'🌐 第 4 / 7 步 — 解析器向 TLD 迭代查询…', bannerClass:'',
        fieldTitle:'解析器→TLD 服务器（迭代）', activeRow:4,
        nodeStates:[
          { text:'等待', cls:'state-synsent' },
          { text:'查询TLD', cls:'state-httpready' },
          { text:'在线', cls:'state-listen' },
          { text:'接收中', cls:'state-synrcvd' },
          { text:'在线', cls:'state-listen' },
        ],
        fields:[
          { name:'目标', val:'a.gtld-servers.net', desc:'.com TLD 服务器（Verisign）', highlight:true },
          { name:'问题', val:'example.com 的 NS 是谁？', desc:'TLD 知道该域名注册时配置的 NS', highlight:true },
          { name:'RD', val:'0（迭代查询）', desc:'不要求 TLD 代劳', highlight:false },
        ],
      },
      {
        activeNodes:[3,1], bannerText:'🌐 第 5 / 7 步 — TLD 指向权威服务器…', bannerClass:'',
        fieldTitle:'TLD 迭代响应', activeRow:5,
        nodeStates:[
          { text:'等待', cls:'state-synsent' },
          { text:'接收', cls:'state-synrcvd' },
          { text:'在线', cls:'state-listen' },
          { text:'已回复', cls:'state-established' },
          { text:'在线', cls:'state-listen' },
        ],
        fields:[
          { name:'AUTHORITY', val:'example.com NS: ns1.example.com', desc:'域名所有者配置的权威 DNS', highlight:true },
          { name:'ADDITIONAL', val:'ns1.example.com → IP', desc:'胶水记录', highlight:true },
          { name:'TTL', val:'3600（1小时）', desc:'NS 记录缓存时间', highlight:false },
        ],
      },
      {
        activeNodes:[1,4], bannerText:'🌐 第 6 / 7 步 — 解析器向权威服务器查询 A 记录…', bannerClass:'',
        fieldTitle:'解析器→权威服务器（迭代）', activeRow:6,
        nodeStates:[
          { text:'等待', cls:'state-synsent' },
          { text:'查询权威', cls:'state-httpready' },
          { text:'在线', cls:'state-listen' },
          { text:'在线', cls:'state-listen' },
          { text:'接收中', cls:'state-synrcvd' },
        ],
        fields:[
          { name:'目标', val:'ns1.example.com', desc:'由域名所有者运营（或 Cloudflare/Route53 等）', highlight:true },
          { name:'问题', val:'example.com 的 A 记录？', desc:'最终查询，权威服务器有确定答案', highlight:true },
          { name:'AA 预期', val:'1（Authoritative Answer）', desc:'权威服务器的响应带 AA=1', highlight:false },
        ],
      },
      {
        activeNodes:[4,0], bannerText:'✅ 迭代查询完成！IP: 93.184.216.34', bannerClass:'banner-success',
        fieldTitle:'最终 DNS 响应', activeRow:7,
        nodeStates:[
          { text:'已获IP', cls:'state-established' },
          { text:'已缓存', cls:'state-established' },
          { text:'在线', cls:'state-listen' },
          { text:'在线', cls:'state-listen' },
          { text:'已回复', cls:'state-established' },
        ],
        fields:[
          { name:'ANSWER', val:'example.com A 93.184.216.34', desc:'最终 A 记录', highlight:true },
          { name:'TTL', val:'3600', desc:'解析器缓存 1 小时', highlight:true },
          { name:'AA', val:'1（权威应答）', desc:'来自权威服务器，可信', highlight:false },
          { name:'总查询轮次', val:'3 次迭代（根→TLD→权威）', desc:'解析器自己跑了 3 轮，浏览器只发了 1 次请求', highlight:true },
        ],
      },
    ],
  };
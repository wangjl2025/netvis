/* ══════════════════════════════════════
   NAT 模式一：SNAT（出口 NAT / 源地址转换）
   内网主机主动访问公网，网关替换源地址
════════════════════════════════════════ */
protocolDB['nat'] = {
  rows: [
    { dir:'r', color:'packet-label-blue',   label:'私网包（src=192.168.1.100:5000 dst=8.8.8.8:80）' },
    { dir:'r', color:'packet-label-cyan',   label:'NAT 转换后（src=203.0.113.1:40001 dst=8.8.8.8:80）' },
    { dir:'l', color:'packet-label-purple', label:'公网响应（src=8.8.8.8:80 dst=203.0.113.1:40001）' },
    { dir:'l', color:'packet-label-green',  label:'NAT 还原后（src=8.8.8.8:80 dst=192.168.1.100:5000）' },
    { dir:'r', color:'packet-label-blue',   label:'另一设备（src=192.168.1.101:6000 → 203.0.113.1:40002）' },
  ],
  steps: [
    { title:'内网主机发出请求', emoji:'📤' },
    { title:'NAT 网关替换源地址', emoji:'🔄' },
    { title:'公网服务器响应',   emoji:'📥' },
    { title:'NAT 网关还原目标地址', emoji:'↩️' },
    { title:'多设备共享同一公网 IP', emoji:'🏠' },
  ],
  stepData: [
    {
      banner:'📤 第 1 / 5 步 — 内网主机向公网发出请求',
      leftState:'发出请求', rightState:'等待连接',
      fields:[
        { name:'源 IP',   value:'192.168.1.100', desc:'内网私有地址（RFC 1918，公网不可路由）' },
        { name:'源端口',  value:'5000',          desc:'客户端随机选择的临时端口' },
        { name:'目标 IP', value:'8.8.8.8',        desc:'Google 公共 DNS，公网地址' },
        { name:'目标端口',value:'80',             desc:'HTTP 服务端口' },
        { name:'问题',    value:'私网 IP 无法路由', desc:'192.168.x.x 是私有地址，互联网路由器会直接丢弃' },
      ],
      narration:'内网主机的私有地址（192.168.x.x / 10.x.x.x / 172.16.x.x）在公网不可路由——互联网路由器不知道如何把响应送回来。NAT 就是解决这个问题的关键技术。',
    },
    {
      banner:'🔄 第 2 / 5 步 — NAT 网关替换源地址（SNAT）',
      leftState:'路过网关', rightState:'等待响应',
      fields:[
        { name:'原始源 IP',   value:'192.168.1.100:5000', desc:'内网地址，NAT 前' },
        { name:'转换后源 IP', value:'203.0.113.1:40001',  desc:'公网 IP + 随机映射端口，NAT 后' },
        { name:'NAT 表记录', value:'40001 → 192.168.1.100:5000', desc:'网关记录映射关系，用于还原响应' },
        { name:'目标不变',   value:'8.8.8.8:80',          desc:'目标地址不动，只改源地址' },
        { name:'类型',       value:'SNAT（源地址转换）',   desc:'改变数据包的源 IP/Port，让公网可路由' },
      ],
      narration:'NAT 网关收到内网数据包后，把源地址从私网 IP 替换成自己的公网 IP，并分配一个唯一的映射端口（如 40001）写入 NAT 转换表。整个过程对内网主机和公网服务器都是透明的。',
    },
    {
      banner:'📥 第 3 / 5 步 — 公网服务器回包给 NAT 网关',
      leftState:'等待', rightState:'处理响应',
      fields:[
        { name:'响应源 IP',   value:'8.8.8.8:80',          desc:'公网服务器回复' },
        { name:'响应目标 IP', value:'203.0.113.1:40001',    desc:'发往 NAT 网关的公网 IP' },
        { name:'服务器视角', value:'只见到公网 IP',          desc:'服务器以为在跟 203.0.113.1 通信，不知道内网存在' },
        { name:'NAT 网关',   value:'查 NAT 表匹配端口 40001', desc:'通过映射端口找到对应的内网主机' },
      ],
      narration:'公网服务器把响应发回给 NAT 网关的公网 IP（203.0.113.1:40001）。服务器完全感知不到内网的存在——NAT 天然提供了一层隐私保护，内网拓扑对外不可见。',
    },
    {
      banner:'↩️ 第 4 / 5 步 — NAT 网关还原目标地址，转发给内网主机',
      leftState:'收到响应', rightState:'完成',
      fields:[
        { name:'查表',       value:'端口 40001 → 192.168.1.100:5000', desc:'从 NAT 表找到对应的内网地址' },
        { name:'替换目标 IP', value:'203.0.113.1:40001 → 192.168.1.100:5000', desc:'DNAT：还原目标地址' },
        { name:'转发',       value:'发往内网 192.168.1.100',          desc:'内网主机收到响应，以为直接和服务器通信' },
        { name:'透明性',     value:'内网主机无感知',                   desc:'整个 NAT 过程对应用层完全透明' },
      ],
      narration:'NAT 网关查询 NAT 表，把目标地址从公网 IP 还原成内网 192.168.1.100:5000，然后转发给内网主机。内网主机收到响应，整个过程就像直接和公网通信一样。',
    },
    {
      banner:'🏠 第 5 / 5 步 — 多台设备共享同一个公网 IP',
      leftState:'多设备在线', rightState:'统一出口',
      fields:[
        { name:'设备 A', value:'192.168.1.100:5000 → 公网:40001', desc:'第一台设备的 NAT 映射' },
        { name:'设备 B', value:'192.168.1.101:6000 → 公网:40002', desc:'第二台设备，端口不同即可区分' },
        { name:'设备 C', value:'192.168.1.102:7000 → 公网:40003', desc:'第三台，同样共享公网 IP' },
        { name:'优势',   value:'节省 IPv4 地址',                   desc:'数百台内网设备共享 1 个公网 IP' },
        { name:'局限',   value:'无法从公网主动发起连接',             desc:'NAT 穿越（STUN/TURN）解决此问题' },
      ],
      narration:'NAT 最重要的价值：用端口号区分不同的内网连接，让数百台设备共享一个公网 IP，大幅缓解了 IPv4 地址枯竭问题。这也是家庭/公司路由器的核心工作之一。IPv6 普及后 NAT 的必要性会降低，但目前仍是互联网基础设施的关键组件。',
    },
  ],
  knowledge: [
    { label:'NAT 全称', value:'Network Address Translation，网络地址转换' },
    { label:'SNAT', value:'源地址转换——修改数据包的源 IP/Port，内网→公网方向' },
    { label:'DNAT', value:'目标地址转换——修改数据包的目标 IP/Port，公网→内网方向（如端口转发）' },
    { label:'NAT 表', value:'网关维护的映射表：内网IP:Port ↔ 公网IP:Port，用于双向转换' },
    { label:'核心价值', value:'缓解 IPv4 地址枯竭；隔离内网拓扑，提供安全屏障' },
    { label:'局限性', value:'破坏端对端连接（P2P 困难）；NAT 穿越需要 STUN/TURN/ICE' },
  ],
  quiz: [
    { q:'NAT 的核心作用是什么？', options:['加密数据包','让多台私网设备共享一个公网 IP','提高传输速度','替代防火墙'], answer:1,
      exp:'NAT 的核心价值是地址转换——用端口号区分不同内网连接，让多台设备共享一个公网 IP，大幅缓解 IPv4 地址枯竭。' },
    { q:'SNAT 修改的是数据包的哪个部分？', options:['目标 IP 和端口','源 IP 和端口','TTL 字段','数据载荷'], answer:1,
      exp:'SNAT（源地址转换）修改数据包的源 IP 和源端口，将内网私有地址替换成 NAT 网关的公网 IP 和映射端口。' },
    { q:'为什么公网无法主动连接 NAT 后面的内网主机？', options:['内网主机没有 IP 地址','NAT 表里没有主动创建的映射条目','内网防火墙拦截','NAT 速度太慢'], answer:1,
      exp:'NAT 表的映射条目是由内网主机主动发起连接时创建的。公网主动发起连接时，NAT 网关查不到对应的映射，不知道该转发给哪台内网主机。' },
    { q:'以下哪种技术用于解决 NAT 穿越问题？', options:['DHCP','OSPF','STUN / TURN','ARP'], answer:2,
      exp:'STUN（Session Traversal Utilities for NAT）和 TURN（Traversal Using Relays around NAT）是专门用于 NAT 穿越的协议，WebRTC 视频通话等 P2P 场景广泛使用。' },
  ],
};

/* ══════════════════════════════════════
   NAT 模式二：DNAT（端口转发 / 目标地址转换）
   公网主机访问内网服务，网关把目标地址替换为内网服务器
   场景：家庭 NAS / 公司 Web 服务器对外暴露
════════════════════════════════════════ */
protocolDB['nat-dnat'] = {
  rows: [
    { dir:'r', color:'packet-label-purple', label:'公网请求（src=1.2.3.4:54321 dst=203.0.113.1:80）' },
    { dir:'r', color:'packet-label-cyan',   label:'DNAT 转换后（src=1.2.3.4:54321 dst=192.168.1.10:8080）' },
    { dir:'l', color:'packet-label-green',  label:'内网服务器响应（src=192.168.1.10:8080 dst=1.2.3.4:54321）' },
    { dir:'l', color:'packet-label-blue',   label:'SNAT 回包（src=203.0.113.1:80 dst=1.2.3.4:54321）' },
    { dir:'r', color:'packet-label-purple', label:'第二次请求（端口转发规则持续有效）' },
  ],
  steps: [
    { title:'公网客户端访问公网 IP 的 80 端口', emoji:'🌐' },
    { title:'DNAT：网关把目标地址改成内网服务器', emoji:'🔄' },
    { title:'内网服务器处理请求并回包', emoji:'🖥' },
    { title:'网关替换回包源地址（SNAT），返回公网', emoji:'↩️' },
    { title:'端口转发规则持续生效，连接稳定', emoji:'🔗' },
  ],
  stepData: [
    {
      banner:'🌐 第 1 / 5 步 — 公网客户端发起连接请求',
      leftState:'发出请求', rightState:'等待',
      fields:[
        { name:'源 IP:Port',   value:'1.2.3.4:54321',     desc:'公网客户端的真实地址' },
        { name:'目标 IP:Port', value:'203.0.113.1:80',    desc:'NAT 网关的公网 IP + 开放端口 80（HTTP）' },
        { name:'问题',         value:'公网 IP 背后是谁？', desc:'公网客户端不知道内网有 192.168.1.10 这台服务器' },
        { name:'用途',         value:'端口转发 / 反向代理', desc:'对外暴露内网服务，而无需给内网服务器分配公网 IP' },
      ],
      narration:'公网客户端想访问公司/家庭的 Web 服务。它只知道公网 IP（203.0.113.1）和端口 80，完全不知道背后有一台内网服务器 192.168.1.10。这是 DNAT（Destination NAT，目标地址转换）最典型的应用场景：端口转发。',
    },
    {
      banner:'🔄 第 2 / 5 步 — 网关执行 DNAT，替换目标地址',
      leftState:'转发中', rightState:'接收中',
      fields:[
        { name:'DNAT 规则',    value:'公网:80 → 192.168.1.10:8080',  desc:'管理员预先在路由器/防火墙配置的转发规则' },
        { name:'原始目标',     value:'203.0.113.1:80',                desc:'公网 IP:端口，DNAT 前' },
        { name:'转换后目标',   value:'192.168.1.10:8080',             desc:'内网服务器的真实地址，DNAT 后' },
        { name:'源地址',       value:'1.2.3.4:54321（保持不变）',     desc:'DNAT 只改目标，不改源地址' },
        { name:'NAT 表',       value:'记录此映射，用于响应还原',       desc:'确保回包能正确还原' },
      ],
      narration:'网关查询转发规则表，将数据包的目标地址从公网 IP:80 替换成内网服务器 192.168.1.10:8080。这就是 DNAT——只修改目标地址（与 SNAT 只修改源地址相对）。内网服务器收到请求时，以为客户端直接连的是它。',
    },
    {
      banner:'🖥 第 3 / 5 步 — 内网服务器处理请求并回包',
      leftState:'等待', rightState:'处理中',
      fields:[
        { name:'内网服务器',   value:'192.168.1.10:8080（内网 Web 服务）', desc:'Nginx / Apache 等服务运行在内网' },
        { name:'服务器看到的源', value:'1.2.3.4:54321（公网客户端）',      desc:'内网服务器看到真实客户端 IP（可用于日志）' },
        { name:'回包目标',     value:'1.2.3.4:54321',                      desc:'直接回给公网客户端' },
        { name:'回包源',       value:'192.168.1.10:8080',                  desc:'注意：源是内网 IP，还需 SNAT 才能出公网' },
      ],
      narration:'内网服务器处理完请求后，把响应包回给 1.2.3.4:54321（公网客户端）。但此时回包的源地址是内网地址 192.168.1.10，公网路由器不知道如何路由到内网——数据包必须经过 NAT 网关，网关还需要把回包的源地址改成公网 IP（这一步叫做 SNAT）。',
    },
    {
      banner:'↩️ 第 4 / 5 步 — 网关对回包执行 SNAT，发回公网',
      leftState:'收到响应', rightState:'完成',
      fields:[
        { name:'查表',         value:'内网:8080 连接 1.2.3.4:54321 → 公网:80', desc:'从 NAT 连接追踪表找到对应的出向记录' },
        { name:'SNAT 转换',    value:'源 192.168.1.10:8080 → 203.0.113.1:80',  desc:'把内网 IP 替换成公网 IP，公网客户端才能接收' },
        { name:'发往客户端',   value:'src=203.0.113.1:80 dst=1.2.3.4:54321',    desc:'公网客户端收到的是来自公网 IP 的响应，符合预期' },
        { name:'透明性',       value:'公网客户端无感知内网结构',                 desc:'整个过程对客户端完全透明' },
      ],
      narration:'网关查 NAT 连接追踪表，把回包的源地址从 192.168.1.10:8080 替换成 203.0.113.1:80（公网 IP:端口），再发给公网客户端。客户端收到响应，以为是在直接和公网 IP 通信——整套 DNAT+SNAT 让内网服务透明对外提供服务。',
    },
    {
      banner:'🔗 第 5 / 5 步 — 端口转发规则持续有效，支持多并发',
      leftState:'持续连接', rightState:'稳定服务',
      fields:[
        { name:'规则持久性',   value:'路由器重启前一直有效',              desc:'配置一次，长期生效，不需要每次手动操作' },
        { name:'多并发支持',   value:'不同源 IP/Port → 同一内网服务',    desc:'连接追踪按四元组区分（src IP + src Port + dst IP + dst Port）' },
        { name:'常见应用',     value:'家庭 NAS、游戏服务器、公司 OA 暴露', desc:'NAS 选 5000/5001，Minecraft 25565，HTTP 80/443' },
        { name:'安全注意',     value:'仅开放必要端口 + 内网服务鉴权',     desc:'端口转发相当于在防火墙打洞，需谨慎' },
        { name:'DNAT vs 反代', value:'DNAT 在 IP 层操作；反向代理在应用层', desc:'Nginx 反代更灵活（可按域名路由），DNAT 更底层高效' },
      ],
      narration:'DNAT 端口转发规则一旦配置，可以支持大量并发连接。路由器用"四元组"（源 IP + 源端口 + 目标 IP + 目标端口）来区分不同的连接，所以多个公网客户端可以同时访问同一个内网服务。这是家庭/小企业暴露内网服务最常见的方式。',
    },
  ],
  knowledge: [
    { label:'DNAT 全称', value:'Destination NAT，目标地址转换——修改数据包的目标 IP/Port' },
    { label:'端口转发', value:'DNAT 最常见应用：把公网某端口的流量转到内网指定主机:端口' },
    { label:'与 SNAT 的关系', value:'DNAT 用于入方向（公网→内网），SNAT 用于出方向（内网→公网）；完整的端口转发两者都用' },
    { label:'四元组', value:'src IP + src Port + dst IP + dst Port，NAT 网关以此区分不同连接，支持多并发' },
    { label:'安全风险', value:'端口转发在防火墙"打洞"，应只开放必要端口，并在内网服务上启用鉴权' },
    { label:'vs 反向代理', value:'DNAT 工作在 IP 层（透明），Nginx 等反向代理工作在应用层（可按域名/路径路由，功能更强）' },
  ],
  quiz: [
    { q:'DNAT 修改的是数据包的哪个部分？', options:['源 IP 和端口','目标 IP 和端口','TTL 字段','数据载荷'], answer:1,
      exp:'DNAT（目标地址转换）修改数据包的目标 IP 和目标端口，将公网 IP:端口替换为内网服务器的私有地址:端口。与 SNAT 相对。' },
    { q:'配置了 DNAT 端口转发后，内网服务器的回包为何还需要经过 NAT 网关？', options:['规则要求','内网服务器没有默认路由','回包源地址是内网 IP，公网路由器不可路由','DNAT 会记录所有连接'], answer:2,
      exp:'内网服务器回包的源地址是私有 IP（如 192.168.1.10），公网路由器不认识私有地址，无法把数据包送到目标。必须经过 NAT 网关执行 SNAT，将源地址替换为公网 IP 后才能发出。' },
    { q:'DNAT 和 Nginx 反向代理有什么根本区别？', options:['DNAT 更安全','DNAT 工作在 IP 层，反向代理工作在应用层','两者完全相同','反向代理无法处理 HTTPS'], answer:1,
      exp:'DNAT 在网络层（IP 层）修改数据包头部，对应用完全透明，性能高但功能单一。Nginx 等反向代理工作在应用层（HTTP/HTTPS），可以解析请求内容、按域名/路径路由、加 SSL 终止等，功能更强但有应用层开销。' },
    { q:'以下哪种是 DNAT 的典型应用场景？', options:['手机访问 Google','家庭 NAS 对外暴露','内网 PC 访问 B 站','DNS 解析'], answer:1,
      exp:'家庭 NAS 对外暴露是 DNAT（端口转发）的典型场景：在路由器配置"公网 IP:5001 → NAS内网IP:5001"，使外网用户能访问内网 NAS。手机访问 Google 和内网 PC 访问 B 站是 SNAT 场景。' },
  ],
};

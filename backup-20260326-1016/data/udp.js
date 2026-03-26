protocolDB['udp'] = {
  rows: [
    { dir:'r', color:'packet-label-blue',   label:'UDP 数据报（src=5000 dst=53）' },
    { dir:'l', color:'packet-label-purple', label:'UDP 响应（src=53 dst=5000）' },
    { dir:'r', color:'packet-label-cyan',   label:'UDP 数据报（无需确认，直接再发）' },
    { dir:'l', color:'packet-label-blue',   label:'UDP 响应（无状态，独立处理）' },
  ],
  steps: [
    { title:'发送 UDP 数据报', emoji:'📤' },
    { title:'服务器响应',     emoji:'📥' },
    { title:'继续发送（无连接）', emoji:'📤' },
    { title:'响应返回',       emoji:'✅' },
  ],
  stepData: [
    {
      banner:'📤 第 1 / 4 步 — 应用层直接发出 UDP 数据报，无需建立连接',
      leftState:'发送中', rightState:'监听 UDP:53',
      fields:[
        { name:'源端口', value:'5000', desc:'客户端随机选择的临时端口' },
        { name:'目标端口', value:'53', desc:'DNS 服务的知名端口' },
        { name:'长度', value:'40 bytes', desc:'UDP 头(8B) + 数据(32B)' },
        { name:'校验和', value:'0x1A2B', desc:'可选的错误检测，UDP 头+数据的检验' },
        { name:'数据', value:'DNS Query', desc:'应用层数据，直接封装无需握手' },
      ],
      narration:'UDP 是无连接协议——应用层数据直接封装进 UDP 数据报发出，无三次握手，延迟极低。缺点是没有确认机制，丢包需应用层自行处理。',
    },
    {
      banner:'📥 第 2 / 4 步 — 服务器收到数据报，直接处理并回复',
      leftState:'等待响应', rightState:'处理中',
      fields:[
        { name:'源端口', value:'53', desc:'服务器用知名端口回复' },
        { name:'目标端口', value:'5000', desc:'原始客户端临时端口' },
        { name:'长度', value:'64 bytes', desc:'UDP 头(8B) + DNS 响应数据(56B)' },
        { name:'校验和', value:'0x3C4D', desc:'服务器填写的响应校验和' },
        { name:'数据', value:'DNS Response: 93.184.216.34', desc:'直接回复，无需 ACK 确认' },
      ],
      narration:'服务器收到 UDP 数据报后直接处理并回复，无需维护连接状态。UDP 是无状态的——每个数据报都独立处理，极大降低服务器开销。',
    },
    {
      banner:'📤 第 3 / 4 步 — 客户端无需等待 ACK，直接发送下一个数据报',
      leftState:'连续发送', rightState:'监听中',
      fields:[
        { name:'特性', value:'无确认', desc:'UDP 不等待 ACK，可连续高速发送' },
        { name:'适用场景', value:'实时音视频', desc:'允许少量丢包，延迟敏感' },
        { name:'对比 TCP', value:'无重传', desc:'TCP 丢包会重传，UDP 直接丢弃' },
        { name:'吞吐量', value:'更高', desc:'省去了 TCP 的拥塞控制和流量控制开销' },
      ],
      narration:'UDP 的核心优势是高吞吐、低延迟。视频会议、游戏、直播等实时应用首选 UDP——偶尔丢一帧影响不大，但延迟高了体验就崩了。',
    },
    {
      banner:'✅ 第 4 / 4 步 — UDP 数据报传输完成，无连接关闭过程',
      leftState:'完成', rightState:'完成',
      fields:[
        { name:'UDP vs TCP', value:'无连接 vs 面向连接', desc:'UDP 无握手/挥手，TCP 三次握手+四次挥手' },
        { name:'可靠性', value:'不可靠', desc:'UDP 不保证送达、不保序、不去重' },
        { name:'头部开销', value:'8 bytes', desc:'仅4个字段：源端口/目标端口/长度/校验和' },
        { name:'典型应用', value:'DNS/DHCP/NTP/视频流', desc:'凡是对速度敏感、允许少量丢包的都用 UDP' },
      ],
      narration:'UDP 传输结束后直接结束，无需四次挥手。轻量是 UDP 最大的优势：8字节头部、无状态、无拥塞控制，适合实时性要求高的场景。',
    },
  ],
  knowledge: [
    { label:'头部字段', value:'源端口 / 目标端口 / 长度 / 校验和，仅 8 字节' },
    { label:'无连接特性', value:'无握手/挥手，应用数据直接封装发送' },
    { label:'不可靠性', value:'不保证送达，不保序，不去重，丢包需应用层处理' },
    { label:'典型应用', value:'DNS(53)、DHCP(67/68)、NTP(123)、RTP 实时音视频' },
    { label:'对比 TCP', value:'UDP 头仅 8B vs TCP 头最小 20B；无拥塞控制；无连接状态' },
  ],
  quiz: [
    { q:'UDP 头部总共有几个字段？', options:['2个','4个','6个','8个'], answer:1,
      exp:'UDP 头部只有 4 个字段：源端口、目标端口、长度、校验和，共 8 字节，极为精简。' },
    { q:'以下哪种应用最适合使用 UDP？', options:['网上银行转账','视频通话','文件下载','SSH 远程登录'], answer:1,
      exp:'视频通话对延迟敏感，允许少量丢帧，UDP 低延迟优势明显。银行转账、文件下载、SSH 都需要可靠传输，应使用 TCP。' },
    { q:'UDP 丢包后会发生什么？', options:['自动重传','通知发送方重发','直接丢弃，不做处理','降低发送速率'], answer:2,
      exp:'UDP 本身不处理丢包，数据报丢失后直接丢弃。如需重传，必须由应用层自行实现（如 QUIC、RTP 的重传机制）。' },
    { q:'DNS 查询使用 UDP 而非 TCP 的主要原因是？', options:['UDP 更安全','DNS 数据量小且对速度敏感','DNS 不需要端口号','TCP 不支持 DNS'], answer:1,
      exp:'DNS 查询/响应数据量通常小于 512 字节，一个 RTT 即可完成。使用 UDP 省去 TCP 三次握手的延迟，大幅加速解析速度。' },
  ],
};

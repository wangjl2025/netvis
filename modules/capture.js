/*!
 * modules/capture.js — 抓包对照模式（初版）
 * 展示各协议对应的模拟 Wireshark 风格报文，与步进动画同步高亮
 * 懒加载 2800ms，不阻塞主线程
 */
(function () {
  'use strict';

  /* ── 各协议的模拟抓包数据 ──────────────────────────────────────────────
   * frames: 报文帧列表，每帧包含 no/time/src/dst/proto/info/detail
   * stepMap: 步骤序号 → 对应高亮的帧编号数组（1-based）
   * ──────────────────────────────────────────────────────────────────── */
  const CAPTURE_DB = {

    tcp3: {
      title: 'TCP 三次握手 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',   dst:'93.184.216.34',  proto:'TCP',  info:'54321 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 WS=256',
          detail: '以太网帧头: 0800  IP: IHL=20 TTL=64  TCP: SYN=1 ACK=0 SEQ=1000000000 WIN=64240' },
        { no:2,  time:'0.028312', src:'93.184.216.34',  dst:'192.168.1.10',   proto:'TCP',  info:'80 → 54321 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0',
          detail: 'TCP: SYN=1 ACK=1 SEQ=2000000000 ACK=1000000001 WIN=65535' },
        { no:3,  time:'0.028401', src:'192.168.1.10',   dst:'93.184.216.34',  proto:'TCP',  info:'54321 → 80 [ACK] Seq=1 Ack=1 Win=64240 Len=0',
          detail: 'TCP: SYN=0 ACK=1 SEQ=1000000001 ACK=2000000001 WIN=64240' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3] },
    },

    tcp4: {
      title: 'TCP 四次挥手 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'TCP',  info:'54321 → 80 [FIN, ACK] Seq=1 Ack=1 Win=64240 Len=0',
          detail: 'TCP: FIN=1 ACK=1 SEQ=1000000001 ACK=2000000001' },
        { no:2,  time:'0.022100', src:'93.184.216.34',  dst:'192.168.1.10',  proto:'TCP',  info:'80 → 54321 [ACK] Seq=1 Ack=2 Win=65535 Len=0',
          detail: 'TCP: FIN=0 ACK=1 SEQ=2000000001 ACK=1000000002' },
        { no:3,  time:'0.041820', src:'93.184.216.34',  dst:'192.168.1.10',  proto:'TCP',  info:'80 → 54321 [FIN, ACK] Seq=1 Ack=2 Win=65535 Len=0',
          detail: 'TCP: FIN=1 ACK=1 SEQ=2000000001 ACK=1000000002' },
        { no:4,  time:'0.042001', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'TCP',  info:'54321 → 80 [ACK] Seq=2 Ack=2 Win=64240 Len=0',
          detail: 'TCP: FIN=0 ACK=1 SEQ=1000000002 ACK=2000000002  // TIME_WAIT 2×MSL' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4] },
    },

    dns: {
      title: 'DNS 递归查询 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',  dst:'8.8.8.8',         proto:'DNS',  info:'Standard query 0x3f01 A example.com',
          detail: 'UDP: Sport=53201 Dport=53 Len=32\nDNS: ID=0x3f01 QR=0 OPCODE=0 RD=1\nQDCOUNT=1  QNAME=example.com  QTYPE=A  QCLASS=IN' },
        { no:2,  time:'0.002130', src:'8.8.8.8',        dst:'192.168.1.10',   proto:'DNS',  info:'Standard query response 0x3f01 A example.com CNAME www.example.com A 93.184.216.34',
          detail: 'DNS: ID=0x3f01 QR=1 AA=0 TC=0 RA=1 RCODE=0\nANCOUNT=1  A 93.184.216.34  TTL=86400' },
        { no:3,  time:'0.002200', src:'8.8.8.8',        dst:'192.168.1.10',   proto:'DNS',  info:'[Cached] TTL=86400 → response from cache',
          detail: 'DNS 解析器将结果缓存，TTL=86400 秒（24h）。下次相同查询命中缓存，不再向根服务器发起迭代。' },
      ],
      stepMap: { 1:[1], 2:[1], 3:[1], 4:[1], 5:[1], 6:[1], 7:[2], 8:[3] },
    },

    http: {
      title: 'HTTP 请求 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'HTTP', info:'GET /index.html HTTP/1.1',
          detail: 'GET /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Mozilla/5.0\r\nAccept: text/html\r\nConnection: keep-alive\r\n' },
        { no:2,  time:'0.030100', src:'93.184.216.34',  dst:'192.168.1.10',  proto:'HTTP', info:'HTTP/1.1 200 OK (text/html)',
          detail: 'HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: 1256\r\nConnection: keep-alive\r\nCache-Control: max-age=86400\r\n\r\n<!DOCTYPE html>...' },
        { no:3,  time:'0.030500', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'TCP',  info:'54321 → 80 [ACK] 确认收到响应',
          detail: 'TCP: ACK=1  // HTTP keep-alive，连接保持，可继续复用' },
      ],
      stepMap: { 1:[1], 2:[1], 3:[2], 4:[3], 5:[3] },
    },

    tls: {
      title: 'TLS 1.3 握手 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'TLSv1.3', info:'Client Hello',
          detail: 'TLS Record: ContentType=22(Handshake) Version=TLS1.0(兼容)\nHandshake: ClientHello\n  Version: TLS 1.3\n  Random: 32字节随机数\n  Cipher Suites: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256\n  Extensions: supported_versions, key_share (x25519), server_name=example.com' },
        { no:2,  time:'0.031200', src:'93.184.216.34',  dst:'192.168.1.10',  proto:'TLSv1.3', info:'Server Hello, Change Cipher Spec',
          detail: 'ServerHello: Version=TLS1.3  Selected: TLS_AES_256_GCM_SHA384\n  key_share: 服务端公钥 (x25519)\nChangeCipherSpec: 0x01  // 兼容性消息\nEncryptedExtensions + Certificate + CertificateVerify + Finished（已加密）' },
        { no:3,  time:'0.032100', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'TLSv1.3', info:'Change Cipher Spec, Finished',
          detail: 'ChangeCipherSpec: 0x01\nFinished: HMAC(HandshakeMessages)  // 验证握手完整性\n→ 握手完成，双方已协商会话密钥，后续全部 AEAD 加密' },
        { no:4,  time:'0.032500', src:'192.168.1.10',  dst:'93.184.216.34',  proto:'TLSv1.3', info:'Application Data (encrypted)',
          detail: 'TLS Record: ContentType=23(ApplicationData)\n实际内容已被 AES-256-GCM 加密，Wireshark 无法解密（除非有私钥或 SSLKEYLOGFILE）\n长度: 可见，但内容不可见' },
        { no:5,  time:'0.032900', src:'93.184.216.34',  dst:'192.168.1.10',  proto:'TLSv1.3', info:'Application Data (encrypted)',
          detail: '服务端加密响应，内容对中间节点完全不透明。TLS 1.3 还支持 0-RTT 会话恢复（本例为标准 1-RTT 首次建立）。' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[5] },
    },

    arp: {
      title: 'ARP 地址解析 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',  dst:'Broadcast',       proto:'ARP',  info:'Who has 192.168.1.1? Tell 192.168.1.10',
          detail: '以太网: DST=ff:ff:ff:ff:ff:ff (广播)  SRC=aa:bb:cc:dd:ee:01\nARP: HTYPE=1(Ethernet) PTYPE=0x0800(IPv4)\n  Sender MAC=aa:bb:cc:dd:ee:01  Sender IP=192.168.1.10\n  Target MAC=00:00:00:00:00:00  Target IP=192.168.1.1  OPCODE=1(Request)' },
        { no:2,  time:'0.001200', src:'192.168.1.1',   dst:'192.168.1.10',    proto:'ARP',  info:'192.168.1.1 is at 11:22:33:44:55:66',
          detail: '以太网: DST=aa:bb:cc:dd:ee:01  SRC=11:22:33:44:55:66\nARP: Sender MAC=11:22:33:44:55:66  Sender IP=192.168.1.1\n  Target MAC=aa:bb:cc:dd:ee:01  Target IP=192.168.1.10  OPCODE=2(Reply)' },
        { no:3,  time:'0.001300', src:'192.168.1.10',  dst:'192.168.1.1',     proto:'ICMP', info:'Echo (ping) request，ARP缓存已更新',
          detail: 'ARP 缓存更新后，后续 IP 报文直接封装目标 MAC，无需再 ARP。\nARP 缓存默认保留 20 分钟（Linux），之后重新发起 ARP。' },
      ],
      stepMap: { 1:[1], 2:[1], 3:[2], 4:[3] },
    },

    icmp: {
      title: 'ICMP/Ping — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',  dst:'8.8.8.8',         proto:'ICMP', info:'Echo (ping) request  id=0x0001, seq=1/256, ttl=64',
          detail: 'IP: TTL=64 Proto=1(ICMP) Src=192.168.1.10 Dst=8.8.8.8\nICMP: Type=8 Code=0 Checksum=0x4f51\n  Identifier=0x0001  Seq=1  Data=48字节 (timestamp+padding)' },
        { no:2,  time:'0.013420', src:'8.8.8.8',        dst:'192.168.1.10',   proto:'ICMP', info:'Echo (ping) reply    id=0x0001, seq=1/256, ttl=117',
          detail: 'IP: TTL=117 (Google 出发 TTL≈128，经过约11跳)\nICMP: Type=0 Code=0 Checksum=0x574f\n  Identifier=0x0001  Seq=1  RTT=13.42ms' },
        { no:3,  time:'1.001000', src:'192.168.1.10',  dst:'8.8.8.8',         proto:'ICMP', info:'Echo (ping) request  id=0x0001, seq=2/512, ttl=64',
          detail: 'Seq=2，每秒发一个 ICMP Echo，统计丢包率和 RTT' },
        { no:4,  time:'1.014800', src:'8.8.8.8',        dst:'192.168.1.10',   proto:'ICMP', info:'Echo (ping) reply    id=0x0001, seq=2/512, ttl=117',
          detail: 'RTT=13.80ms — 4 packets transmitted, 4 received, 0% packet loss\navg RTT = 13.61ms' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[4] },
    },

    vlan: {
      title: 'VLAN 802.1Q — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'aa:bb:cc:dd:ee:01',  dst:'ff:ff:ff:ff:ff:ff', proto:'802.1Q', info:'Ethernet II, tagged VID=10 | ARP Who has 192.168.10.20?',
          detail: '以太网帧头（含 802.1Q 标签）:\n  Dst: ff:ff:ff:ff:ff:ff  Src: aa:bb:cc:dd:ee:01\n  802.1Q Tag: TPID=0x8100  PCP=0  DEI=0  VID=10\n  EtherType: 0x0806 (ARP)\nAccess 口收到无标签帧 → 打上 PVID=10 的 802.1Q 标签' },
        { no:2,  time:'0.000100', src:'aa:bb:cc:dd:ee:01',  dst:'ff:ff:ff:ff:ff:ff', proto:'802.1Q', info:'[Trunk Port] Forward tagged frame VLAN 10 → SW2',
          detail: 'Trunk 口保留 802.1Q 标签转发:\n  VID=10 帧在 Trunk 链路上跨交换机传输\n  VLAN 10 和 VLAN 20 帧共享同一物理链路，靠 VID 区分\n  Native VLAN (VLAN 1) 的帧在 Trunk 口不打标签' },
        { no:3,  time:'0.000200', src:'aa:bb:cc:dd:ee:01',  dst:'ff:ff:ff:ff:ff:ff', proto:'ARP',    info:'[Access Port SW2] Strip 802.1Q tag → ARP Who has 192.168.10.20?',
          detail: 'SW2 Access 口（PVID=10）剥离 802.1Q 标签:\n  VID=10 匹配端口 PVID → 允许转发\n  发给终端的帧已还原为标准以太网帧（无 802.1Q 标签）\n  终端设备对 VLAN 标签完全透明' },
        { no:4,  time:'0.000500', src:'ff:ee:dd:cc:bb:aa',  dst:'aa:bb:cc:dd:ee:01', proto:'ARP',    info:'ARP Reply: 192.168.10.20 is at ff:ee:dd:cc:bb:aa',
          detail: 'ARP 回复 → SW2 Access 口打上 VID=10 标签 → Trunk → SW1 剥标签 → 发给 PC1\nVLAN 内的通信流程对终端完全透明，交换机负责标签的打/剥工作' },
        { no:5,  time:'0.010000', src:'192.168.10.10',       dst:'192.168.20.30',     proto:'IPv4',   info:'Inter-VLAN: VLAN10→VLAN20 via Router/SVI (TTL=64)',
          detail: '跨 VLAN 通信必须经过三层路由:\n  PC1(VLAN10) → SVI 192.168.10.1（默认网关）→ 路由 → SVI 192.168.20.1 → PC4(VLAN20)\n  路由器/三层交换机收到帧后: 剥标签 → 查路由表 → 重新打目标 VLAN 标签' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[5] },
    },

    ftp: {
      title: 'FTP 文件传输（被动模式）— 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'TCP',  info:'[Control] 12345 → 21 [SYN] Seq=0  (建立控制连接)',
          detail: 'TCP 三次握手建立控制连接（端口 21）:\n  客户端: 192.168.1.10:12345\n  服务器: 192.168.1.100:21\n  TCP SYN→SYN-ACK→ACK 完成后开始 FTP 对话' },
        { no:2,  time:'0.005000', src:'192.168.1.100',  dst:'192.168.1.10',   proto:'FTP',  info:'220 FTP Server Ready (ProFTPD)',
          detail: 'FTP 响应码 220: Service ready\n服务器欢迎信息通过控制连接发送\nFTP 控制通道: 纯文本 ASCII 协议，可用 telnet 手动操作' },
        { no:3,  time:'0.010000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'FTP',  info:'USER alice',
          detail: 'FTP 命令: USER alice\n⚠️ 用户名以明文传输（无加密）\n服务器返回: 331 Password required for alice' },
        { no:4,  time:'0.015000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'FTP',  info:'PASV  (请求被动模式)',
          detail: 'FTP 命令: PASV\n服务器将监听一个高位端口，等待客户端发起数据连接\n响应: 227 Entering Passive Mode (192,168,1,100,19,136)\n  → 端口 = 19×256 + 136 = 5000' },
        { no:5,  time:'0.020000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'TCP',  info:'[Data] 23456 → 5000 [SYN]  (建立数据连接)',
          detail: '客户端连接服务器的 PASV 端口 5000，建立数据连接（第二条 TCP）:\n  数据连接: 192.168.1.10:23456 → 192.168.1.100:5000\n  控制连接仍然保持，两条 TCP 连接并存' },
        { no:6,  time:'0.025000', src:'192.168.1.100',  dst:'192.168.1.10',   proto:'FTP-DATA', info:'file.tar.gz (1.2MB) 数据传输中',
          detail: 'FTP 数据通过数据连接传输:\n  FTP 命令: RETR file.tar.gz（通过控制连接发送）\n  文件二进制流通过数据连接传输（TYPE I 二进制模式）\n  传输完成后数据连接关闭: 226 Transfer Complete' },
        { no:7,  time:'1.240000', src:'192.168.1.100',  dst:'192.168.1.10',   proto:'FTP',  info:'226 Transfer Complete. Closing data connection.',
          detail: '数据传输完成:\n  控制连接发送: 226 Transfer Complete\n  数据连接 TCP FIN 关闭（四次挥手）\n  控制连接继续保持，可发送更多命令' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3,4], 4:[4], 5:[5], 6:[6], 7:[7] },
    },

    ospf: {
      title: 'OSPF 邻居建立 — 模拟抓包',
      frames: [
        { no:1,  time:'0.000000', src:'192.168.12.1',   dst:'224.0.0.5',      proto:'OSPF', info:'Hello  Router-ID: 1.1.1.1  Area: 0.0.0.0  Priority: 1',
          detail: 'OSPF Hello 包:\n  IP Src=192.168.12.1 Dst=224.0.0.5 (AllSPFRouters)\n  IP Proto=89 (OSPF)\n  OSPF Header: Version=2 Type=1(Hello) Router-ID=1.1.1.1 Area=0\n  Hello Interval=10s  Dead Interval=40s  DR=0.0.0.0  BDR=0.0.0.0\n  Neighbor List: (空，未发现邻居)' },
        { no:2,  time:'0.010000', src:'192.168.12.2',   dst:'224.0.0.5',      proto:'OSPF', info:'Hello  Router-ID: 2.2.2.2  Area: 0.0.0.0  Neighbor: 1.1.1.1',
          detail: 'R2 收到 R1 的 Hello，回复自己的 Hello 并在邻居列表中列出 1.1.1.1:\n  邻居列表中出现对方 ID → R1 进入 2-Way 状态（双向通信）\n  点对点链路：不需要选举 DR/BDR，直接进入 ExStart' },
        { no:3,  time:'0.020000', src:'192.168.12.1',   dst:'192.168.12.2',   proto:'OSPF', info:'DBD  Seq=1001  I=1 M=1 MS=1  (ExStart: 协商主从)',
          detail: 'OSPF DBD (Database Description) 包 - ExStart 阶段:\n  Type=2(DBD)  I=1(Initial) M=1(More) MS=1(Master)\n  R1 自认 Master，发送初始 DBD 协商序列号\n  Router-ID 较大的成为 Master（本例 2.2.2.2 > 1.1.1.1）' },
        { no:4,  time:'0.025000', src:'192.168.12.2',   dst:'192.168.12.1',   proto:'OSPF', info:'DBD  Seq=2001  I=0 M=1 MS=1  (Exchange: 发送 LSDB 摘要)',
          detail: 'OSPF DBD - Exchange 阶段 (R2 为 Master):\n  包含 R2 的 LSDB 中各 LSA 的摘要（类型/Router-ID/LS Seq/校验和）\n  R1 对比后发现自己缺少某些 LSA，将发送 LSR 请求' },
        { no:5,  time:'0.030000', src:'192.168.12.1',   dst:'192.168.12.2',   proto:'OSPF', info:'LSR  (Link State Request: 请求 2 条缺失的 LSA)',
          detail: 'OSPF LSR (Link State Request):\n  Type=3(LSR)  请求 R1 在 DBD 对比后发现缺少的 LSA\n  请求格式: LSA Type + LSID + Advertising Router\n  R1 进入 Loading 状态' },
        { no:6,  time:'0.035000', src:'192.168.12.2',   dst:'192.168.12.1',   proto:'OSPF', info:'LSU  (Link State Update: 2 × Type-1 Router-LSA)',
          detail: 'OSPF LSU (Link State Update) 响应 LSR:\n  Type=4(LSU)  包含 2 条完整 Router-LSA (Type-1)\n  每条 LSA 包含该路由器所有接口的链路状态信息\n  R1 收到后存入 LSDB，并向其他邻居继续泛洪' },
        { no:7,  time:'0.040000', src:'192.168.12.1',   dst:'192.168.12.2',   proto:'OSPF', info:'LSAck  ->  Full State! SPF 触发计算',
          detail: 'OSPF LSAck (Link State Acknowledgment):\n  Type=5(LSAck)  确认收到 LSU\n  LSDB 同步完成 -> 邻接状态进入 Full\n  触发 Dijkstra SPF 算法重新计算最优路径 -> 更新路由表' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[6], 7:[7] },
    },

    // ── 以下为新增协议（Week7 扩展）─────────────────────────────────────

    dhcp: {
      title: 'DHCP 地址分配 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'0.0.0.0',        dst:'255.255.255.255', proto:'DHCP', info:'DHCP Discover  xid=0x3903F326  从 0.0.0.0 广播',
          detail: 'Ethernet: DST=ff:ff:ff:ff:ff:ff (广播)  SRC=aa:bb:cc:dd:ee:ff\nIP: Src=0.0.0.0 Dst=255.255.255.255  TTL=128\nUDP: Sport=68 Dport=67\nDHCP:\n  op=1(BOOTREQUEST)  htype=1(Ethernet)\n  xid=0x3903F326  (事务ID，匹配后续报文)\n  chaddr=aa:bb:cc:dd:ee:ff (客户端MAC)\n  Option 53=1 (Discover)  Option 55=参数请求列表' },
        { no:2, time:'0.001500', src:'192.168.1.1',    dst:'255.255.255.255', proto:'DHCP', info:'DHCP Offer  xid=0x3903F326  提供 192.168.1.100',
          detail: 'DHCP Offer:\n  op=2(BOOTREPLY)  xid=0x3903F326 (匹配Discover)\n  yiaddr=192.168.1.100  (提供给客户端的IP)\n  siaddr=192.168.1.1   (DHCP服务器地址)\n  Option 53=2 (Offer)\n  Option 51=86400 (租约86400秒=24h)\n  Option 1=255.255.255.0 (子网掩码)\n  Option 3=192.168.1.1 (默认网关)\n  Option 6=114.114.114.114 (DNS服务器)' },
        { no:3, time:'0.002000', src:'0.0.0.0',        dst:'255.255.255.255', proto:'DHCP', info:'DHCP Request  xid=0x3903F326  广播选择 192.168.1.100',
          detail: 'DHCP Request (仍然广播，通知所有DHCP服务器):\n  op=1(BOOTREQUEST)  xid=0x3903F326\n  Option 53=3 (Request)\n  Option 54=192.168.1.1 (选定的DHCP服务器)\n  Option 50=192.168.1.100 (请求的IP地址)\n  广播原因: 若有多个DHCP服务器发了Offer，其他服务器需要知道自己的Offer未被选中' },
        { no:4, time:'0.003200', src:'192.168.1.1',    dst:'255.255.255.255', proto:'DHCP', info:'DHCP ACK  xid=0x3903F326  192.168.1.100 租约已生效',
          detail: 'DHCP ACK (确认，正式分配地址):\n  op=2(BOOTREPLY)  xid=0x3903F326\n  yiaddr=192.168.1.100  (正式分配的IP)\n  Option 53=5 (ACK)\n  Option 51=86400 (租约时长)\n  Option 58=43200 (T1续约时间，租约50%时重新请求)\n  Option 59=75600 (T2重绑定时间，租约87.5%时广播)\n  客户端收到ACK后配置IP，并发ARP检测地址冲突' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4] },
    },

    smtp: {
      title: 'SMTP 邮件发送 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',   dst:'smtp.gmail.com',  proto:'TCP',  info:'12345 -> 587 [SYN]  建立到 SMTP 服务器的 TCP 连接',
          detail: 'TCP 三次握手:\n  192.168.1.10:12345 -> smtp.gmail.com:587\n  端口 587: 邮件客户端提交端口 (STARTTLS)\n  端口 465: SMTPS (SSL/TLS 直连)\n  端口 25: 服务器间中继 (运营商通常封锁)' },
        { no:2, time:'0.031000', src:'smtp.gmail.com',  dst:'192.168.1.10',   proto:'SMTP', info:'220 smtp.gmail.com ESMTP  服务就绪',
          detail: 'SMTP 220 响应:\n  "220 smtp.gmail.com ESMTP 20201208071745 - gsmtp"\n  220 = Service ready\n  ESMTP = Extended SMTP (RFC 1869)\n  客户端收到 220 后发送 EHLO' },
        { no:3, time:'0.032000', src:'192.168.1.10',   dst:'smtp.gmail.com',  proto:'SMTP', info:'EHLO mail.alice.com  ->  250 能力协商',
          detail: 'EHLO/ESMTP 能力协商:\n>> EHLO mail.alice.com\n<< 250-smtp.gmail.com at your service\n<< 250-SIZE 35882577\n<< 250-8BITMIME\n<< 250-AUTH LOGIN PLAIN XOAUTH2\n<< 250-STARTTLS\n<< 250 ENHANCEDSTATUSCODES\n\nSTARTTLS 升级后，后续命令在 TLS 隧道内传输' },
        { no:4, time:'0.100000', src:'192.168.1.10',   dst:'smtp.gmail.com',  proto:'SMTP', info:'AUTH LOGIN  Base64(用户名+密码)  ->  235 认证成功',
          detail: 'SMTP AUTH LOGIN:\n>> AUTH LOGIN\n<< 334 VXNlcm5hbWU6  (Base64: "Username:")\n>> YWxpY2VAZ21haWwuY29t  (Base64: alice@gmail.com)\n<< 334 UGFzc3dvcmQ6  (Base64: "Password:")\n>> YXBwLXBhc3N3b3Jk  (Base64: app-password)\n<< 235 2.7.0 Accepted\n\n警告: Base64 != 加密！必须配合 TLS，否则等同明文' },
        { no:5, time:'0.110000', src:'192.168.1.10',   dst:'smtp.gmail.com',  proto:'SMTP', info:'MAIL FROM / RCPT TO / DATA  ->  354 开始输入',
          detail: '邮件信封与正文:\n>> MAIL FROM:<alice@gmail.com>\n<< 250 2.1.0 OK\n>> RCPT TO:<bob@example.com>\n<< 250 2.1.5 OK\n>> DATA\n<< 354 End data with <CR><LF>.<CR><LF>\n>> From: Alice <alice@gmail.com>\n>> To: Bob <bob@example.com>\n>> Subject: Hello from NetVis\n>> \n>> 邮件正文内容...\n>> .\n<< 250 2.0.0 OK: queued as abc123' },
        { no:6, time:'0.150000', src:'192.168.1.10',   dst:'smtp.gmail.com',  proto:'SMTP', info:'QUIT  ->  221 再见，连接关闭',
          detail: '>> QUIT\n<< 221 2.0.0 closing connection\nTCP FIN 四次挥手，连接正常关闭\n\n邮件流向:\n  Alice MUA -> Gmail SMTP (587)\n  Gmail SMTP -> Bob MX (25, MX记录)\n  Bob MTA -> Bob MDA -> Bob MUA' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[6] },
    },

    ssh: {
      title: 'SSH 安全登录 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'TCP',  info:'54321 -> 22 [SYN]  建立 TCP 连接到 SSH 服务器',
          detail: 'TCP 三次握手:\n  192.168.1.10:54321 -> 192.168.1.100:22\n  端口 22: SSH 默认端口\n  TCP SYN -> SYN-ACK -> ACK\n  建立连接后双方立即交换 SSH 版本字符串' },
        { no:2, time:'0.005000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'SSHv2', info:'SSH-2.0-OpenSSH_9.0 版本交换',
          detail: '版本字符串交换 (明文):\n  Client: "SSH-2.0-OpenSSH_9.0\\r\\n"\n  Server: "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.1\\r\\n"\n\n  格式: SSH-<protoversion>-<softwareversion>\n  双方确认均支持 SSH-2.0 后继续\n  SSH-1 已废弃（存在严重安全漏洞）' },
        { no:3, time:'0.006000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'SSHv2', info:'SSH2_MSG_KEXINIT  算法协商 (14种算法列表)',
          detail: 'Key Exchange Init (双向发送，协商算法):\n  kex_algorithms: curve25519-sha256, ecdh-sha2-nistp256\n  host_key_algorithms: ecdsa-sha2-nistp256, ssh-rsa\n  encryption_c2s: aes256-gcm@openssh.com, chacha20-poly1305\n  encryption_s2c: aes256-gcm@openssh.com, chacha20-poly1305\n  mac_algorithms: hmac-sha2-256\n  compression: none\n  取交集选出双方都支持的算法' },
        { no:4, time:'0.008000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'SSHv2', info:'SSH2_MSG_KEX_ECDH_INIT/REPLY  ECDH 密钥交换',
          detail: 'ECDH (curve25519) 密钥交换:\n  Client -> Server: SSH2_MSG_KEX_ECDH_INIT\n    Q_C: 客户端 ECDH 临时公钥 (32字节)\n  Server -> Client: SSH2_MSG_KEX_ECDH_REPLY\n    K_S: 服务器主机公钥\n    Q_S: 服务器 ECDH 临时公钥\n    Signature: 服务器用主机私钥签名，客户端验证服务器身份\n  双方用 ECDH 推导出相同的共享密钥 K\n  -> 会话密钥从 K + 随机数 派生' },
        { no:5, time:'0.010000', src:'192.168.1.100',  dst:'192.168.1.10',   proto:'SSHv2', info:'SSH2_MSG_NEWKEYS  加密信道建立，后续全部加密',
          detail: 'New Keys 消息:\n  双方各发送 SSH2_MSG_NEWKEYS\n  发送后立即切换到协商的加密算法\n  后续所有流量: AES-256-GCM 加密 + HMAC-SHA2-256 完整性\n  Wireshark 显示: "Encrypted packet (len=XX)"\n  (需要私钥或 SSLKEYLOGFILE 才能解密)' },
        { no:6, time:'0.012000', src:'192.168.1.10',   dst:'192.168.1.100',  proto:'SSHv2', info:'[Encrypted] 用户认证 + Shell 信道 (已加密)',
          detail: '以下均为加密数据，Wireshark 仅显示长度:\n  SSH2_MSG_SERVICE_REQUEST: ssh-userauth\n  SSH2_MSG_USERAUTH_REQUEST:\n    用户名/认证方式(publickey 或 password)\n  SSH2_MSG_USERAUTH_SUCCESS\n  SSH2_MSG_CHANNEL_OPEN: session\n  SSH2_MSG_CHANNEL_REQUEST: pty-req, shell\n  SSH2_MSG_CHANNEL_DATA: 终端交互数据\n\n  公钥认证: 更安全，服务器存储公钥，私钥不离开客户端' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[6] },
    },

    nat: {
      title: 'NAT 地址转换（SNAT）— 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.100', dst:'8.8.8.8',          proto:'TCP',  info:'[LAN] 5000 -> 80 [SYN]  私网包，源IP=192.168.1.100',
          detail: '内网发出的原始数据包:\n  以太网帧: SRC_MAC=AA:BB:CC:11:11:11  DST_MAC=网关MAC\n  IP: Src=192.168.1.100 (私网地址，RFC 1918)\n      Dst=8.8.8.8 (公网地址)\n  TCP: SPort=5000  DPort=80  [SYN]\n\n  问题: 192.168.x.x 是私有地址，互联网路由器会丢弃\n  -> 数据包先到达 NAT 网关 (192.168.1.1)' },
        { no:2, time:'0.000100', src:'203.0.113.1',   dst:'8.8.8.8',          proto:'TCP',  info:'[WAN] 40001 -> 80 [SYN]  NAT 替换源地址后转发',
          detail: 'NAT 网关修改后的数据包:\n  IP: Src=203.0.113.1 (公网IP)  Dst=8.8.8.8\n  TCP: SPort=40001 (NAT分配的端口)  DPort=80\n\n  NAT 转换记录 (NAPT 表):\n  192.168.1.100:5000  <->  203.0.113.1:40001\n  协议: TCP  状态: SYN_SENT\n\n  对外界来看，请求来自 203.0.113.1:40001，内网被隐藏' },
        { no:3, time:'0.030000', src:'8.8.8.8',        dst:'203.0.113.1',     proto:'TCP',  info:'[WAN] 80 -> 40001 [SYN,ACK]  公网响应返回',
          detail: '公网服务器响应到 NAT 的公网地址:\n  IP: Src=8.8.8.8  Dst=203.0.113.1\n  TCP: SPort=80  DPort=40001  [SYN,ACK]\n\n  NAT 网关收到此包:\n  查 NAPT 表: 203.0.113.1:40001 -> 192.168.1.100:5000\n  -> 修改目标地址为内网地址' },
        { no:4, time:'0.030200', src:'8.8.8.8',        dst:'192.168.1.100',   proto:'TCP',  info:'[LAN] 80 -> 5000 [SYN,ACK]  还原后转发给内网主机',
          detail: 'NAT 反向转换后转发给内网:\n  IP: Src=8.8.8.8  Dst=192.168.1.100 (已还原)\n  TCP: SPort=80  DPort=5000 (已还原)\n\n  内网主机 192.168.1.100 收到响应，对 NAT 过程完全透明\n  从 192.168.1.100 视角: 直接与 8.8.8.8 通信' },
        { no:5, time:'0.031000', src:'192.168.1.101',  dst:'8.8.8.8',          proto:'TCP',  info:'[LAN] 6000 -> 80  另一台内网主机共享同一公网IP',
          detail: '多设备 NAPT (网络地址端口转换):\n  设备1: 192.168.1.100:5000  <->  203.0.113.1:40001\n  设备2: 192.168.1.101:6000  <->  203.0.113.1:40002\n  设备3: 192.168.1.102:7000  <->  203.0.113.1:40003\n  ...\n\n  NAT 优点: 节省IPv4地址，数百台设备共享1个公网IP\n  NAT 缺点: 破坏端到端透明性，P2P/VoIP/游戏需特殊处理' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5] },
    },

    websocket: {
      title: 'WebSocket 全双工通信 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',   dst:'chat.example.com', proto:'HTTP', info:'GET /ws HTTP/1.1  Upgrade: websocket  握手请求',
          detail: 'HTTP Upgrade 请求 (明文 HTTP，端口80；或 HTTPS 端口443):\nGET /ws HTTP/1.1\nHost: chat.example.com\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\nSec-WebSocket-Version: 13\nOrigin: https://chat.example.com\n\nSec-WebSocket-Key: 随机16字节Base64编码\n服务器将此值拼接魔法字符串后SHA1，返回Accept验证' },
        { no:2, time:'0.031000', src:'chat.example.com', dst:'192.168.1.10',  proto:'HTTP', info:'HTTP/1.1 101 Switching Protocols  协议升级成功',
          detail: 'HTTP 101 响应:\nHTTP/1.1 101 Switching Protocols\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\n\nAccept 计算: SHA1(Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")\n-> Base64编码\n\n101后 HTTP 连接升级为 WebSocket，不再是 HTTP' },
        { no:3, time:'0.032000', src:'192.168.1.10',   dst:'chat.example.com', proto:'WebSocket', info:'WS Text Frame  FIN=1 Mask=1  "Hello, server!"',
          detail: 'WebSocket 数据帧格式:\n  Byte 0: FIN=1(最后一帧) RSV=000 Opcode=0x1(Text)\n  Byte 1: MASK=1(客户端必须掩码) Payload Len=15\n  Masking Key: 4字节随机掩码\n  Payload: XOR(数据, 掩码) = "Hello, server!"\n\n客户端->服务器必须掩码 (防缓存中间件误解)\n服务器->客户端不掩码' },
        { no:4, time:'0.033000', src:'chat.example.com', dst:'192.168.1.10',  proto:'WebSocket', info:'WS Text Frame  FIN=1 Mask=0  "Hello, client!"',
          detail: 'WebSocket 服务器响应帧:\n  Byte 0: FIN=1 RSV=000 Opcode=0x1(Text)\n  Byte 1: MASK=0(服务器不掩码) Payload Len=15\n  Payload: "Hello, client!" (明文，无掩码)\n\nWebSocket vs HTTP 长轮询:\n  HTTP: 每次请求都有完整头部(~500B)\n  WebSocket: 帧头仅2~10字节，效率极高\n\nPing/Pong Opcode: 0x9/0xA (心跳保活)' },
        { no:5, time:'60.000000', src:'192.168.1.10',  dst:'chat.example.com', proto:'WebSocket', info:'WS Close Frame  Opcode=0x8  Code=1000 (正常关闭)',
          detail: 'WebSocket 关闭握手:\n  Client -> Server: Close Frame\n    Opcode=0x8  Payload: 0x03E8 "Normal Closure"\n    Status Code 1000: 正常关闭\n  Server -> Client: Close Frame (回应)\n  TCP FIN 四次挥手\n\n关闭状态码:\n  1000: 正常关闭\n  1001: 端点离开(浏览器导航)\n  1006: 连接异常断开(无Close帧)\n  1008: 策略违反' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5] },
    },

    udp: {
      title: 'UDP 无连接传输 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',   dst:'8.8.8.8',          proto:'UDP',  info:'5000 -> 53 Len=40  DNS Query (无握手直接发送)',
          detail: 'UDP 数据报 (无需建立连接):\n  IP: Src=192.168.1.10 Dst=8.8.8.8 Proto=17(UDP)\n  UDP Header (固定8字节):\n    Source Port: 5000\n    Dest Port:   53 (DNS)\n    Length:      40 (UDP头8B + 数据32B)\n    Checksum:    0x1A2B\n  Payload: DNS Query "example.com"\n\nUDP vs TCP: 无SYN握手，无序列号，无确认，直接发送' },
        { no:2, time:'0.013000', src:'8.8.8.8',         dst:'192.168.1.10',    proto:'UDP',  info:'53 -> 5000 Len=72  DNS Response (直接回复)',
          detail: 'UDP 响应报文:\n  UDP: Sport=53 Dport=5000 Length=72\n  Payload: DNS Response\n    A 93.184.216.34 TTL=86400\n\n无连接特性:\n  服务器收到数据报直接处理并回复\n  无需维护连接状态，并发处理效率极高\n  DNS服务器可同时处理数万并发查询\n\n如果丢包: 客户端等待超时后重试，应用层自行处理' },
        { no:3, time:'1.001000', src:'192.168.1.10',   dst:'8.8.8.8',          proto:'UDP',  info:'5001 -> 53 Len=40  第二次查询 (独立数据报)',
          detail: '第二个 UDP 数据报 (与第一个完全独立):\n  Source Port: 5001 (可能换了端口)\n  Dest Port: 53\n\n无状态特性:\n  每个UDP数据报独立传输，互不依赖\n  服务器不知道这是"同一个客户端"的第二次请求\n  对比 TCP: 同一连接内序列号连续，有状态跟踪\n\nUDP 适用场景: DNS/DHCP/NTP/视频流/游戏/语音' },
        { no:4, time:'1.014000', src:'8.8.8.8',         dst:'192.168.1.10',    proto:'UDP',  info:'53 -> 5001 Len=68  响应 (0% 丢包)',
          detail: 'UDP 性能对比总结:\n  UDP 头部: 8字节 (固定)\n  TCP 头部: 20~60字节\n\n延迟对比:\n  UDP DNS: 约13ms (无握手)\n  TCP DNS: 约41ms (SYN+SYNACK+ACK+请求+响应)\n\n适合UDP的场景:\n  - 实时视频/音频 (容忍少量丢包)\n  - DNS (查询小，重试简单)\n  - 游戏状态同步 (旧数据无用)\n  - NTP 时间同步\n\nQUIC: 基于UDP实现的可靠传输 (HTTP/3)' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4] },
    },

    iproute: {
      title: 'IP 路由转发 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',   dst:'10.0.3.5',         proto:'IPv4', info:'TTL=64  发出包，查路由表，下一跳=192.168.1.1',
          detail: '主机 192.168.1.10 发出的 IP 数据包:\n  IP: Src=192.168.1.10 Dst=10.0.3.5\n  TTL=64 (Linux/Mac默认值)\n  Protocol=6(TCP)\n\n主机路由表查询:\n  目标 10.0.3.5 不在本地子网 192.168.1.0/24\n  命中默认路由: 0.0.0.0/0 via 192.168.1.1\n  -> ARP 获取 192.168.1.1 的 MAC 地址\n  -> 以太网帧 DST_MAC = 网关MAC' },
        { no:2, time:'0.000050', src:'192.168.1.10',   dst:'10.0.3.5',         proto:'IPv4', info:'最长前缀匹配: 10.0.3.0/24 > 10.0.0.0/8 > 0.0.0.0/0',
          detail: '最长前缀匹配 (Longest Prefix Match):\n  路由表条目:\n    10.0.3.0/24  via R2  (匹配24位)\n    10.0.0.0/8   via R1  (匹配8位)\n    0.0.0.0/0    via R1  (默认路由)\n\n  目标IP 10.0.3.5:\n    匹配 10.0.3.0/24 (24位最长)\n    选择最精确路由 -> via R2\n\n  路由器每转发一个包都做一次最长前缀匹配' },
        { no:3, time:'0.000200', src:'192.168.1.10',   dst:'10.0.3.5',         proto:'IPv4', info:'R1 收到包: TTL 64->63，查转发表，下一跳=R2',
          detail: 'R1 路由器转发:\n  收到: IP Dst=10.0.3.5 TTL=64\n  操作:\n    1. TTL-- -> TTL=63  (每经一跳减1)\n    2. 重新计算 IP Checksum\n    3. 查转发表 (FIB): 10.0.3.0/24 via 192.168.2.2\n    4. ARP 获取 R2 接口 MAC\n    5. 更换以太网帧头 (SRC_MAC=R1接口, DST_MAC=R2接口)\n\n注意: IP头中 Src/Dst 不变，只换以太网 MAC' },
        { no:4, time:'0.000400', src:'192.168.1.10',   dst:'10.0.3.5',         proto:'IPv4', info:'R2 收到包: TTL 63->62，查转发表，目标网段直连',
          detail: 'R2 路由器转发:\n  收到: IP Dst=10.0.3.5 TTL=63\n  操作:\n    1. TTL-- -> TTL=62\n    2. 重新计算 IP Checksum\n    3. 查转发表: 10.0.3.0/24 是直连网段\n    4. ARP 解析 10.0.3.5 的 MAC\n    5. 直接封帧发给目标主机\n\nTTL 作用: 防止路由环路。TTL=0时丢包并发ICMP Time Exceeded' },
        { no:5, time:'0.000600', src:'192.168.1.10',   dst:'10.0.3.5',         proto:'IPv4', info:'直连投递: ARP 获取 10.0.3.5 的 MAC，封装以太网帧',
          detail: '直连网络最后一跳投递:\n  R2 确认 10.0.3.5 在直连子网 10.0.3.0/24\n  ARP Request: Who has 10.0.3.5? Tell 10.0.3.2 (R2)\n  ARP Reply: 10.0.3.5 is at ff:ee:dd:cc:bb:aa\n  封装以太网帧:\n    DST_MAC: ff:ee:dd:cc:bb:aa (目标主机MAC)\n    SRC_MAC: R2接口MAC\n    EtherType: 0x0800 (IPv4)\n  发送给目标主机' },
        { no:6, time:'0.000650', src:'192.168.1.10',   dst:'10.0.3.5',         proto:'IPv4', info:'到达目标主机: TTL=62，完成 2 跳路由转发',
          detail: '目标主机 10.0.3.5 收到数据包:\n  IP: Src=192.168.1.10 Dst=10.0.3.5 TTL=62\n  TTL 64 -> 63(R1) -> 62(R2)，经过2跳路由器\n\n整个过程 IP 头 Src/Dst 始终不变:\n  只有以太网帧头(MAC)在每一跳重新封装\n  IP 层: 端到端 (192.168.1.10 -> 10.0.3.5)\n  链路层: 逐跳 (MAC 地址每跳都换)\n\ntraceroute 原理:\n  发送 TTL=1,2,3...的包，每跳TTL归零时路由器回ICMP，从而探测路径' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[6] },
    },

    tcpcong: {
      title: 'TCP 拥塞控制 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',   dst:'93.184.216.34',  proto:'TCP',  info:'cwnd=1  慢启动阶段：发送 1 个 MSS 数据段',
          detail: 'TCP 慢启动初始状态:\n  cwnd (拥塞窗口) = 1 MSS (1460字节)\n  ssthresh (慢启动阈值) = 65535 (初始值)\n  rwnd (接收窗口) = 64240 (对端通告)\n  实际发送量 = min(cwnd, rwnd) = 1 MSS\n\n发送数据段:\n  TCP: SEQ=1  LEN=1460  [PSH,ACK]\n  每收到1个ACK，cwnd += 1 MSS (指数增长)' },
        { no:2, time:'0.020000', src:'93.184.216.34',  dst:'192.168.1.10',   proto:'TCP',  info:'[ACK] cwnd 1->2  慢启动指数增长',
          detail: 'ACK 触发 cwnd 增长:\n  收到 ACK -> cwnd += 1 MSS -> cwnd=2\n  可以连续发送 2 个 MSS\n\n慢启动规律:\n  RTT 1: cwnd=1  发1个包\n  RTT 2: cwnd=2  发2个包\n  RTT 3: cwnd=4  发4个包\n  RTT 4: cwnd=8  发8个包\n  指数级增长，直到达到 ssthresh 或发生丢包' },
        { no:3, time:'0.100000', src:'192.168.1.10',   dst:'93.184.216.34',  proto:'TCP',  info:'cwnd=16  达到 ssthresh，进入拥塞避免线性增长',
          detail: '拥塞避免阶段 (cwnd >= ssthresh=16):\n  cwnd 从指数增长切换为线性增长\n  每个 RTT: cwnd += 1 MSS\n  (准确公式: 每个ACK，cwnd += MSS * MSS / cwnd)\n\n  RTT N:   cwnd=16\n  RTT N+1: cwnd=17\n  RTT N+2: cwnd=18\n  ... 缓慢探测网络容量上限' },
        { no:4, time:'0.300000', src:'93.184.216.34',  dst:'192.168.1.10',   proto:'TCP',  info:'3×DupACK 检测到丢包: cwnd 快速恢复',
          detail: '丢包检测 - 3 个重复 ACK:\n  收到 3 个 dup ACK (ACK相同SEQ)\n  -> 不等超时，立即快重传丢失段\n  -> 进入 Fast Recovery:\n\n  Tahoe: ssthresh=cwnd/2, cwnd=1 (重回慢启动)\n  Reno:  ssthresh=cwnd/2, cwnd=ssthresh (快速恢复)\n  CUBIC: 更平滑的增长曲线 (Linux默认)\n\n  本例: ssthresh=cwnd/2=10, cwnd=10' },
        { no:5, time:'0.400000', src:'192.168.1.10',   dst:'93.184.216.34',  proto:'TCP',  info:'cwnd 从 ssthresh 恢复，重新线性增长',
          detail: '快速恢复后重新增长:\n  cwnd=ssthresh=10 (从上次丢包cwnd的一半开始)\n  直接进入拥塞避免，线性增长\n  避免了慢启动的指数阶段，恢复更快\n\n  RTT N:   cwnd=10\n  RTT N+1: cwnd=11\n  RTT N+2: cwnd=12\n  ...\n\nReno vs CUBIC:\n  Reno: 丢包后cwnd折半，直线增长\n  CUBIC: 三次函数曲线，高BDP网络更高效' },
        { no:6, time:'0.600000', src:'192.168.1.10',   dst:'93.184.216.34',  proto:'TCP',  info:'超时重传: cwnd 归1，ssthresh 折半，重回慢启动',
          detail: 'RTO 超时 (最严重的丢包信号):\n  等待 RTO (重传超时) 后仍无ACK\n  -> 判断网络严重拥塞\n  ssthresh = max(cwnd/2, 2) = 6\n  cwnd = 1 MSS\n  -> 重回慢启动，从头开始\n\nRTO 计算:\n  RTT 加权平均: SRTT = 0.875*SRTT + 0.125*RTT\n  RTO = SRTT + 4*RTTVAR\n  退避: 每次超时 RTO *= 2 (指数退避)\n\n对比:\n  3×DupACK -> 快速恢复 (cwnd折半，温和)\n  RTO超时   -> 慢启动 (cwnd=1，激进)' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5], 6:[6] },
    },

    http2: {
      title: 'HTTP/2 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',    dst:'93.184.216.34',  proto:'TLSv1.3', info:'ClientHello  ALPN: h2, http/1.1  协商 HTTP/2',
          detail: 'TLS ClientHello ALPN 扩展:\n  Extension: application_layer_protocol_negotiation (0x0010)\n  ALPN Protocol List:\n    Length: 12\n    Protocol: h2 (len=2)\n    Protocol: http/1.1 (len=8)\n\n  同时携带的其他 TLS 扩展:\n    supported_versions: TLS 1.3, TLS 1.2\n    key_share: X25519 公钥\n    SNI: 93.184.216.34\n\n  ALPN 在 TLS 握手内完成协商，不增加额外 RTT' },
        { no:2, time:'0.031000', src:'93.184.216.34',   dst:'192.168.1.10',  proto:'TLSv1.3', info:'ServerHello  ALPN: h2  协议升级确认',
          detail: 'TLS ServerHello ALPN 响应:\n  ALPN Selected Protocol: h2\n  服务端确认使用 HTTP/2\n\nTLS 握手完成后双方状态:\n  Client: 发送魔法字符串 PRI * HTTP/2.0...\n  Server: 等待魔法字符串验证\n\n魔法字符串 (24字节):\n  "PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n"\n  目的: 防止不支持 HTTP/2 的代理误处理数据' },
        { no:3, time:'0.032000', src:'192.168.1.10',    dst:'93.184.216.34',  proto:'HTTP2', info:'Magic + SETTINGS[0]  HEADER_TABLE_SIZE=4096 MAX_CONCURRENT_STREAMS=100',
          detail: 'HTTP/2 连接前置帧:\n  [Magic] PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n  (24字节)\n  [SETTINGS Frame]\n    Frame Type: 0x4 (SETTINGS)\n    Flags: 0x0\n    Stream ID: 0 (连接级)\n    Payload:\n      HEADER_TABLE_SIZE = 4096\n      ENABLE_PUSH = 1\n      MAX_CONCURRENT_STREAMS = 100\n      INITIAL_WINDOW_SIZE = 65535\n      MAX_FRAME_SIZE = 16384' },
        { no:4, time:'0.033000', src:'93.184.216.34',   dst:'192.168.1.10',  proto:'HTTP2', info:'SETTINGS[0] + SETTINGS ACK  参数协商完成',
          detail: 'Server SETTINGS + 双向 ACK:\n  [Server SETTINGS]\n    MAX_CONCURRENT_STREAMS = 128\n    INITIAL_WINDOW_SIZE = 131072\n  [Client SETTINGS_ACK]  Flags=0x1\n  [Server SETTINGS_ACK]  Flags=0x1\n\n连接建立完成，可以开始发送请求' },
        { no:5, time:'0.034000', src:'192.168.1.10',    dst:'93.184.216.34',  proto:'HTTP2', info:'HEADERS[Stream1]  GET /  END_HEADERS  (HPACK压缩)',
          detail: 'HTTP/2 HEADERS 帧 (Stream 1, GET /):\n  Frame Type: 0x1 (HEADERS)\n  Flags: 0x5 (END_STREAM | END_HEADERS)\n  Stream ID: 1\n  HPACK 解压后:\n    :method: GET         -> 静态表 idx:2\n    :path: /             -> 静态表 idx:4\n    :scheme: https       -> 静态表 idx:7\n    :authority: 93.184.216.34\n    user-agent: Mozilla/5.0 (Huffman编码)\n    accept: text/html    -> 动态表\n  原始头部约 420字节，HPACK后约 52字节 (压缩87%)' },
        { no:6, time:'0.034100', src:'192.168.1.10',    dst:'93.184.216.34',  proto:'HTTP2', info:'HEADERS[Stream3]  GET /style.css  HEADERS[Stream5]  GET /logo.png  多路复用',
          detail: '多路复用: 3个请求在同一TCP连接并发发送\n  Stream 1: GET /       -> 正在等待响应\n  Stream 3: GET /style.css  (新流,奇数ID)\n    Frame Type: 0x1 (HEADERS)\n    Stream ID: 3\n    :path: /style.css\n  Stream 5: GET /logo.png\n    Frame Type: 0x1 (HEADERS)\n    Stream ID: 5\n    :path: /logo.png\n\nHTTP/1.1 对比: 需要 3 个 TCP 连接，或依次等待\nHTTP/2: 单连接并发，帧交错传输' },
        { no:7, time:'0.065000', src:'93.184.216.34',   dst:'192.168.1.10',  proto:'HTTP2', info:'HEADERS[Stream1]  200 OK  DATA[Stream1]  PUSH_PROMISE[Stream2]  /style.css',
          detail: '服务端响应 + Server Push:\n  [HEADERS Stream 1]  :status: 200\n    content-type: text/html; charset=utf-8\n    content-length: 8192\n  [PUSH_PROMISE Stream 2]  (服务端推送 CSS)\n    Promised Stream ID: 2 (偶数，服务端发起)\n    :method: GET\n    :path: /style.css\n    :scheme: https\n  [DATA Stream 1]  HTML 内容\n    Frame Type: 0x0 (DATA)\n    Flags: 0x0 (还有更多帧)\n    Payload: <html>...' },
        { no:8, time:'0.066000', src:'93.184.216.34',   dst:'192.168.1.10',  proto:'HTTP2', info:'DATA[Stream2]  /style.css内容  WINDOW_UPDATE  流量控制',
          detail: 'Server Push 推送数据 + 流量控制:\n  [DATA Stream 2]  CSS 内容\n    Stream ID: 2 (服务端推送的流)\n    Payload: body { margin: 0; }...\n    Flags: 0x1 (END_STREAM)\n  [WINDOW_UPDATE]\n    Frame Type: 0x8\n    Stream ID: 0 (连接级)\n    Window Size Increment: 65535\n    接收方告知发送方可继续发送的字节数\n\n如果客户端已有 /style.css 缓存:\n  发送 RST_STREAM (0x3) 取消 Stream 2' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3], 4:[4], 5:[5,6], 6:[7,8] },
    },

    quic: {
      title: 'QUIC / HTTP/3 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'192.168.1.10',    dst:'142.250.80.46',   proto:'QUIC', info:'Initial[0]  ClientHello (CRYPTO)  ALPN: h3  版本:1',
          detail: 'QUIC Initial 包 (Long Header):\n  Header Form: Long Header (1)\n  Fixed Bit: 1\n  Long Packet Type: Initial (0x00)\n  Reserved Bits: 00\n  Packet Number Length: 00 (1 byte)\n  Version: 0x00000001 (QUIC v1, RFC 9000)\n  Destination Connection ID: a3f2d1...(8字节随机)\n  Source Connection ID: 00\n  Token Length: 0 (首次连接无 Token)\n  Packet Number: 0\n  Payload (CRYPTO frame):\n    Frame Type: 0x06 (CRYPTO)\n    Offset: 0\n    TLS ClientHello:\n      ALPN: h3 (HTTP/3)\n      supported_versions: TLS 1.3\n      key_share: X25519 公钥\n  [注] Initial 包用固定密钥 AES-128-ECB 加密(防篡改，任何人可解密)' },
        { no:2, time:'0.000100', src:'192.168.1.10',    dst:'142.250.80.46',   proto:'QUIC', info:'0-RTT[0]  HTTP/3 HEADERS  GET /  (0-RTT Data)',
          detail: 'QUIC 0-RTT 包 (使用上次 PSK 密钥):\n  Long Packet Type: 0-RTT (0x01)\n  Packet Number: 0\n  Payload (STREAM frame):\n    Frame Type: 0x08 (STREAM, Stream ID=0)\n    Stream ID: 0 (客户端双向流)\n    HTTP/3 HEADERS Frame:\n      :method: GET\n      :path: /\n      :scheme: https\n      :authority: www.example.com\n  [注] 0-RTT 使用首次连接时颁发的 Session Ticket 密钥加密\n  [注] 服务端未确认前，此数据可能被重放；仅限幂等请求' },
        { no:3, time:'0.028000', src:'142.250.80.46',   dst:'192.168.1.10',    proto:'QUIC', info:'Initial[0]  ServerHello (CRYPTO)  Handshake[0]  证书+Finished',
          detail: 'QUIC Initial + Handshake 包:\n  [Initial 包]\n    CRYPTO Frame: TLS ServerHello\n      Version: TLS 1.3\n      selected_cipher_suite: TLS_AES_128_GCM_SHA256\n      key_share: 服务端 X25519 公钥\n  [Handshake 包] 新加密级别\n    CRYPTO Frame: TLS EncryptedExtensions + Certificate + CertVerify + Finished\n  连接 ID 分配:\n    NEW_CONNECTION_ID Frame:\n      Sequence Number: 0\n      Connection ID: 7e4b9c...(备用 ID)\n      Stateless Reset Token: ...8字节\n  SETTINGS Frame (HTTP/3):\n    MAX_FIELD_SECTION_SIZE\n    QPACK_MAX_TABLE_CAPACITY: 4096\n    QPACK_BLOCKED_STREAMS: 16' },
        { no:4, time:'0.029000', src:'192.168.1.10',    dst:'142.250.80.46',   proto:'QUIC', info:'Handshake[0]  Client Finished  握手完成 1-RTT',
          detail: 'QUIC Client Handshake 完成:\n  CRYPTO Frame: TLS Finished\n    Verify Data: HMAC-SHA256 摘要\n  HANDSHAKE_DONE Frame: (服务端发)\n    Frame Type: 0x1e\n    通知客户端握手已完成，可关闭 Initial/Handshake 密钥\n  至此连接从:\n    Initial密钥 → Handshake密钥 → 1-RTT密钥\n  [时序]\n    t=0.000 Client Initial\n    t=0.028 Server Initial+Handshake  (1 RTT)\n    t=0.029 Client Finished\n    总计: 1 RTT (TCP+TLS需要2 RTT)' },
        { no:5, time:'0.028000', src:'142.250.80.46',   dst:'192.168.1.10',    proto:'QUIC', info:'1-RTT  STREAM[0]  HTTP/3 DATA  200 OK  响应 0-RTT 请求',
          detail: '服务端响应 0-RTT 请求:\n  1-RTT 包 (Short Header):\n    Header Form: Short Header (0)\n    Fixed Bit: 1\n    Spin Bit: 0\n    Connection ID: a3f2d1...\n    Packet Number: 0\n  STREAM Frame (Stream 0):\n    HTTP/3 HEADERS Frame:\n      :status: 200\n      content-type: text/html\n      content-length: 8192\n      alt-svc: h3=":443"; ma=86400  ← 声明支持 HTTP/3\n    HTTP/3 DATA Frame:\n      <html>...\n  [注] 服务端无法提前验证 0-RTT 防重放，响应时握手同步进行' },
        { no:6, time:'0.029500', src:'192.168.1.10',    dst:'142.250.80.46',   proto:'QUIC', info:'1-RTT  STREAM[4,8]  并发请求 GET /style.css GET /app.js  多路复用',
          detail: 'QUIC 多路复用 — 并发请求:\n  Short Header 包 (握手完成后):\n  STREAM Frame (Stream 4, 客户端双向):\n    HTTP/3 HEADERS:\n      :method: GET\n      :path: /style.css\n      Offset: 0\n      FIN: 0\n  STREAM Frame (Stream 8):\n    HTTP/3 HEADERS:\n      :method: GET\n      :path: /app.js\n  [QUIC Stream ID 规则]\n    0,4,8...  客户端双向流 (HTTP请求)\n    1,5,9...  服务端双向流\n    2,6,10... 客户端单向流\n    3,7,11... 服务端单向流\n  [与HTTP/2对比] 此处丢包只影响对应流，不阻塞其他流' },
        { no:7, time:'0.065000', src:'192.168.1.10',    dst:'142.250.80.46',   proto:'QUIC', info:'PATH_CHALLENGE  [网络切换 WiFi→4G]  新源 IP:10.0.0.5',
          detail: '连接迁移 (WiFi → 4G):\n  源 IP 变化: 192.168.1.10:51234 → 10.0.0.5:62100\n  但 Connection ID 不变: a3f2d1...\n  PATH_CHALLENGE Frame:\n    Frame Type: 0x1a\n    Data: 8字节随机值 (e.g. 0x3f8a2b1c4d5e6f7a)\n  ← PATH_RESPONSE Frame:\n    Frame Type: 0x1b\n    Data: 0x3f8a2b1c4d5e6f7a  (原样回显)\n  路径验证成功，切换到新路径继续传输\n  [TCP对比] TCP四元组变化→连接断开→重新握手(~150ms)\n  [QUIC] 应用层无感知，传输中的流不中断' },
        { no:8, time:'0.066000', src:'142.250.80.46',   dst:'10.0.0.5',        proto:'QUIC', info:'ACK  Largest=12 ACKDelay=2ms  精准 RTT 估算',
          detail: 'QUIC ACK 帧 (精准版):\n  Frame Type: 0x02 (ACK)\n  Largest Acknowledged: 12\n  ACK Delay: 2ms  (接收方处理延迟，精确)\n  ACK Range Count: 1\n  First ACK Range: 5  (包7~12都已收)\n  Gap: 1\n  ACK Range: 2  (包4~5已收，包6未收→需重传)\n  ECN Counts: 0/0/0\n  [与TCP对比]\n    TCP: 重传包与原包同序号，ACK有歧义(Karn算法)\n    QUIC: 重传用新包号，ACK精准指向，RTT无歧义\n    QUIC ACK Delay字段让RTT估算更精确\n  包6 重传: 新 Packet Number=25 (≠原始6)' },
      ],
      stepMap: { 1:[1], 2:[2], 3:[3,4], 4:[4], 5:[5,6], 6:[6], 7:[7], },
    },

    bgp: {
      title: 'BGP eBGP 会话建立 — 模拟抓包',
      frames: [
        { no:1, time:'0.000000', src:'10.0.0.1',      dst:'10.0.0.2',      proto:'TCP',  info:'SYN  Seq=0  [TCP 握手 第1步]  Src=49152  Dst=179',
          detail: 'TCP 三次握手（BGP 基础）:\n  IP Src=10.0.0.1 (R1, AS 65001)\n  IP Dst=10.0.0.2 (R2, AS 65002)\n  TCP Src Port=49152 (随机)\n  TCP Dst Port=179 (BGP 专用端口)\n  Flags: SYN\n  Seq=0  Window=65535\n  [注] BGP 使用 TCP 179，利用 TCP 可靠传输，无需自己实现 ACK/重传' },
        { no:2, time:'0.000500', src:'10.0.0.2',      dst:'10.0.0.1',      proto:'TCP',  info:'SYN, ACK  Seq=0  Ack=1  [TCP 握手 第2步]',
          detail: 'TCP SYN-ACK:\n  IP Src=10.0.0.2 (R2)\n  IP Dst=10.0.0.1 (R1)\n  TCP Flags: SYN+ACK\n  Seq=0  Ack=1  Window=65535\n  [注] R2 接受连接，TCP 三次握手完成后双方进入 BGP Connect 状态' },
        { no:3, time:'0.001000', src:'10.0.0.1',      dst:'10.0.0.2',      proto:'BGP',  info:'OPEN  MyAS=65001  HoldTime=90  BGP-ID=1.1.1.1  Version=4',
          detail: 'BGP OPEN 报文 (R1 → R2):\n  BGP 报文类型: 1 (OPEN)\n  BGP 版本: 4\n  My Autonomous System: 65001\n  Hold Time: 90 秒\n  BGP Identifier (Router ID): 1.1.1.1\n  Optional Parameters Length: 22\n  Optional Parameters:\n    Param Type=2 (Capabilities)\n      Capability: MP-BGP (RFC 4760)\n        AFI=1 (IPv4)  SAFI=1 (Unicast)\n      Capability: Route Refresh (RFC 2918)\n      Capability: 4-Octet AS Numbers (RFC 6793)\n        AS Number: 65001\n  [状态变化] BGP 状态: Connect → OpenSent' },
        { no:4, time:'0.002000', src:'10.0.0.2',      dst:'10.0.0.1',      proto:'BGP',  info:'OPEN  MyAS=65002  HoldTime=90  BGP-ID=2.2.2.2  + KEEPALIVE',
          detail: 'BGP OPEN 报文 (R2 → R1) + KEEPALIVE:\n  --- OPEN ---\n  BGP 版本: 4\n  My AS: 65002\n  Hold Time: 90 秒\n  BGP Identifier: 2.2.2.2\n  Capabilities: MP-BGP / Route Refresh / 4-Octet AS\n  --- KEEPALIVE (19 字节) ---\n  BGP 报文类型: 4 (KEEPALIVE)\n  仅固定头部，无载荷\n  含义: 接受 OPEN，确认参数协商成功\n  [状态变化] R1: OpenSent → OpenConfirm\n  [注] Hold Time 协商取双方较小值，两端都是 90s，最终 Hold Time=90s，Keepalive 间隔=30s' },
        { no:5, time:'0.002500', src:'10.0.0.1',      dst:'10.0.0.2',      proto:'BGP',  info:'KEEPALIVE  [确认 OPEN 接受，进入 Established]',
          detail: 'BGP KEEPALIVE 报文 (R1 → R2):\n  BGP 报文类型: 4 (KEEPALIVE)\n  长度: 19 字节 (仅固定头部)\n  含义: R1 确认接受 R2 的 OPEN\n  [状态变化]\n    R1: OpenConfirm → Established\n    R2: OpenConfirm → Established\n  BGP 会话正式建立！双方现在可以交换 UPDATE 路由信息' },
        { no:6, time:'0.010000', src:'10.0.0.1',      dst:'10.0.0.2',      proto:'BGP',  info:'UPDATE  NLRI: 192.0.2.0/24  203.0.113.0/24  AS_PATH: 65001  NEXT_HOP: 10.0.0.1',
          detail: 'BGP UPDATE 报文 (R1 → R2):\n  BGP 报文类型: 2 (UPDATE)\n  Withdrawn Routes Length: 0 (无撤销路由)\n  Total Path Attribute Length: 48\n  Path Attributes:\n    ORIGIN: IGP (0x40, 0x01)  值=0 (IGP起源)\n    AS_PATH: AS_SEQUENCE [65001]  (R1所在AS)\n    NEXT_HOP: 10.0.0.1  (eBGP下一跳=R1接口IP)\n    LOCAL_PREF: 未携带 (LOCAL_PREF 不传给 eBGP 邻居)\n    MED: 100 (可选)\n  NLRI (新路由前缀):\n    192.0.2.0/24  (AS 65001 的前缀)\n    203.0.113.0/24  (AS 65001 的另一前缀)\n  [注] eBGP 会修改 NEXT_HOP 为本接口 IP；iBGP 保留原始 NEXT_HOP' },
        { no:7, time:'0.011000', src:'10.0.0.2',      dst:'10.0.0.1',      proto:'BGP',  info:'UPDATE  NLRI: 198.51.100.0/24  AS_PATH: 65002  NEXT_HOP: 10.0.0.2',
          detail: 'BGP UPDATE 报文 (R2 → R1):\n  BGP 报文类型: 2 (UPDATE)\n  Path Attributes:\n    ORIGIN: IGP\n    AS_PATH: AS_SEQUENCE [65002]\n    NEXT_HOP: 10.0.0.2\n    MED: 0\n  NLRI:\n    198.51.100.0/24  (AS 65002 的前缀)\n  [R1 收到后的路由决策]\n    WEIGHT: 0 (邻居学到，非本地生成)\n    LOCAL_PREF: 100 (默认)\n    AS_PATH 长度: 1 (最短)\n    NEXT_HOP: 10.0.0.2 (直连可达)\n  → 198.51.100.0/24 via 10.0.0.2 写入 RIB' },
        { no:8, time:'30.000000', src:'10.0.0.1',     dst:'10.0.0.2',      proto:'BGP',  info:'KEEPALIVE  [定期心跳，维持 Hold Time 计时器]',
          detail: 'BGP KEEPALIVE 心跳包:\n  BGP 报文类型: 4 (KEEPALIVE)\n  长度: 19 字节\n  发送间隔: 30 秒 (Hold Time 90s / 3)\n  作用: 重置对端的 Hold Time 计时器\n  [Hold Time 超时机制]\n    90 秒内未收到任何 BGP 报文 → Hold Time 超时\n    → 清除该邻居所有路由\n    → 回到 Idle 状态\n    → 等待 Connect Retry Timer 后重新连接\n  [生产建议]\n    BFD 联动：300ms 内检测链路故障，触发 BGP 快速收敛\n    Graceful Restart：重启时保留转发表，减少流量中断' },
      ],
      stepMap: { 1:[1,2], 2:[3,4], 3:[5], 4:[6], 5:[7], 6:[8] },
    },

  };

  /* ── 弹窗 HTML ──────────────────────────────────────────────────────── */
  function buildUI() {
    if (document.getElementById('captureBackdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'captureBackdrop';
    backdrop.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px)',
      'display:none;z-index:2100;align-items:center;justify-content:center;padding:16px',
    ].join(';');

    backdrop.innerHTML = `
      <div id="capturePanel" style="background:var(--bg-2,#1e1e1e);border:1px solid var(--border-1,#333);border-radius:14px;width:min(900px,100%);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.6)">

        <!-- 顶栏 -->
        <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border-1,#333);flex-shrink:0">
          <span style="font-size:18px">🔬</span>
          <div style="flex:1;min-width:0">
            <div id="capturePanelTitle" style="font-weight:700;font-size:14.5px;color:var(--text-1,#f0f0f0)">抓包对照模式</div>
            <div style="font-size:11.5px;color:var(--text-3,#888);margin-top:1px">对照真实网络抓包报文，理解每一步的协议细节</div>
          </div>
          <!-- 协议选择 -->
          <select id="captureProtoSelect" style="background:var(--bg-3,#2a2a2a);color:var(--text-1,#f0f0f0);border:1px solid var(--border-1,#444);border-radius:7px;padding:6px 10px;font-size:13px;cursor:pointer">
            <option value="">── 选择协议 ──</option>
          </select>
          <button onclick="CaptureModule.syncCurrentProtocol()" style="background:var(--blue-500,#3b82f6);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:12.5px;cursor:pointer;white-space:nowrap">↺ 同步当前协议</button>
          <button onclick="CaptureModule.close()" style="background:transparent;border:1px solid var(--border-1,#444);color:var(--text-2,#ccc);border-radius:7px;padding:7px 12px;font-size:13px;cursor:pointer;line-height:1">✕</button>
        </div>

        <!-- 说明条 -->
        <div style="padding:9px 18px;background:rgba(59,130,246,0.08);border-bottom:1px solid var(--border-1,#2a2a2a);font-size:12px;color:var(--text-3,#999);flex-shrink:0">
          💡 点击报文行查看详情 · 黄色高亮行 = 当前步骤对应报文 · 可同步播放器步骤
        </div>

        <!-- 主体：上方报文列表 + 下方详情 -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

          <!-- 报文列表 -->
          <div style="flex:1;overflow-y:auto;min-height:0">
            <table id="captureTable" style="width:100%;border-collapse:collapse;font-size:12.5px;font-family:'JetBrains Mono','Consolas',monospace">
              <thead>
                <tr style="background:var(--bg-3,#252525);position:sticky;top:0;z-index:1">
                  <th style="padding:8px 10px;text-align:left;color:var(--text-3,#888);font-weight:600;border-bottom:1px solid var(--border-1,#333);width:48px">No.</th>
                  <th style="padding:8px 10px;text-align:left;color:var(--text-3,#888);font-weight:600;border-bottom:1px solid var(--border-1,#333);width:88px">时间 (s)</th>
                  <th style="padding:8px 10px;text-align:left;color:var(--text-3,#888);font-weight:600;border-bottom:1px solid var(--border-1,#333);width:130px">源地址</th>
                  <th style="padding:8px 10px;text-align:left;color:var(--text-3,#888);font-weight:600;border-bottom:1px solid var(--border-1,#333);width:130px">目标地址</th>
                  <th style="padding:8px 10px;text-align:left;color:var(--text-3,#888);font-weight:600;border-bottom:1px solid var(--border-1,#333);width:80px">协议</th>
                  <th style="padding:8px 10px;text-align:left;color:var(--text-3,#888);font-weight:600;border-bottom:1px solid var(--border-1,#333)">Info</th>
                </tr>
              </thead>
              <tbody id="captureTableBody"></tbody>
            </table>
          </div>

          <!-- 详情区 -->
          <div id="captureDetail" style="flex-shrink:0;border-top:1px solid var(--border-1,#333);background:var(--bg-1,#141414);padding:14px 18px;min-height:88px;max-height:220px;overflow-y:auto">
            <div style="color:var(--text-3,#666);font-size:12px;font-style:italic">点击上方报文行查看详细字段解析 →</div>
          </div>

        </div>

        <!-- 底栏提示 -->
        <div style="padding:10px 18px;border-top:1px solid var(--border-1,#333);font-size:11.5px;color:var(--text-3,#666);display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span>⚠️</span>
          <span>以上为模拟教学数据，结构与真实抓包一致，数值仅供参考。建议配合 Wireshark 实战练习。</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // 填充协议选择下拉
    const sel = document.getElementById('captureProtoSelect');
    Object.keys(CAPTURE_DB).forEach(pid => {
      const opt = document.createElement('option');
      opt.value = pid;
      opt.textContent = CAPTURE_DB[pid].title.split('—')[0].trim();
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      if (this.value) loadCapture(this.value);
    });

    // 点击背景关闭
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) CaptureModule.close();
    });

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('captureBackdrop').style.display !== 'none') {
        CaptureModule.close();
      }
    });
  }

  /* 协议颜色映射 */
  const PROTO_COLOR = {
    TCP: '#60a5fa', TLS: '#a78bfa', 'TLSv1.3': '#a78bfa',
    DNS: '#34d399', HTTP: '#fb923c', HTTPS: '#f472b6',
    ARP: '#fbbf24', ICMP: '#94a3b8', UDP: '#67e8f9',
    DHCP: '#4ade80', SMTP: '#f97316', SSHv2: '#818cf8',
    OSPF: '#38bdf8', NAT: '#e879f9', WebSocket: '#22d3ee',
    IPv4: '#a3e635', 'FTP-DATA': '#fb7185',
    '802.1Q': '#fde68a', HTTP2: '#60cdff', QUIC: '#facc15',
  };

  let _currentCapturePid = null;
  let _selectedRow = null;

  function loadCapture(pid) {
    const db = CAPTURE_DB[pid];
    if (!db) return;
    _currentCapturePid = pid;

    // 更新标题
    const titleEl = document.getElementById('capturePanelTitle');
    if (titleEl) titleEl.textContent = '🔬 ' + db.title;

    // 更新下拉
    const sel = document.getElementById('captureProtoSelect');
    if (sel) sel.value = pid;

    // 渲染报文表格
    const tbody = document.getElementById('captureTableBody');
    if (!tbody) return;
    tbody.innerHTML = db.frames.map(f => {
      const color = PROTO_COLOR[f.proto] || '#94a3b8';
      return `<tr data-no="${f.no}" onclick="CaptureModule._selectRow(${f.no})" style="cursor:pointer;transition:background 0.15s">
        <td style="padding:7px 10px;color:var(--text-3,#888);border-bottom:1px solid rgba(255,255,255,0.04)">${f.no}</td>
        <td style="padding:7px 10px;color:var(--text-3,#777);border-bottom:1px solid rgba(255,255,255,0.04)">${f.time}</td>
        <td style="padding:7px 10px;color:var(--text-1,#e0e0e0);border-bottom:1px solid rgba(255,255,255,0.04)">${f.src}</td>
        <td style="padding:7px 10px;color:var(--text-1,#e0e0e0);border-bottom:1px solid rgba(255,255,255,0.04)">${f.dst}</td>
        <td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600">${f.proto}</span></td>
        <td style="padding:7px 10px;color:var(--text-2,#ccc);border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">${f.info}</td>
      </tr>`;
    }).join('');

    // 清除详情
    const detail = document.getElementById('captureDetail');
    if (detail) detail.innerHTML = '<div style="color:var(--text-3,#666);font-size:12px;font-style:italic">点击上方报文行查看详细字段解析 →</div>';
    _selectedRow = null;
  }

  function highlightStep(step) {
    if (!_currentCapturePid) return;
    const db = CAPTURE_DB[_currentCapturePid];
    if (!db || !db.stepMap) return;
    const highlightNos = db.stepMap[step] || [];

    const tbody = document.getElementById('captureTableBody');
    if (!tbody) return;
    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      const no = parseInt(row.dataset.no, 10);
      const isHighlight = highlightNos.includes(no);
      row.style.background = isHighlight ? 'rgba(234,179,8,0.13)' : '';
      row.style.borderLeft = isHighlight ? '3px solid #eab308' : '3px solid transparent';
      if (isHighlight && !_selectedRow) {
        // 自动滚动到高亮行
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    // 自动展开第一个高亮行的详情
    if (highlightNos.length > 0) {
      CaptureModule._selectRow(highlightNos[0], /* auto */ true);
    }
  }

  /* ── 对外 API ─────────────────────────────────────────────────────── */
  window.CaptureModule = {

    open(pid) {
      buildUI();
      document.getElementById('captureBackdrop').style.display = 'flex';
      const targetPid = pid || (typeof activeProtocol !== 'undefined' ? activeProtocol : null);
      if (targetPid && CAPTURE_DB[targetPid]) {
        loadCapture(targetPid);
        // 同步当前步骤高亮
        if (typeof currentStep !== 'undefined') {
          highlightStep(currentStep);
        }
      }
    },

    close() {
      const el = document.getElementById('captureBackdrop');
      if (el) el.style.display = 'none';
    },

    syncCurrentProtocol() {
      if (typeof activeProtocol !== 'undefined' && CAPTURE_DB[activeProtocol]) {
        loadCapture(activeProtocol);
        if (typeof currentStep !== 'undefined') highlightStep(currentStep);
      } else {
        alert('当前协议暂无抓包数据，支持：TCP握手/挥手、DNS、HTTP、TLS、ARP、ICMP、VLAN、FTP、OSPF、DHCP、SMTP、SSH、NAT、WebSocket、UDP、IP路由、TCP拥塞控制、HTTP/2');
      }
    },

    /** 步进联动：播放器每切换步骤时调用 */
    onStepChange(step) {
      if (document.getElementById('captureBackdrop')?.style.display === 'none') return;
      highlightStep(step);
    },

    _selectRow(no, auto) {
      const db = CAPTURE_DB[_currentCapturePid];
      if (!db) return;
      const frame = db.frames.find(f => f.no === no);
      if (!frame) return;

      // 高亮选中行
      const tbody = document.getElementById('captureTableBody');
      if (tbody) {
        Array.from(tbody.querySelectorAll('tr')).forEach(r => {
          if (parseInt(r.dataset.no) === no) {
            r.style.background = 'rgba(59,130,246,0.18)';
          }
        });
      }

      _selectedRow = no;

      // 展示详情
      const detail = document.getElementById('captureDetail');
      if (!detail) return;
      const color = PROTO_COLOR[frame.proto] || '#94a3b8';
      detail.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:2px 9px;font-size:12px;font-weight:700">${frame.proto}</span>
          <span style="font-size:12.5px;color:var(--text-1,#e0e0e0);font-weight:600">帧 #${frame.no}</span>
          <span style="font-size:12px;color:var(--text-3,#888)">${frame.src} → ${frame.dst}</span>
        </div>
        <pre style="margin:0;font-size:12px;line-height:1.7;color:var(--text-2,#ccc);white-space:pre-wrap;font-family:'JetBrains Mono','Consolas',monospace;background:transparent">${frame.detail}</pre>
      `;
    },

  };

  /* ── 自动与播放器步进联动 ───────────────────────────────────────────── */
  // 在 index.html 的 nextStep / prevStep / gotoStep 调用后触发联动
  // 用 MutationObserver 监听步骤圆点变化来检测步骤切换
  (function hookStepChange() {
    let _lastStep = -1;
    function checkStep() {
      if (typeof currentStep === 'undefined') return;
      if (currentStep !== _lastStep) {
        _lastStep = currentStep;
        CaptureModule.onStepChange(currentStep);
      }
    }
    // 每 300ms 轮询一次（轻量，不影响性能）
    setInterval(checkStep, 300);
  })();

  // 挂载完成提示
  console.info('[CaptureModule] 抓包对照模式已就绪。支持协议:', Object.keys(CAPTURE_DB).join(', '));

})();

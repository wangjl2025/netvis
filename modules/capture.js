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
        alert('当前协议暂无抓包数据，支持：TCP握手/挥手、DNS、HTTP、TLS、ARP、ICMP');
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

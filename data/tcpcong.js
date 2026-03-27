/* ══════════════════════════════════════════════════════
   TCP 拥塞控制（tcpcong）— 专属画布：SVG cwnd 折线图
   步骤：6步（慢启动→拥塞避免→快重传→快恢复→恢复稳定→总结）
   对应 index.html 中的 #congestionDiagram
══════════════════════════════════════════════════════ */
protocolDB['tcpcong'] = {

  /* ── cwnd 折线图数据点 ──
     每个点：{ x: 轮次RTT, y: cwnd(MSS), phase: 阶段标签, event: 特殊事件 }
     x 坐标按等比排列，y 坐标表示窗口大小（MSS单位）
     共 13 个数据点，覆盖完整的慢启动→拥塞避免→丢包→快恢复过程
  */
  chartPoints: [
    { x:0,  y:1,  phase:'slow-start',        event:''       },  // 0: 初始 cwnd=1
    { x:1,  y:2,  phase:'slow-start',        event:''       },  // 1: 翻倍
    { x:2,  y:4,  phase:'slow-start',        event:''       },  // 2: 翻倍
    { x:3,  y:8,  phase:'slow-start',        event:''       },  // 3: 翻倍，触碰 ssthresh=8
    { x:4,  y:9,  phase:'congestion-avoid',  event:''       },  // 4: 进入拥塞避免，+1/RTT
    { x:5,  y:10, phase:'congestion-avoid',  event:''       },  // 5: +1
    { x:6,  y:11, phase:'congestion-avoid',  event:''       },  // 6: +1
    { x:7,  y:12, phase:'congestion-avoid',  event:''       },  // 7: +1
    { x:8,  y:6,  phase:'fast-retransmit',   event:'loss'   },  // 8: 收到3个重复ACK，快重传
    { x:9,  y:7,  phase:'fast-recovery',     event:''       },  // 9: 快恢复：cwnd=ssthresh+3
    { x:10, y:6,  phase:'fast-recovery',     event:''       },  // 10: 确认丢包段，cwnd=ssthresh=6
    { x:11, y:7,  phase:'congestion-avoid',  event:''       },  // 11: 恢复正常拥塞避免
    { x:12, y:8,  phase:'congestion-avoid',  event:''       },  // 12: 持续增长
  ],

  /* 各步骤对应"高亮到哪个数据点"（0-based 索引，-1=全灰） */
  stepHighlight: [ 3, 7, 8, 10, 11, 12 ],

  steps: [
    { title:'慢启动：cwnd 指数增长', emoji:'🚀' },
    { title:'拥塞避免：cwnd 线性增长', emoji:'📈' },
    { title:'快重传：检测到丢包', emoji:'⚡' },
    { title:'快恢复：cwnd 折半重启', emoji:'🔄' },
    { title:'恢复正常：重新拥塞避免', emoji:'✅' },
    { title:'总结：四大算法协同工作', emoji:'🎓' },
  ],

  stepData: [
    {
      banner: '🚀 第 1 / 6 步 — 慢启动阶段（Slow Start）',
      phase: 'slow-start',
      highlightTo: 3,
      fields: [
        { name:'初始 cwnd',   value:'1 MSS',         desc:'连接建立后，拥塞窗口从 1 个最大报文段开始' },
        { name:'增长规律',    value:'每 RTT 翻倍',    desc:'每收到一个 ACK，cwnd += 1 MSS；一个 RTT 内 cwnd 翻倍' },
        { name:'ssthresh',    value:'初始 = 8 MSS（示例）', desc:'慢启动阈值，cwnd 超过它后切换到拥塞避免' },
        { name:'本例增长',    value:'1→2→4→8 MSS',   desc:'3 个 RTT 内窗口翻 3 倍，快速探测可用带宽' },
        { name:'停止条件',    value:'cwnd ≥ ssthresh 或检测到丢包', desc:'本例在 cwnd=8=ssthresh 时切换到拥塞避免' },
      ],
      narration: '"慢启动"其实并不慢——指数增长是网络探测带宽上限的方式。初始从 1 MSS 开始（谨慎），但每 RTT 翻倍：1→2→4→8→16…直到 cwnd 达到 ssthresh 阈值，才换"挡"为线性增长。名字叫"慢"是因为初始值小，不是增长速率慢。',
    },
    {
      banner: '📈 第 2 / 6 步 — 拥塞避免阶段（Congestion Avoidance）',
      phase: 'congestion-avoid',
      highlightTo: 7,
      fields: [
        { name:'触发条件',    value:'cwnd ≥ ssthresh（本例 cwnd=8）',   desc:'慢启动阈值到达，切换到更保守的线性增长' },
        { name:'增长规律',    value:'每 RTT +1 MSS',                     desc:'每收到一个 ACK，cwnd += 1/cwnd MSS（累计效果=每RTT+1）' },
        { name:'本例增长',    value:'8→9→10→11→12 MSS',                 desc:'4 个 RTT，线性增长 +4 MSS' },
        { name:'目标',        value:'在不引发丢包的前提下持续探测带宽', desc:'比慢启动保守，避免突然大量注包压垮网络' },
        { name:'何时结束',    value:'检测到丢包信号（超时或 3 次重复 ACK）', desc:'本例在 cwnd=12 时收到 3 次重复 ACK' },
      ],
      narration: '拥塞避免阶段 cwnd 改为每 RTT 只加 1 MSS，慢慢往上探。就像开车上山——坡越来越陡（带宽越来越满），于是把油门踩得更轻，让车速（窗口）线性而非指数地上升。这个阶段会持续到网络真的"喊疼"——出现丢包为止。',
    },
    {
      banner: '⚡ 第 3 / 6 步 — 快重传（Fast Retransmit）：检测到丢包',
      phase: 'fast-retransmit',
      highlightTo: 8,
      fields: [
        { name:'丢包信号',    value:'连续收到 3 个重复 ACK',             desc:'3 个重复 ACK 意味着某个报文段丢失，但后续段已到达' },
        { name:'快重传动作',  value:'立即重传丢失的报文段',               desc:'不等 RTO 超时，收到 3 个重复 ACK 就立刻重传' },
        { name:'ssthresh 更新', value:'ssthresh = cwnd/2 = 12/2 = 6 MSS', desc:'把当前窗口折半，作为新的慢启动阈值' },
        { name:'vs 超时重传', value:'超时重传：cwnd 重置为 1，更激进',    desc:'快重传+快恢复比超时重传温和，不清零窗口' },
        { name:'前提条件',    value:'需要接收方支持 SACK 或顺序 ACK',    desc:'现代 TCP 普遍支持，RFC 2581/5681 标准' },
      ],
      narration: '收到 3 个重复 ACK 是个好信号——说明网络还通着（后续包在跑），只是某个包掉了。这时 TCP 不等超时，立刻重传那个丢失的包（快重传）。同时把 ssthresh 折半（从 12 降到 6），准备进入快恢复。比"超时重传+清零窗口"要温和得多。',
    },
    {
      banner: '🔄 第 4 / 6 步 — 快恢复（Fast Recovery）：cwnd 折半重启',
      phase: 'fast-recovery',
      highlightTo: 10,
      fields: [
        { name:'快恢复起点',  value:'cwnd = ssthresh + 3 = 9 MSS',       desc:'+3 是因为 3 个重复 ACK 意味着网络还在传输 3 个包' },
        { name:'恢复期间',    value:'每收到新重复 ACK，cwnd +1',          desc:'让已在途中的包"消化完"后再稳定下来' },
        { name:'恢复完成',    value:'收到新 ACK（确认重传段），cwnd = ssthresh = 6', desc:'窗口回到 ssthresh，切换到拥塞避免模式' },
        { name:'不回到 1',    value:'与超时不同，窗口不归零',             desc:'快恢复保留了大部分传输速率，恢复更快' },
        { name:'实现标准',    value:'Reno（RFC 2581）/ CUBIC / BBR',       desc:'现代 Linux 默认 CUBIC，更智能的拥塞控制算法' },
      ],
      narration: '快恢复的精髓是"不砍光"——丢了一个包，只是把窗口折半（而非归零），然后从 ssthresh 重新开始拥塞避免。就像开车遇到减速带，踩一下刹车，减速但不熄火，过了再继续加速。这比"超时重传+从 1 重新慢启动"效率高得多。',
    },
    {
      banner: '✅ 第 5 / 6 步 — 恢复正常：重新进入拥塞避免',
      phase: 'congestion-avoid',
      highlightTo: 12,
      fields: [
        { name:'当前 cwnd',   value:'6 MSS（= ssthresh）',               desc:'快恢复结束，窗口稳定在新的 ssthresh' },
        { name:'继续增长',    value:'重新执行拥塞避免，+1 MSS/RTT',       desc:'6→7→8→… 线性缓慢探测新的带宽上限' },
        { name:'锯齿波形',    value:'这就是 TCP 吞吐量的典型"锯齿"曲线', desc:'增长→丢包→折半→增长，周而复始' },
        { name:'带宽利用率',  value:'平均约为 0.75 × 最大窗口',          desc:'TCP 刻意留出余量，避免持续打满带宽引发队列溢出' },
        { name:'长肥管道',    value:'高带宽 × 高 RTT 场景需优化',         desc:'传统 Reno 在高BDP链路效率低，CUBIC/BBR 更适合' },
      ],
      narration: '恢复后 cwnd 重新从 ssthresh(=6) 开始线性增长。整个过程从时序图上看是一个"锯齿波"：平缓上升→突然折半→再平缓上升→再折半……这就是 TCP 拥塞控制经典的"AIMD"模式（加法增大、乘法减小）。',
    },
    {
      banner: '🎓 第 6 / 6 步 — 总结：四大算法如何协作',
      phase: 'summary',
      highlightTo: 12,
      fields: [
        { name:'①慢启动',     value:'连接初期，指数探测带宽上限',         desc:'cwnd 每 RTT 翻倍，直到触碰 ssthresh' },
        { name:'②拥塞避免',   value:'接近上限时，线性缓慢试探',           desc:'cwnd 每 RTT +1，减少引发拥塞的概率' },
        { name:'③快重传',     value:'3 个重复 ACK → 立即重传',           desc:'不等 RTO 超时，更快地响应轻微丢包' },
        { name:'④快恢复',     value:'折半 cwnd，不归零，快速恢复速率',   desc:'ssthresh = cwnd/2，然后从 ssthresh 重启拥塞避免' },
        { name:'AIMD原则',    value:'加法增大（AI）+ 乘法减小（MD）',     desc:'公平性保证：多条流共享带宽时趋向均衡' },
        { name:'现代改进',    value:'Linux 默认 CUBIC；Google BBR 基于探测模型', desc:'BBR 不再依赖丢包信号，直接探测瓶颈带宽和RTT' },
      ],
      narration: '四大算法相互配合，构成 TCP 的"自适应流控"体系：慢启动快速探路，拥塞避免稳步爬升，快重传即时响应，快恢复温和收缩。AIMD（加法增大乘法减小）确保多条 TCP 流公平竞争带宽，是互联网稳定运行几十年的核心机制之一。',
    },
  ],

  knowledge: [
    { label:'cwnd',      value:'拥塞窗口（Congestion Window）：发送方根据网络状态自主限制的发送量上限' },
    { label:'ssthresh',  value:'慢启动阈值（Slow Start Threshold）：超过它后从指数增长切换到线性增长' },
    { label:'RTT',       value:'往返时延（Round-Trip Time）：从发出数据到收到对应 ACK 的时间' },
    { label:'MSS',       value:'最大报文段长度（Max Segment Size）：通常为 1460 字节（以太网 MTU 1500 - IP 头 20 - TCP 头 20）' },
    { label:'AIMD',      value:'加法增大、乘法减小：拥塞时 cwnd 乘以 1/2 减小（激进），恢复时每 RTT +1（保守），保证多流公平' },
    { label:'现代算法',  value:'快重传：3个重复ACK立即重传；CUBIC（Linux默认）三次函数增长；BBR（Google）直接探测瓶颈带宽和最小RTT，不依赖丢包' },
  ],

  quiz: [
    { q:'慢启动阶段 cwnd 的增长规律是？',
      options:['每 RTT +1 MSS','每 RTT 翻倍（指数增长）','固定不变','随机增长'],
      answer: 1,
      exp:'慢启动阶段每收到一个 ACK，cwnd += 1 MSS。一个 RTT 内若有 N 个 ACK，cwnd 增加 N MSS——即每 RTT 翻倍，指数增长。'
    },
    { q:'收到 3 个重复 ACK 时，TCP 会执行什么操作？',
      options:['等待 RTO 超时后再重传','立即触发快重传，同时把 ssthresh 折半','将 cwnd 重置为 1','忽略，继续等待'],
      answer: 1,
      exp:'收到 3 个重复 ACK 表明某报文段丢失但网络仍通。TCP 立即重传丢失段（快重传），并将 ssthresh = cwnd/2，随后进入快恢复——不归零窗口，比超时重传温和。'
    },
    { q:'拥塞避免和慢启动的本质区别是？',
      options:['拥塞避免更快','拥塞避免线性增长，慢启动指数增长','两者完全相同','拥塞避免只在丢包后使用'],
      answer: 1,
      exp:'慢启动指数增长（每RTT翻倍），快速探测可用带宽；拥塞避免线性增长（每RTT +1 MSS），在接近带宽上限时保守探测，避免引发拥塞。两者通过 ssthresh 切换。'
    },
    { q:'AIMD 中"MD"（乘法减小）的作用是什么？',
      options:['加快传输速度','检测到拥塞时把 cwnd 乘以 1/2，快速释放带宽','把窗口重置为 1','增加 ssthresh'],
      answer: 1,
      exp:'乘法减小（Multiplicative Decrease）：检测到拥塞（丢包）时 cwnd 减半，快速降低注入网络的流量。与加法增大（Additive Increase）配合，保证多条 TCP 流在共享链路上趋向公平均衡。'
    },
  ],
};

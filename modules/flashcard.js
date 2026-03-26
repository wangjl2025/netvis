/**
 * NetViz Flash Card System — modules/flashcard.js
 * 速记卡模块：从各协议 knowledge 提取卡片，支持翻转、导航、分组筛选
 *
 * 接口：
 *   window.FlashcardModule.open([filterProto])   打开速记卡弹窗
 *   window.FlashcardModule.close()               关闭弹窗
 *
 * 数据来源：protocolDB[pid].knowledge[]
 * 触发入口：协议库页「📚 速记卡」按钮 / player 顶栏「📚」按钮
 */

(function () {
  'use strict';

  /* ── 协议元信息 ── */
  const PROTO_META = {
    tcp3:    { name: 'TCP 三次握手', icon: '🤝', layer: '传输层' },
    tcp4:    { name: 'TCP 四次挥手', icon: '🔁', layer: '传输层' },
    tcpcong: { name: 'TCP 拥塞控制', icon: '📈', layer: '传输层' },
    udp:     { name: 'UDP 数据报',   icon: '💨', layer: '传输层' },
    http:    { name: 'HTTP/1.1',     icon: '📡', layer: '应用层' },
    tls:     { name: 'TLS 握手',     icon: '🔒', layer: '应用层' },
    dns:     { name: 'DNS 解析',     icon: '🌐', layer: '应用层' },
    'dns-iter': { name: 'DNS 迭代',  icon: '🔄', layer: '应用层' },
    dhcp:    { name: 'DHCP',         icon: '📨', layer: '应用层' },
    websocket:{ name: 'WebSocket',   icon: '🔗', layer: '应用层' },
    smtp:    { name: 'SMTP 邮件',    icon: '📧', layer: '应用层' },
    ssh:     { name: 'SSH',          icon: '🛡️', layer: '应用层' },
    arp:     { name: 'ARP',          icon: '📋', layer: '数据链路层' },
    icmp:    { name: 'ICMP/Ping',    icon: '🏓', layer: '网络层' },
    nat:     { name: 'NAT（SNAT）',  icon: '🔀', layer: '网络层' },
    iproute: { name: 'IP 路由转发',  icon: '🗺️', layer: '网络层' },
  };

  /* ── 模块状态 ── */
  let _cards = [];          // 当前筛选后的卡片列表
  let _allCards = [];       // 全量卡片
  let _currentIdx = 0;      // 当前卡片索引
  let _flipped = false;     // 是否显示背面
  let _currentFilter = 'all';
  let _initialized = false;

  /* ── CSS 注入 ── */
  function injectStyles() {
    if (document.getElementById('fc-styles')) return;
    const style = document.createElement('style');
    style.id = 'fc-styles';
    style.textContent = `
/* ── 速记卡弹窗 ── */
#fc-backdrop {
  position:fixed; inset:0; z-index:9100;
  background:rgba(5,7,15,0.82); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  animation:fc-fade-in 0.18s ease;
}
@keyframes fc-fade-in { from{opacity:0} to{opacity:1} }

#fc-modal {
  position:relative;
  width:min(680px,96vw); max-height:92vh;
  background:var(--bg-1,#0d1117); border:1px solid rgba(255,255,255,0.1);
  border-radius:16px; overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow:0 24px 80px rgba(0,0,0,0.6);
  animation:fc-slide-up 0.22s cubic-bezier(.34,1.36,.64,1);
}
@keyframes fc-slide-up {
  from{opacity:0;transform:translateY(18px) scale(0.97)}
  to{opacity:1;transform:translateY(0) scale(1)}
}

/* 头部 */
#fc-header {
  display:flex; align-items:center; gap:12px;
  padding:14px 20px; border-bottom:1px solid rgba(255,255,255,0.06);
  background:rgba(255,255,255,0.02); flex-shrink:0;
}
#fc-title { font-size:14px; font-weight:700; color:#e6edf3; flex:1 }
#fc-count { font-size:11.5px; color:rgba(230,237,243,0.45); font-family:var(--font-mono,monospace) }
#fc-close {
  width:28px; height:28px; border:none; background:none; cursor:pointer;
  border-radius:6px; font-size:16px; color:rgba(230,237,243,0.55);
  transition:all 0.15s; display:flex; align-items:center; justify-content:center;
}
#fc-close:hover { background:rgba(255,255,255,0.08); color:#e6edf3 }

/* 筛选条 */
#fc-filter-bar {
  display:flex; gap:6px; padding:10px 20px; flex-wrap:wrap;
  border-bottom:1px solid rgba(255,255,255,0.06);
  background:rgba(255,255,255,0.015); flex-shrink:0;
  overflow-x:auto; scrollbar-width:none;
}
#fc-filter-bar::-webkit-scrollbar { display:none }
.fc-filter-btn {
  padding:4px 12px; border-radius:12px; font-size:11.5px; font-weight:600;
  border:1px solid rgba(255,255,255,0.1); background:none; cursor:pointer;
  color:rgba(230,237,243,0.55); white-space:nowrap;
  transition:all 0.15s;
}
.fc-filter-btn:hover { border-color:rgba(255,255,255,0.2); color:#e6edf3 }
.fc-filter-btn.active {
  background:rgba(79,142,247,0.15); border-color:rgba(79,142,247,0.4);
  color:rgba(79,142,247,1);
}

/* 卡片区 */
#fc-body {
  flex:1; overflow-y:auto; padding:24px 20px;
  display:flex; flex-direction:column; align-items:center; gap:20px;
}

/* 翻转卡片容器 */
.fc-scene {
  width:100%; max-width:560px; height:200px;
  perspective:1000px; cursor:pointer; flex-shrink:0;
}
.fc-card {
  width:100%; height:100%; position:relative;
  transform-style:preserve-3d;
  transition:transform 0.45s cubic-bezier(.4,0,.2,1);
}
.fc-card.flipped { transform:rotateY(180deg) }
.fc-face {
  position:absolute; inset:0;
  backface-visibility:hidden; -webkit-backface-visibility:hidden;
  border-radius:14px; padding:22px 24px;
  display:flex; flex-direction:column; justify-content:center;
  border:1px solid rgba(255,255,255,0.08);
}
.fc-front {
  background:linear-gradient(135deg,rgba(79,142,247,0.1),rgba(79,142,247,0.04));
  border-color:rgba(79,142,247,0.2);
}
.fc-back {
  background:linear-gradient(135deg,rgba(52,211,153,0.08),rgba(52,211,153,0.02));
  border-color:rgba(52,211,153,0.18);
  transform:rotateY(180deg);
  overflow:hidden;
}
.fc-front-tag {
  font-size:10px; font-weight:700; color:rgba(79,142,247,0.7);
  letter-spacing:0.1em; text-transform:uppercase; margin-bottom:12px;
}
.fc-front-text {
  font-size:15px; font-weight:600; color:#e6edf3; line-height:1.5;
}
.fc-front-hint {
  margin-top:12px; font-size:11px; color:rgba(230,237,243,0.35);
  text-align:center;
}
.fc-back-tag {
  font-size:10px; font-weight:700; color:rgba(52,211,153,0.7);
  letter-spacing:0.1em; text-transform:uppercase; margin-bottom:10px;
  flex-shrink:0;
}
.fc-back-text {
  font-size:12.5px; color:rgba(230,237,243,0.82); line-height:1.7;
  overflow-y:auto; flex:1;
}
.fc-back-text strong { color:rgba(79,142,247,0.9) }
.fc-back-text code {
  background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:4px;
  font-family:var(--font-mono,monospace); font-size:11.5px;
}

/* 进度条 */
.fc-progress-row {
  width:100%; max-width:560px; display:flex; align-items:center; gap:10px;
  flex-shrink:0;
}
.fc-prog-bar {
  flex:1; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;
}
.fc-prog-fill {
  height:100%; background:var(--blue-400,#4f8ef7);
  border-radius:2px; transition:width 0.3s ease;
}
.fc-prog-label { font-size:11px; color:rgba(230,237,243,0.45); white-space:nowrap }

/* 控制按钮行 */
.fc-controls {
  width:100%; max-width:560px;
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  flex-shrink:0;
}
.fc-nav-btn {
  width:40px; height:40px; border-radius:10px;
  border:1px solid rgba(255,255,255,0.1); background:none; cursor:pointer;
  color:rgba(230,237,243,0.6); font-size:18px;
  display:flex; align-items:center; justify-content:center;
  transition:all 0.15s;
}
.fc-nav-btn:hover:not(:disabled) { background:rgba(255,255,255,0.07); color:#e6edf3 }
.fc-nav-btn:disabled { opacity:0.25; cursor:not-allowed }
.fc-flip-btn {
  flex:1; height:40px; border-radius:10px;
  border:1px solid rgba(79,142,247,0.3);
  background:rgba(79,142,247,0.08); cursor:pointer;
  color:rgba(79,142,247,1); font-size:13px; font-weight:600;
  transition:all 0.15s;
}
.fc-flip-btn:hover { background:rgba(79,142,247,0.14) }
.fc-shuffle-btn {
  width:40px; height:40px; border-radius:10px;
  border:1px solid rgba(255,255,255,0.1); background:none; cursor:pointer;
  color:rgba(230,237,243,0.55); font-size:16px;
  display:flex; align-items:center; justify-content:center;
  transition:all 0.15s;
}
.fc-shuffle-btn:hover { background:rgba(255,255,255,0.07); color:#e6edf3 }

/* 空状态 */
.fc-empty {
  text-align:center; padding:48px 20px; color:rgba(230,237,243,0.35);
}
.fc-empty-icon { font-size:40px; margin-bottom:12px }
.fc-empty-text { font-size:13px }

/* 键盘提示 */
.fc-key-hint {
  font-size:11px; color:rgba(230,237,243,0.3);
  text-align:center; padding:8px 0 4px; flex-shrink:0;
}
    `;
    document.head.appendChild(style);
  }

  /* ── 从 protocolDB 收集所有卡片 ── */
  function collectCards(filterProto) {
    const cards = [];
    const db = window.protocolDB;
    if (!db) return cards;

    const protoOrder = ['tcp3','tcp4','tcpcong','udp','http','tls','dns','dns-iter','dhcp','websocket','smtp','ssh','arp','icmp','nat','iproute'];

    protoOrder.forEach(pid => {
      const entry = db[pid];
      if (!entry || !entry.knowledge || !Array.isArray(entry.knowledge)) return;
      const meta = PROTO_META[pid] || { name: pid, icon: '📄', layer: '应用层' };

      entry.knowledge.forEach((kd, idx) => {
        const title = kd.title || kd.label || `知识点 ${idx + 1}`;
        const body  = kd.body  || kd.value || '';
        if (!title && !body) return;
        cards.push({ pid, name: meta.name, icon: meta.icon, layer: meta.layer, title, body });
      });
    });

    if (filterProto && filterProto !== 'all') {
      return cards.filter(c => c.pid === filterProto);
    }
    return cards;
  }

  /* ── 构建过滤器按钮数据 ── */
  function buildFilterGroups() {
    const db = window.protocolDB;
    if (!db) return [];

    const groups = [];
    const protoOrder = ['tcp3','tcp4','tcpcong','udp','http','tls','dns','dns-iter','dhcp','websocket','smtp','ssh','arp','icmp','nat','iproute'];

    protoOrder.forEach(pid => {
      const entry = db[pid];
      if (!entry || !entry.knowledge || entry.knowledge.length === 0) return;
      const meta = PROTO_META[pid] || { name: pid, icon: '📄' };
      groups.push({ pid, label: meta.icon + ' ' + meta.name, count: entry.knowledge.length });
    });
    return groups;
  }

  /* ── 渲染弹窗 ── */
  function renderModal() {
    const total = _cards.length;
    const idx   = _currentIdx;

    /* 进度 */
    const progEl = document.getElementById('fc-prog-fill');
    if (progEl) progEl.style.width = total ? ((idx + 1) / total * 100) + '%' : '0%';
    const progLabel = document.getElementById('fc-prog-label');
    if (progLabel) progLabel.textContent = total ? `${idx + 1} / ${total}` : '0 / 0';
    const countEl = document.getElementById('fc-count');
    if (countEl) countEl.textContent = total ? `${total} 张卡片` : '';

    /* 卡片内容 */
    const frontTag  = document.getElementById('fc-front-tag');
    const frontText = document.getElementById('fc-front-text');
    const backTag   = document.getElementById('fc-back-tag');
    const backText  = document.getElementById('fc-back-text');

    if (total === 0) {
      document.getElementById('fc-scene-wrap').innerHTML = `
        <div class="fc-empty">
          <div class="fc-empty-icon">🃏</div>
          <div class="fc-empty-text">暂无速记卡数据<br>请先浏览对应协议，加载知识点</div>
        </div>`;
      return;
    }

    const card = _cards[idx];
    if (frontTag)  frontTag.textContent  = card.icon + ' ' + card.name;
    if (frontText) frontText.textContent = stripHtml(card.title);
    if (backTag)   backTag.textContent   = '💡 详解';
    if (backText)  backText.innerHTML    = card.body || card.title;

    /* 翻转状态 */
    const cardEl = document.getElementById('fc-card');
    if (cardEl) cardEl.classList.toggle('flipped', _flipped);

    /* 导航按钮 */
    const prevBtn = document.getElementById('fc-prev');
    const nextBtn = document.getElementById('fc-next');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === total - 1;
  }

  /* 辅助：去除 HTML 标签 */
  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || html || '';
  }

  /* ── 打乱数组 ── */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ── 构建 DOM ── */
  function buildDOM() {
    if (document.getElementById('fc-backdrop')) return;

    const el = document.createElement('div');
    el.id = 'fc-backdrop';
    el.innerHTML = `
      <div id="fc-modal" role="dialog" aria-modal="true" aria-label="速记卡">
        <!-- 头部 -->
        <div id="fc-header">
          <span style="font-size:18px">📚</span>
          <div id="fc-title">速记卡</div>
          <span id="fc-count"></span>
          <button id="fc-close" aria-label="关闭">✕</button>
        </div>

        <!-- 筛选条 -->
        <div id="fc-filter-bar">
          <button class="fc-filter-btn active" data-filter="all">全部协议</button>
        </div>

        <!-- 卡片 + 控制区 -->
        <div id="fc-body">
          <!-- 进度条 -->
          <div class="fc-progress-row">
            <div class="fc-prog-bar"><div class="fc-prog-fill" id="fc-prog-fill"></div></div>
            <span class="fc-prog-label" id="fc-prog-label">0 / 0</span>
          </div>

          <!-- 翻转卡片 -->
          <div class="fc-scene" id="fc-scene-wrap">
            <div class="fc-card" id="fc-card">
              <div class="fc-face fc-front">
                <div class="fc-front-tag" id="fc-front-tag"></div>
                <div class="fc-front-text" id="fc-front-text"></div>
                <div class="fc-front-hint">点击翻牌查看详解</div>
              </div>
              <div class="fc-face fc-back">
                <div class="fc-back-tag" id="fc-back-tag">💡 详解</div>
                <div class="fc-back-text" id="fc-back-text"></div>
              </div>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="fc-controls">
            <button class="fc-nav-btn" id="fc-prev" title="上一张（←）" aria-label="上一张">←</button>
            <button class="fc-flip-btn" id="fc-flip">翻牌 / 查看详解</button>
            <button class="fc-nav-btn" id="fc-next" title="下一张（→）" aria-label="下一张">→</button>
            <button class="fc-shuffle-btn" id="fc-shuffle" title="随机打乱" aria-label="随机打乱">🔀</button>
          </div>

          <!-- 键盘提示 -->
          <div class="fc-key-hint">⌨️ ← → 切换 &nbsp;|&nbsp; Space 翻牌 &nbsp;|&nbsp; Esc 关闭</div>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    /* 事件绑定 */
    document.getElementById('fc-close').addEventListener('click', close);
    el.addEventListener('click', function(e) { if (e.target === el) close(); });

    document.getElementById('fc-scene-wrap').addEventListener('click', flip);
    document.getElementById('fc-flip').addEventListener('click', flip);
    document.getElementById('fc-prev').addEventListener('click', prev);
    document.getElementById('fc-next').addEventListener('click', next);
    document.getElementById('fc-shuffle').addEventListener('click', function() {
      shuffle(_cards);
      _currentIdx = 0;
      _flipped = false;
      renderModal();
      showToastFC('已随机打乱 ' + _cards.length + ' 张卡片');
    });

    document.getElementById('fc-filter-bar').addEventListener('click', function(e) {
      const btn = e.target.closest('.fc-filter-btn');
      if (!btn) return;
      const filter = btn.dataset.filter;
      document.querySelectorAll('.fc-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentFilter = filter;
      _cards = filter === 'all' ? [..._allCards] : _allCards.filter(c => c.pid === filter);
      _currentIdx = 0;
      _flipped = false;
      renderModal();
    });

    /* 键盘 */
    el.addEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Escape')     { close(); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === ' ')          { e.preventDefault(); flip(); }
  }

  /* ── 操作函数 ── */
  function flip() {
    _flipped = !_flipped;
    const cardEl = document.getElementById('fc-card');
    if (cardEl) cardEl.classList.toggle('flipped', _flipped);
  }

  function prev() {
    if (_currentIdx <= 0) return;
    _currentIdx--;
    _flipped = false;
    renderModal();
  }

  function next() {
    if (_currentIdx >= _cards.length - 1) return;
    _currentIdx++;
    _flipped = false;
    renderModal();
  }

  function close() {
    const backdrop = document.getElementById('fc-backdrop');
    if (backdrop) {
      backdrop.style.animation = 'fc-fade-in 0.15s ease reverse';
      setTimeout(() => backdrop.remove(), 140);
    }
    /* 解绑全局键盘监听 */
    document.removeEventListener('keydown', handleKey);
  }

  /* 简易 toast（复用主页的 showToast，如没有则 fallback） */
  function showToastFC(msg) {
    if (window.showToast) { window.showToast(msg, 'info'); return; }
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(30,35,50,0.95);color:#e6edf3;padding:9px 18px;border-radius:8px;font-size:13px;z-index:9999;pointer-events:none';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  /* ── 更新筛选条按钮列表 ── */
  function buildFilterBar() {
    const bar = document.getElementById('fc-filter-bar');
    if (!bar) return;
    const groups = buildFilterGroups();
    let html = `<button class="fc-filter-btn${_currentFilter==='all'?' active':''}" data-filter="all">全部协议</button>`;
    groups.forEach(g => {
      html += `<button class="fc-filter-btn${_currentFilter===g.pid?' active':''}" data-filter="${g.pid}">${g.label} <span style="opacity:.5">${g.count}</span></button>`;
    });
    bar.innerHTML = html;
  }

  /* ── 公开 API ── */
  function open(filterProto) {
    injectStyles();
    buildDOM();

    /* 收集卡片 */
    _allCards = collectCards();
    _currentFilter = filterProto || 'all';
    _cards = _currentFilter === 'all' ? [..._allCards] : _allCards.filter(c => c.pid === _currentFilter);
    _currentIdx = 0;
    _flipped = false;

    buildFilterBar();
    renderModal();

    /* 焦点管理 */
    const modal = document.getElementById('fc-modal');
    if (modal) { modal.setAttribute('tabindex', '-1'); modal.focus(); }

    /* 全局键盘监听（防止与 player 快捷键冲突：只在弹窗打开时生效） */
    document.addEventListener('keydown', handleKey);
  }

  /* ── 挂载到全局 ── */
  window.FlashcardModule = { open, close };

  /* ── 如果已加载，说明可以初始化 ── */
  _initialized = true;

})();

/**
 * learning.js — 学习路径推荐系统
 * 根据 localStorage 中的已解锁徽章（badge.js 写入），推荐下一个应学的协议
 * 无账号依赖，纯本地逻辑
 */
(function () {
  'use strict';

  // ── 协议元数据（难度 / 推荐前置）─────────────────────────────────
  const PROTOCOL_META = [
    // 入门：无前置
    { id: 'dns',      name: 'DNS 解析',       difficulty: 1, prereqs: [],              icon: '🌐', color: 'var(--cyan-400)' },
    { id: 'http',     name: 'HTTP 请求',       difficulty: 1, prereqs: [],              icon: '📡', color: 'var(--green-400)' },
    { id: 'arp',      name: 'ARP 地址解析',    difficulty: 1, prereqs: [],              icon: '📮', color: 'var(--orange-400)' },
    { id: 'udp',      name: 'UDP 传输',        difficulty: 1, prereqs: [],              icon: '📦', color: 'var(--blue-400)' },
    { id: 'icmp',     name: 'ICMP/Ping',       difficulty: 1, prereqs: [],              icon: '🏓', color: 'var(--cyan-400)' },
    // 进阶：需要入门基础
    { id: 'tcp3',     name: 'TCP 三次握手',    difficulty: 2, prereqs: ['udp'],         icon: '🤝', color: 'var(--blue-400)' },
    { id: 'tcp4',     name: 'TCP 四次挥手',    difficulty: 2, prereqs: ['tcp3'],        icon: '👋', color: 'var(--blue-400)' },
    { id: 'dhcp',     name: 'DHCP 分配',       difficulty: 2, prereqs: ['arp'],         icon: '🔧', color: 'var(--green-400)' },
    { id: 'nat',      name: 'NAT 地址转换',    difficulty: 2, prereqs: ['tcp3','arp'],  icon: '🔀', color: 'var(--purple-400)' },
    { id: 'iproute',  name: 'IP 路由转发',     difficulty: 2, prereqs: ['icmp'],        icon: '🗺', color: 'var(--orange-400)' },
    { id: 'vlan',     name: 'VLAN',            difficulty: 2, prereqs: ['arp'],         icon: '🔌', color: 'var(--orange-400)' },
    // 高级：需要进阶基础
    { id: 'tls',      name: 'TLS 1.3 握手',   difficulty: 3, prereqs: ['tcp3','http'],  icon: '🔒', color: 'var(--purple-400)' },
    { id: 'http2',    name: 'HTTP/2',          difficulty: 3, prereqs: ['tls'],          icon: '⚡', color: 'var(--cyan-400)' },
    { id: 'websocket',name: 'WebSocket',       difficulty: 3, prereqs: ['http'],         icon: '🔄', color: 'var(--green-400)' },
    { id: 'ftp',      name: 'FTP 文件传输',    difficulty: 3, prereqs: ['tcp3'],         icon: '📁', color: 'var(--blue-400)' },
    { id: 'ssh',      name: 'SSH 远程登录',    difficulty: 3, prereqs: ['tls'],          icon: '🛡', color: 'var(--green-400)' },
    { id: 'smtp',     name: 'SMTP 邮件',       difficulty: 3, prereqs: ['tcp3'],         icon: '✉', color: 'var(--orange-400)' },
    { id: 'ospf',     name: 'OSPF 路由协议',   difficulty: 3, prereqs: ['iproute'],      icon: '🕸', color: 'var(--purple-400)' },
    { id: 'tcpcong',  name: 'TCP 拥塞控制',    difficulty: 3, prereqs: ['tcp3','tcp4'],  icon: '📈', color: 'var(--blue-400)' },
    { id: 'quic',     name: 'QUIC / HTTP/3',   difficulty: 3, prereqs: ['http2','udp'],  icon: '⚡', color: 'var(--yellow-400)' },
  ];

  const DIFFICULTY_LABEL = { 1: '入门', 2: '进阶', 3: '高级' };
  const DIFFICULTY_COLOR = {
    1: { bg: 'rgba(74,222,128,0.12)', fg: 'var(--green-400)', border: 'rgba(74,222,128,0.25)' },
    2: { bg: 'rgba(79,142,247,0.12)', fg: 'var(--blue-400)',  border: 'rgba(79,142,247,0.25)' },
    3: { bg: 'var(--purple-subtle)',  fg: 'var(--purple-400)', border: 'rgba(167,139,250,0.25)' },
  };

  // ── 读取已完成协议（badge.js 写入 localStorage）────────────────────
  // key: netviz_progress，结构：{ protoId: { unlocked: true, ... } }
  function getUnlocked() {
    try {
      const raw = JSON.parse(localStorage.getItem('netviz_progress') || '{}');
      // 优先从 badge.js 公开 API 获取（更稳定）
      if (window.BadgeSystem && typeof window.BadgeSystem.getProgress === 'function') {
        const prog = window.BadgeSystem.getProgress();
        return Object.keys(prog.details || {}).filter(k => prog.details[k] && prog.details[k].unlocked);
      }
      return Object.keys(raw).filter(k => raw[k] && raw[k].unlocked);
    } catch (e) { return []; }
  }

  // ── 核心推荐算法 ────────────────────────────────────────────────────
  /**
   * 推荐逻辑（按优先级）：
   * 1. 前置已全部完成、本身未完成 → 候选池
   * 2. 候选池按 difficulty ASC 排序
   * 3. 最多推荐 3 个
   */
  function recommend(unlocked) {
    const done = new Set(unlocked);
    const candidates = PROTOCOL_META.filter(p =>
      !done.has(p.id) && p.prereqs.every(r => done.has(r))
    );
    // 同难度内随机打乱，避免每次推荐完全一样
    candidates.sort((a, b) => {
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return Math.random() - 0.5;
    });
    return candidates.slice(0, 3);
  }

  // ── 渲染 ─────────────────────────────────────────────────────────────
  function render() {
    const unlocked = getUnlocked();
    const total = PROTOCOL_META.length;
    const doneCount = unlocked.filter(id => PROTOCOL_META.find(p => p.id === id)).length;
    const rec = recommend(unlocked);

    // 若全部完成，不显示
    if (rec.length === 0 && doneCount >= total) return;

    const section = document.createElement('div');
    section.className = 'section learning-path-section';
    section.id = 'learning-path-section';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-label', '学习路径推荐');

    // 进度条百分比
    const pct = Math.round((doneCount / total) * 100);

    section.innerHTML = `
      <div class="section-header">
        <div>
          <div class="section-title">📚 你的学习路径</div>
          <div class="section-subtitle">已完成 ${doneCount} / ${total} 个协议 · 推荐下一步</div>
        </div>
        <div class="lp-progress-wrap" aria-label="整体进度 ${pct}%">
          <div class="lp-progress-bar">
            <div class="lp-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="lp-progress-label">${pct}%</span>
        </div>
      </div>
      ${rec.length === 0
        ? '<div class="lp-all-done">🎉 所有协议已全部学完，厉害！</div>'
        : `<div class="lp-rec-grid">${rec.map(p => renderCard(p, unlocked)).join('')}</div>`
      }
    `;

    // 插入到"热门协议"区块之后、"特性"区块之前
    const hotSection = document.querySelector('#page-home .section');
    if (hotSection && hotSection.nextElementSibling) {
      hotSection.parentNode.insertBefore(section, hotSection.nextElementSibling);
    } else {
      const homePage = document.getElementById('page-home');
      if (homePage) homePage.appendChild(section);
    }

    // 绑定卡片点击
    section.querySelectorAll('[data-proto-go]').forEach(el => {
      el.addEventListener('click', function () {
        const pid = this.getAttribute('data-proto-go');
        if (typeof openProtocol === 'function') openProtocol(pid);
      });
    });
  }

  function renderCard(p, unlocked) {
    const dc = DIFFICULTY_COLOR[p.difficulty];
    // 前置标签（有前置才显示，无前置不占空间）
    const prereqHtml = p.prereqs.length > 0
      ? `<div class="lp-prereq">前置：${p.prereqs.map(r => {
          const m = PROTOCOL_META.find(x => x.id === r);
          const done = unlocked.includes(r);
          return `<span class="${done ? 'lp-prereq-done' : 'lp-prereq-todo'}">${done ? '✓ ' : ''}${m ? m.name : r}</span>`;
        }).join('<span style="color:var(--text-4)"> · </span>')}</div>`
      : '';

    return `
      <div class="lp-card" data-proto-go="${p.id}" role="button" tabindex="0"
           aria-label="开始学习 ${p.name}" style="--lp-color:${p.color}">
        <div class="lp-card-head">
          <div class="lp-icon-wrap">${p.icon}</div>
          <span class="lp-difficulty"
            style="background:${dc.bg};color:${dc.fg};border:1px solid ${dc.border}">
            ${DIFFICULTY_LABEL[p.difficulty]}
          </span>
        </div>
        <div class="lp-name">${p.name}</div>
        ${prereqHtml}
        <div class="lp-cta">立即开始
          <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><polygon points="4,2 13,8 4,14"/></svg>
        </div>
      </div>`;
  }

  // ── 初始化 ───────────────────────────────────────────────────────────
  function init() {
    // 等 badge.js 加载完成后再取数据（badge.js 500ms 后加载，给个缓冲）
    setTimeout(render, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 对外暴露刷新接口（协议完成后可主动刷新）
  window.refreshLearningPath = function () {
    const old = document.getElementById('learning-path-section');
    if (old) old.remove();
    render();
  };
})();

/**
 * NetViz Badge System — modules/badge.js
 * 学习进度 & 徽章系统
 * 
 * 接口：
 *   window.NetVizModules.badge.init()
 *   window.NetVizModules.badge.onProtocolComplete(protoId)
 *   window.NetVizModules.badge.getProgress()
 *
 * 触发：主文件 gotoStep() 在最后一步时调用 onProtocolComplete
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'netviz_progress';
  const TOTAL = 21;

  // 21 个协议的展示名称和图标（用于弹窗）
  const PROTO_INFO = {
    tcp3:      { name: 'TCP 三次握手',  icon: '🤝' },
    tcp4:      { name: 'TCP 四次挥手',  icon: '🔁' },
    http:      { name: 'HTTP/1.1',     icon: '📡' },
    tls:       { name: 'TLS 1.3',      icon: '🔒' },
    dns:       { name: 'DNS 解析',     icon: '🌐' },
    udp:       { name: 'UDP 数据报',   icon: '💨' },
    arp:       { name: 'ARP 地址解析', icon: '📋' },
    icmp:      { name: 'ICMP / Ping',  icon: '🏓' },
    dhcp:      { name: 'DHCP',         icon: '📨' },
    smtp:      { name: 'SMTP 邮件',    icon: '📧' },
    websocket: { name: 'WebSocket',    icon: '🔌' },
    ssh:       { name: 'SSH 安全登录', icon: '🔐' },
    nat:       { name: 'NAT 地址转换', icon: '🌍' },
    tcpcong:   { name: 'TCP 拥塞控制', icon: '📈' },
    iproute:   { name: 'IP 路由转发',  icon: '🗺' },
    vlan:      { name: 'VLAN 虚拟局域网', icon: '🏷️' },
    ftp:       { name: 'FTP 文件传输',  icon: '📂' },
    ospf:      { name: 'OSPF 链路状态路由', icon: '🔢' },
    http2:     { name: 'HTTP/2',        icon: '🚀' },
    quic:      { name: 'QUIC / HTTP/3', icon: '⚡' },
    bgp:       { name: 'BGP 边界网关协议', icon: '🛤️' },
  };

  /* ── 数据读写 ── */
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* 无痕/隐私模式 */ }
  }

  function getUnlockedCount(data) {
    return Object.values(data).filter(v => v.unlocked).length;
  }

  /* ── 进度条更新 ── */
  function updateProgressBar(data) {
    const wrap = document.getElementById('progressBarWrap');
    const fill = document.getElementById('progressBarFill');
    const text = document.getElementById('progressBarText');
    if (!wrap) return;

    const count = getUnlockedCount(data);
    if (count === 0) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'block';
    fill.style.width = (count / TOTAL * 100).toFixed(1) + '%';
    text.innerHTML = `<strong>${count}</strong> / ${TOTAL} 已完成`;
  }

  /* ── 协议卡片徽章 slot 更新 ── */
  function updateCardSlots(data) {
    document.querySelectorAll('.card-badge-slot[data-proto]').forEach(el => {
      const pid = el.dataset.proto;
      if (data[pid] && data[pid].unlocked) {
        el.classList.add('unlocked');
        el.title = `已完成 · ${data[pid].completedAt || ''}`;
      } else {
        el.classList.remove('unlocked');
        el.title = '';
      }
    });
  }

  /* ── 完成弹窗 ── */
  let _toastTimer = null;
  function showToast(protoId) {
    const info = PROTO_INFO[protoId] || { name: protoId, icon: '🎉' };
    const data = loadData();
    const count = getUnlockedCount(data);

    // 查找或创建 toast 元素
    let toast = document.getElementById('badgeToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'badgeToast';
      toast.className = 'badge-toast';
      toast.innerHTML = `
        <div class="badge-toast-icon" id="badgeToastIcon"></div>
        <div class="badge-toast-text">
          <div class="badge-toast-title" id="badgeToastTitle"></div>
          <div class="badge-toast-sub"  id="badgeToastSub"></div>
        </div>`;
      document.body.appendChild(toast);
    }

    document.getElementById('badgeToastIcon').textContent  = info.icon;
    document.getElementById('badgeToastTitle').textContent = `${info.name} · 已完成！`;
    document.getElementById('badgeToastSub').textContent   =
      count >= TOTAL ? `🎊 所有 ${TOTAL} 个协议已全部完成！` : `进度：${count} / ${TOTAL}`;

    clearTimeout(_toastTimer);
    toast.classList.add('show');
    _toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3200);
  }

  /* ── 公开接口 ── */
  const badge = {
    version: '1.0',

    init() {
      const data = loadData();
      updateProgressBar(data);
      updateCardSlots(data);
    },

    /**
     * 协议完成时调用
     * @param {string} protoId - 协议 ID，如 'tcp3'
     */
    onProtocolComplete(protoId) {
      if (!PROTO_INFO[protoId]) return; // 非标准协议 ID，忽略
      const data = loadData();

      const wasUnlocked = data[protoId] && data[protoId].unlocked;
      if (!wasUnlocked) {
        // 首次完成：写入记录
        data[protoId] = {
          unlocked: true,
          completedAt: new Date().toLocaleDateString('zh-CN'),
          viewCount: (data[protoId]?.viewCount || 0) + 1,
        };
        saveData(data);
        updateProgressBar(data);
        updateCardSlots(data);
        showToast(protoId);
        // 通知学习路径模块刷新推荐
        if (typeof window.refreshLearningPath === 'function') {
          setTimeout(window.refreshLearningPath, 1200);
        }
      } else {
        // 已完成过：只更新 viewCount，不重复弹窗
        data[protoId].viewCount = (data[protoId].viewCount || 1) + 1;
        saveData(data);
      }
    },

    /** 获取进度摘要 */
    getProgress() {
      const data = loadData();
      return {
        unlocked: getUnlockedCount(data),
        total: TOTAL,
        details: data,
      };
    },

    /** 重置所有进度（调试用） */
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      updateProgressBar({});
      updateCardSlots({});
    },
  };

  window.NetVizModules = window.NetVizModules || {};
  window.NetVizModules.badge = badge;

  // 页面加载时立即初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => badge.init());
  } else {
    badge.init();
  }

})();

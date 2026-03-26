/**
 * drill.js — 错误演练模式
 * 从各协议的 quiz 数据中抽题，做选择/问答练习，统计得分
 *
 * 公开 API：
 *   DrillModule.open()   — 打开演练面板
 *   DrillModule.close()  — 关闭演练面板
 */

window.DrillModule = (() => {
  /* ─── 协议元信息（用于标注题目来源）─── */
  const PROTOCOL_META = {
    dns:     { name:'DNS 解析', emoji:'🌐' },
    'dns-iter': { name:'DNS 迭代查询', emoji:'🌐' },
    http:    { name:'HTTP', emoji:'📡' },
    tls:     { name:'TLS 握手', emoji:'🔒' },
    tcp3:    { name:'TCP 三次握手', emoji:'🤝' },
    tcp4:    { name:'TCP 四次挥手', emoji:'👋' },
    udp:     { name:'UDP', emoji:'📦' },
    dhcp:    { name:'DHCP', emoji:'🏠' },
    websocket:{ name:'WebSocket', emoji:'⚡' },
    icmp:    { name:'ICMP / Ping', emoji:'📶' },
    arp:     { name:'ARP', emoji:'🔍' },
    nat:     { name:'NAT（SNAT）', emoji:'🔄' },
    'nat-dnat':{ name:'NAT（DNAT）', emoji:'🔄' },
    smtp:    { name:'SMTP 邮件', emoji:'✉️' },
    ssh:     { name:'SSH', emoji:'🔐' },
    tcpcong: { name:'TCP 拥塞控制', emoji:'📈' },
  };

  let allQuestions = [];   // 打乱后的全部题目
  let currentIndex = 0;    // 当前题目索引
  let score = 0;           // 得分
  let answered = 0;        // 已答题数
  let answerShown = false; // 当前题是否已展示答案

  /* ─── 收集所有题目 ─── */
  function collectQuestions() {
    const qs = [];
    if (typeof protocolDB === 'undefined') return qs;
    for (const [pid, db] of Object.entries(protocolDB)) {
      if (!db || !db.quiz) continue;
      const meta = PROTOCOL_META[pid] || { name: pid, emoji: '📋' };
      db.quiz.forEach((q, idx) => {
        qs.push({ ...q, _pid: pid, _meta: meta, _idx: idx });
      });
    }
    return qs;
  }

  /* Fisher-Yates 洗牌 */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ─── 打开演练面板 ─── */
  function open() {
    /* 确保 protocolDB 已加载 */
    const raw = collectQuestions();
    if (raw.length === 0) {
      alert('暂无题目，请先浏览几个协议后再来挑战！');
      return;
    }
    allQuestions = shuffle([...raw]);
    currentIndex = 0;
    score = 0;
    answered = 0;

    /* 构建 DOM（若已存在则复用） */
    let backdrop = document.getElementById('drillBackdrop');
    if (!backdrop) {
      backdrop = buildDOM();
      document.body.appendChild(backdrop);
    }

    backdrop.style.display = 'flex';
    renderQuestion();
    /* 防止背景滚动 */
    document.body.style.overflow = 'hidden';

    /* Esc 关闭 */
    backdrop._escHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', backdrop._escHandler);
  }

  /* ─── 关闭演练面板 ─── */
  function close() {
    const backdrop = document.getElementById('drillBackdrop');
    if (backdrop) backdrop.style.display = 'none';
    document.body.style.overflow = '';
    if (backdrop && backdrop._escHandler) {
      document.removeEventListener('keydown', backdrop._escHandler);
    }
  }

  /* ─── 构建面板 DOM ─── */
  function buildDOM() {
    const backdrop = document.createElement('div');
    backdrop.id = 'drillBackdrop';
    backdrop.innerHTML = `
      <div class="drill-panel" id="drillPanel" role="dialog" aria-modal="true" aria-label="错误演练">
        <!-- 头部 -->
        <div class="drill-header">
          <div class="drill-header-left">
            <span class="drill-icon">🎯</span>
            <span class="drill-title">错误演练</span>
          </div>
          <div class="drill-header-right">
            <span class="drill-score-badge" id="drillScoreBadge">0 / 0</span>
            <button class="drill-close-btn" onclick="DrillModule.close()" aria-label="关闭">✕</button>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="drill-progress-wrap">
          <div class="drill-progress-bar" id="drillProgressBar" style="width:0%"></div>
        </div>

        <!-- 题目区 -->
        <div class="drill-body" id="drillBody">
          <!-- 由 renderQuestion() 填充 -->
        </div>

        <!-- 底部操作栏 -->
        <div class="drill-footer">
          <button class="drill-btn drill-btn-skip" id="drillSkipBtn" onclick="DrillModule._skip()">跳过</button>
          <button class="drill-btn drill-btn-next" id="drillNextBtn" onclick="DrillModule._next()" style="display:none">下一题 →</button>
        </div>
      </div>
    `;

    /* 点击遮罩关闭 */
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    return backdrop;
  }

  /* ─── 渲染当前题目 ─── */
  function renderQuestion() {
    if (currentIndex >= allQuestions.length) {
      renderResult();
      return;
    }

    const q = allQuestions[currentIndex];
    const total = allQuestions.length;
    const pct = (currentIndex / total) * 100;

    /* 更新进度条 */
    document.getElementById('drillProgressBar').style.width = pct + '%';
    document.getElementById('drillScoreBadge').textContent = `${score} / ${answered}`;

    /* 重置状态 */
    answerShown = false;
    document.getElementById('drillSkipBtn').style.display = '';
    document.getElementById('drillNextBtn').style.display = 'none';

    const isChoice = Array.isArray(q.options);
    const body = document.getElementById('drillBody');

    if (isChoice) {
      renderChoiceQuestion(q, body);
    } else {
      renderOpenQuestion(q, body);
    }
  }

  /* ─── 选择题 ─── */
  function renderChoiceQuestion(q, body) {
    const meta = q._meta;
    const optionsHtml = q.options.map((opt, i) => `
      <button class="drill-option" data-idx="${i}" onclick="DrillModule._selectOption(this, ${i}, ${q.answer})">
        <span class="drill-option-label">${'ABCD'[i]}</span>
        <span class="drill-option-text">${opt}</span>
      </button>
    `).join('');

    body.innerHTML = `
      <div class="drill-source-tag">${meta.emoji} ${meta.name}</div>
      <div class="drill-question-type">单选题</div>
      <div class="drill-question-text">${q.q}</div>
      <div class="drill-options" id="drillOptions">${optionsHtml}</div>
      <div class="drill-explanation" id="drillExp" style="display:none">
        <div class="drill-exp-title">💡 解析</div>
        <div class="drill-exp-text">${q.exp || ''}</div>
      </div>
    `;
  }

  /* ─── 问答题 ─── */
  function renderOpenQuestion(q, body) {
    const meta = q._meta;
    body.innerHTML = `
      <div class="drill-source-tag">${meta.emoji} ${meta.name}</div>
      <div class="drill-question-type">思考题</div>
      <div class="drill-question-text">${q.q}</div>
      <button class="drill-reveal-btn" id="drillRevealBtn" onclick="DrillModule._revealAnswer()">
        查看答案 ▾
      </button>
      <div class="drill-answer-box" id="drillAnswerBox" style="display:none">
        <div class="drill-exp-title">✅ 参考答案</div>
        <div class="drill-exp-text">${q.a || ''}</div>
        <div class="drill-self-eval">
          <span>你答对了吗？</span>
          <button class="drill-eval-btn drill-eval-yes" onclick="DrillModule._selfEval(true)">✓ 答对了</button>
          <button class="drill-eval-btn drill-eval-no"  onclick="DrillModule._selfEval(false)">✗ 没答对</button>
        </div>
      </div>
    `;
  }

  /* ─── 选择题选项点击 ─── */
  function _selectOption(el, chosen, correct) {
    if (answerShown) return;
    answerShown = true;
    answered++;

    const allOpts = document.querySelectorAll('.drill-option');
    allOpts.forEach(opt => {
      opt.disabled = true;
      const idx = parseInt(opt.dataset.idx);
      if (idx === correct) opt.classList.add('drill-option-correct');
    });

    if (chosen === correct) {
      el.classList.add('drill-option-correct');
      score++;
      _showFeedback(true);
    } else {
      el.classList.add('drill-option-wrong');
      _showFeedback(false);
    }

    /* 显示解析 */
    const expEl = document.getElementById('drillExp');
    if (expEl) expEl.style.display = '';

    _updateScoreBadge();
    _toggleFooterBtns();
  }

  /* ─── 问答题展示答案 ─── */
  function _revealAnswer() {
    const box = document.getElementById('drillAnswerBox');
    const btn = document.getElementById('drillRevealBtn');
    if (box) box.style.display = '';
    if (btn) btn.style.display = 'none';
    answerShown = true;
  }

  /* ─── 问答题自评 ─── */
  function _selfEval(correct) {
    answered++;
    if (correct) score++;
    _showFeedback(correct);
    _updateScoreBadge();
    _toggleFooterBtns();
    /* 禁用自评按钮 */
    document.querySelectorAll('.drill-eval-btn').forEach(b => b.disabled = true);
  }

  /* ─── 反馈动效（短暂显示正确/错误浮层）─── */
  function _showFeedback(correct) {
    const panel = document.getElementById('drillPanel');
    const fb = document.createElement('div');
    fb.className = 'drill-feedback ' + (correct ? 'drill-feedback-ok' : 'drill-feedback-err');
    fb.textContent = correct ? '✓ 正确！' : '✗ 错误';
    panel.appendChild(fb);
    setTimeout(() => fb.remove(), 900);
  }

  /* ─── 更新得分显示 ─── */
  function _updateScoreBadge() {
    document.getElementById('drillScoreBadge').textContent = `${score} / ${answered}`;
  }

  /* ─── 切换底部按钮 ─── */
  function _toggleFooterBtns() {
    document.getElementById('drillSkipBtn').style.display = 'none';
    document.getElementById('drillNextBtn').style.display = '';
  }

  /* ─── 跳过题目 ─── */
  function _skip() {
    currentIndex++;
    renderQuestion();
  }

  /* ─── 下一题 ─── */
  function _next() {
    currentIndex++;
    renderQuestion();
  }

  /* ─── 结果页 ─── */
  function renderResult() {
    const total = answered;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    let grade, gradeColor, gradeEmoji;
    if (pct >= 90) { grade = '优秀'; gradeColor = 'var(--green-400)'; gradeEmoji = '🏆'; }
    else if (pct >= 70) { grade = '良好'; gradeColor = 'var(--blue-400)'; gradeEmoji = '🎉'; }
    else if (pct >= 50) { grade = '及格'; gradeColor = '#f59e0b'; gradeEmoji = '💪'; }
    else { grade = '需加油'; gradeColor = 'var(--red-400)'; gradeEmoji = '📚'; }

    document.getElementById('drillProgressBar').style.width = '100%';
    document.getElementById('drillScoreBadge').textContent = `${score} / ${total}`;
    document.getElementById('drillSkipBtn').style.display = 'none';
    document.getElementById('drillNextBtn').style.display = 'none';

    document.getElementById('drillBody').innerHTML = `
      <div class="drill-result">
        <div class="drill-result-emoji">${gradeEmoji}</div>
        <div class="drill-result-grade" style="color:${gradeColor}">${grade}</div>
        <div class="drill-result-score">${score} <span class="drill-result-total">/ ${total} 题</span></div>
        <div class="drill-result-pct" style="color:${gradeColor}">${pct}%</div>
        <div class="drill-result-desc">${_getDesc(pct)}</div>
        <div class="drill-result-actions">
          <button class="drill-btn drill-btn-restart" onclick="DrillModule._restart()">🔄 再来一次</button>
          <button class="drill-btn drill-btn-close" onclick="DrillModule.close()">返回学习</button>
        </div>
      </div>
    `;
  }

  function _getDesc(pct) {
    if (pct >= 90) return '出色！你对网络协议的掌握已经相当扎实了。';
    if (pct >= 70) return '不错！多走几遍重点协议，就能冲满分！';
    if (pct >= 50) return '继续加油，建议回头复习下错题涉及的协议。';
    return '别灰心，多走几遍动画步骤，知识点自然就记牢了！';
  }

  function _restart() {
    allQuestions = shuffle([...allQuestions]);
    currentIndex = 0;
    score = 0;
    answered = 0;
    document.getElementById('drillProgressBar').style.width = '0%';
    renderQuestion();
  }

  /* ─── 注入样式 ─── */
  function injectStyles() {
    if (document.getElementById('drillStyles')) return;
    const style = document.createElement('style');
    style.id = 'drillStyles';
    style.textContent = `
/* ══════════════════════════════════════
   错误演练模式样式
══════════════════════════════════════ */
#drillBackdrop {
  display: none;
  position: fixed; inset: 0; z-index: 9100;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  align-items: center; justify-content: center;
  padding: 16px;
}

.drill-panel {
  background: var(--bg-2);
  border: 1px solid var(--border-1);
  border-radius: 16px;
  width: min(560px, 100%);
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.4);
  overflow: hidden;
  position: relative;
}

/* 头部 */
.drill-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-1);
  flex-shrink: 0;
}
.drill-header-left { display: flex; align-items: center; gap: 8px; }
.drill-icon { font-size: 20px; }
.drill-title { font-size: 16px; font-weight: 700; color: var(--text-1); }
.drill-header-right { display: flex; align-items: center; gap: 10px; }
.drill-score-badge {
  font-size: 13px; font-weight: 600;
  color: var(--purple-400);
  background: rgba(139,92,246,.1);
  border: 1px solid rgba(139,92,246,.25);
  border-radius: 20px; padding: 2px 10px;
}
.drill-close-btn {
  background: none; border: none;
  color: var(--text-4); cursor: pointer;
  font-size: 16px; padding: 4px 6px;
  border-radius: 6px; line-height: 1;
  transition: background .15s, color .15s;
}
.drill-close-btn:hover { background: var(--bg-3); color: var(--text-1); }

/* 进度条 */
.drill-progress-wrap {
  height: 3px; background: var(--border-1); flex-shrink: 0;
}
.drill-progress-bar {
  height: 100%; background: var(--purple-400);
  transition: width .35s ease;
}

/* 题目区 */
.drill-body {
  flex: 1; overflow-y: auto; padding: 20px 22px;
  scrollbar-width: thin;
}

.drill-source-tag {
  display: inline-block;
  font-size: 11px; font-weight: 600;
  color: var(--purple-400);
  background: rgba(139,92,246,.1);
  border: 1px solid rgba(139,92,246,.2);
  border-radius: 20px; padding: 2px 10px;
  margin-bottom: 10px;
}
.drill-question-type {
  font-size: 11px; color: var(--text-4);
  margin-bottom: 8px; font-weight: 500;
  text-transform: uppercase; letter-spacing: .05em;
}
.drill-question-text {
  font-size: 15px; color: var(--text-1);
  line-height: 1.65; font-weight: 600;
  margin-bottom: 18px;
}

/* 选项 */
.drill-options { display: flex; flex-direction: column; gap: 9px; }
.drill-option {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-3); border: 1.5px solid var(--border-1);
  border-radius: 10px; padding: 11px 14px;
  cursor: pointer; text-align: left;
  transition: border-color .15s, background .15s, transform .1s;
  font-size: 14px; color: var(--text-1);
  width: 100%;
}
.drill-option:not(:disabled):hover {
  border-color: var(--purple-400);
  background: rgba(139,92,246,.06);
  transform: translateY(-1px);
}
.drill-option-label {
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--bg-2); border: 1px solid var(--border-1);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--text-3);
  flex-shrink: 0;
}
.drill-option-text { flex: 1; line-height: 1.5; }

.drill-option-correct {
  border-color: var(--green-400) !important;
  background: rgba(52,211,153,.1) !important;
}
.drill-option-correct .drill-option-label {
  background: var(--green-400); color: #fff; border-color: var(--green-400);
}
.drill-option-wrong {
  border-color: var(--red-400) !important;
  background: rgba(248,113,113,.08) !important;
}
.drill-option-wrong .drill-option-label {
  background: var(--red-400); color: #fff; border-color: var(--red-400);
}

/* 解析 */
.drill-explanation, .drill-answer-box {
  margin-top: 14px; padding: 12px 14px;
  background: rgba(139,92,246,.06);
  border: 1px solid rgba(139,92,246,.18);
  border-radius: 10px;
}
.drill-exp-title {
  font-size: 12px; font-weight: 700;
  color: var(--purple-400); margin-bottom: 8px;
}
.drill-exp-text {
  font-size: 13px; color: var(--text-2); line-height: 1.7;
}

/* 问答题按钮 */
.drill-reveal-btn {
  margin-top: 14px;
  background: rgba(139,92,246,.1);
  border: 1px solid rgba(139,92,246,.25);
  color: var(--purple-400);
  border-radius: 8px; padding: 8px 18px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.drill-reveal-btn:hover { background: rgba(139,92,246,.18); }

/* 自评 */
.drill-self-eval {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid var(--border-1);
  font-size: 12px; color: var(--text-3);
}
.drill-eval-btn {
  border: none; border-radius: 6px;
  padding: 5px 14px; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: opacity .15s;
}
.drill-eval-btn:disabled { opacity: .45; cursor: default; }
.drill-eval-yes { background: rgba(52,211,153,.15); color: var(--green-400); }
.drill-eval-yes:not(:disabled):hover { background: rgba(52,211,153,.25); }
.drill-eval-no  { background: rgba(248,113,113,.12); color: var(--red-400); }
.drill-eval-no:not(:disabled):hover { background: rgba(248,113,113,.22); }

/* 底部 */
.drill-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 22px; border-top: 1px solid var(--border-1);
  flex-shrink: 0;
}
.drill-btn {
  border: none; border-radius: 8px;
  padding: 9px 20px; font-size: 13.5px; font-weight: 600;
  cursor: pointer; transition: opacity .15s, transform .1s;
}
.drill-btn:hover { opacity: .85; transform: translateY(-1px); }
.drill-btn-skip {
  background: var(--bg-3); color: var(--text-3);
  border: 1px solid var(--border-1);
}
.drill-btn-next {
  background: var(--purple-400); color: #fff;
}
.drill-btn-restart {
  background: rgba(139,92,246,.12); color: var(--purple-400);
  border: 1px solid rgba(139,92,246,.25);
}
.drill-btn-close {
  background: var(--bg-3); color: var(--text-2);
  border: 1px solid var(--border-1);
}

/* 反馈浮层 */
.drill-feedback {
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
  padding: 8px 24px; border-radius: 30px;
  font-size: 15px; font-weight: 700; pointer-events: none;
  animation: drillFbIn .15s ease, drillFbOut .3s ease .6s forwards;
  z-index: 10;
}
.drill-feedback-ok  { background: rgba(52,211,153,.9);  color: #fff; }
.drill-feedback-err { background: rgba(248,113,113,.9); color: #fff; }
@keyframes drillFbIn  { from { opacity:0; transform:translateX(-50%) scale(.8); } to { opacity:1; transform:translateX(-50%) scale(1); } }
@keyframes drillFbOut { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(-8px); } }

/* 结果页 */
.drill-result {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 20px 0 10px;
}
.drill-result-emoji { font-size: 52px; margin-bottom: 12px; }
.drill-result-grade { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
.drill-result-score {
  font-size: 42px; font-weight: 800; color: var(--text-1); line-height: 1;
}
.drill-result-total { font-size: 16px; color: var(--text-3); font-weight: 400; }
.drill-result-pct { font-size: 20px; font-weight: 700; margin: 6px 0 14px; }
.drill-result-desc { font-size: 13px; color: var(--text-3); line-height: 1.6; max-width: 340px; margin-bottom: 22px; }
.drill-result-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* 移动端适配 */
@media (max-width: 600px) {
  .drill-panel { border-radius: 12px; }
  .drill-body { padding: 16px; }
  .drill-question-text { font-size: 14px; }
  .drill-option { font-size: 13px; padding: 10px 12px; }
}
    `;
    document.head.appendChild(style);
  }

  /* ─── 初始化：注入样式 ─── */
  injectStyles();

  /* ─── 公开 API ─── */
  return {
    open,
    close,
    _selectOption,
    _revealAnswer,
    _selfEval,
    _skip,
    _next,
    _restart,
  };
})();

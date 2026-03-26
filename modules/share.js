/**
 * NetViz Share Module — modules/share.js
 * 分享当前协议步骤为海报图片
 *
 * 接口：
 *   window.NetVizModules.share.shareStep(protoTitle, stepTitle, stepEmoji)
 *
 * 依赖：html2canvas（首次触发时懒加载）
 * 策略：截取 .animation-canvas 区域，叠加水印，生成 PNG 供下载或复制
 */

(function () {
  'use strict';

  const HTML2CANVAS_VERSION = '1.4.1';
  const HTML2CANVAS_CDN =
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/' +
    HTML2CANVAS_VERSION + '/html2canvas.min.js';

  let _html2canvasLoaded = false;
  let _loadingPromise = null;

  /* ── 懒加载 html2canvas ── */
  function loadHtml2Canvas() {
    if (_html2canvasLoaded && typeof html2canvas === 'function') {
      return Promise.resolve();
    }
    if (_loadingPromise) return _loadingPromise;

    _loadingPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = HTML2CANVAS_CDN;
      s.onload = function () {
        _html2canvasLoaded = true;
        resolve();
      };
      s.onerror = function () {
        _loadingPromise = null;
        reject(new Error('html2canvas 加载失败，请检查网络连接'));
      };
      document.head.appendChild(s);
    });
    return _loadingPromise;
  }

  /* ── 生成海报 Canvas ── */
  function buildPoster(sourceCanvas, opts) {
    // opts: { protoTitle, stepTitle, stepEmoji, stepNum, totalSteps }
    var W = sourceCanvas.width;
    var H = sourceCanvas.height;

    var poster = document.createElement('canvas');
    // 海报比源画布高一些，留顶部标题 + 底部水印
    var HEADER = Math.round(W * 0.10);
    var FOOTER = Math.round(W * 0.07);
    poster.width  = W;
    poster.height = H + HEADER + FOOTER;

    var ctx = poster.getContext('2d');

    // ── 背景（深色渐变）──
    var grad = ctx.createLinearGradient(0, 0, 0, poster.height);
    grad.addColorStop(0,   '#0b0f1e');
    grad.addColorStop(0.5, '#0f1628');
    grad.addColorStop(1,   '#060912');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, poster.width, poster.height);

    // ── 边框装饰线 ──
    ctx.strokeStyle = 'rgba(79,142,247,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, poster.width - 16, poster.height - 16);

    // ── 顶部：协议名 + 步骤标题 ──
    var px = function(n) { return Math.round(W / 400 * n); };  // 按宽度缩放字号
    ctx.textBaseline = 'middle';

    // 协议 emoji 和步骤 emoji
    ctx.font = px(22) + 'px serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(opts.stepEmoji || '📡', px(20), HEADER * 0.35);

    // 协议标题
    ctx.font = 'bold ' + px(14) + 'px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(opts.protoTitle || 'NetViz', px(52), HEADER * 0.32);

    // 步骤标题
    ctx.font = px(12) + 'px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    var stepLabel = (opts.stepNum && opts.totalSteps)
      ? 'Step ' + opts.stepNum + '/' + opts.totalSteps + '  ' + (opts.stepTitle || '')
      : (opts.stepTitle || '');
    ctx.fillText(stepLabel, px(52), HEADER * 0.68);

    // ── 截图内容 ──
    ctx.drawImage(sourceCanvas, 0, HEADER, W, H);

    // ── 底部水印 ──
    ctx.font = px(10) + 'px "Segoe UI", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.textBaseline = 'middle';
    var watermark = '🌐 NetViz — 网络协议可视化学习平台';
    ctx.fillText(watermark, px(20), H + HEADER + FOOTER * 0.5);

    // 右侧 URL
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(79,142,247,0.6)';
    ctx.fillText('wangjl2025.github.io/netvis', poster.width - px(20), H + HEADER + FOOTER * 0.5);
    ctx.textAlign = 'left';

    return poster;
  }

  /* ── 触发下载 ── */
  function downloadCanvas(canvas, filename) {
    canvas.toBlob(function (blob) {
      if (!blob) {
        fallbackShowToast('生成图片失败，请截图保存');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    }, 'image/png');
  }

  /* ── 降级提示（直接调主文件 showToast，它是全局函数）── */
  function fallbackShowToast(msg, type) {
    if (typeof showToast === 'function') {
      showToast(msg, type || 'info');
    } else {
      alert(msg);
    }
  }

  /* ── 公开接口 ── */
  var share = {
    /**
     * 截取当前动画画布，生成海报并下载
     * @param {string} protoTitle  协议名称，如 "TCP 三次握手"
     * @param {string} stepTitle   当前步骤标题
     * @param {string} stepEmoji   当前步骤 emoji
     * @param {number} stepNum     当前步骤序号（1-based）
     * @param {number} totalSteps  总步骤数
     */
    shareStep: function (protoTitle, stepTitle, stepEmoji, stepNum, totalSteps) {
      // 找到当前可见的动画画布容器
      var canvasArea = document.querySelector('.animation-canvas:not([style*="display:none"])') ||
                       document.querySelector('.animation-canvas');
      if (!canvasArea) {
        fallbackShowToast('找不到动画区域，无法截图', 'error');
        return;
      }

      fallbackShowToast('⏳ 正在生成海报…', 'info');

      loadHtml2Canvas().then(function () {
        return html2canvas(canvasArea, {
          backgroundColor: '#0b0f1e',
          scale: window.devicePixelRatio > 1 ? 2 : 1,
          useCORS: true,
          logging: false,
        });
      }).then(function (canvas) {
        var poster = buildPoster(canvas, {
          protoTitle:  protoTitle  || 'NetViz',
          stepTitle:   stepTitle   || '',
          stepEmoji:   stepEmoji   || '📡',
          stepNum:     stepNum,
          totalSteps:  totalSteps,
        });

        var safeName = (protoTitle || 'netviz').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-');
        var filename = 'NetViz-' + safeName + '-step' + (stepNum || 1) + '.png';
        downloadCanvas(poster, filename);
        fallbackShowToast('✅ 海报已下载，快去分享吧！', 'success');
      }).catch(function (err) {
        console.error('[share]', err);
        fallbackShowToast('截图失败：' + (err.message || '未知错误'), 'error');
      });
    },
  };

  window.NetVizModules = window.NetVizModules || {};
  window.NetVizModules.share = share;

})();

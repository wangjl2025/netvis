/**
 * sw.js — NetViz Service Worker（PWA 离线支持）
 * 策略：Stale-While-Revalidate（核心资源） + Network First（协议数据）
 * 版本号更新后会自动清理旧缓存
 */

const CACHE_VERSION = 'netvis-v20260327';
const CORE_CACHE = CACHE_VERSION + '-core';
const DATA_CACHE = CACHE_VERSION + '-data';

// 核心资源：安装时预缓存（Stale-While-Revalidate）
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './styles.min.css',
  './modules/badge.js',
  './modules/learning.js',
  './modules/share.js',
  './modules/drill.js',
  './modules/flashcard.js',
  './modules/capture.js',
];

// 协议数据文件：按需缓存（Network First with fallback）
const DATA_PATTERN = /\/data\//;

// ── 安装：预缓存核心资源 ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE).then(cache => {
      return cache.addAll(CORE_ASSETS).catch(err => {
        // 部分资源可能不存在（如 og-image.png），不因此中断安装
        console.warn('[SW] 预缓存部分失败（不影响运行）:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── 激活：清理旧版本缓存 ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('netvis-') && k !== CORE_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch：分策略处理 ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 只处理同源 GET 请求
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // CDN 资源（html2canvas 等）：网络优先，失败时不兜底（在线功能）
  if (url.hostname !== self.location.hostname) return;

  if (DATA_PATTERN.test(url.pathname)) {
    // 协议数据：Network First（保证最新），失败时从缓存取
    event.respondWith(networkFirstStrategy(event.request, DATA_CACHE));
  } else {
    // 核心资源：Stale-While-Revalidate（立刻从缓存响应，后台异步更新缓存）
    event.respondWith(staleWhileRevalidate(event.request, CORE_CACHE));
  }
});

// ── 策略函数 ──────────────────────────────────────────────────────────

/** Stale-While-Revalidate：有缓存立刻返回，同时后台更新；无缓存则走网络 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // 后台异步更新缓存（不阻塞当前响应）
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // 有缓存：立刻返回，后台已在更新，下次访问即是新版
  if (cached) return cached;

  // 无缓存：等待网络结果
  const response = await fetchPromise;
  if (response) return response;

  // 彻底离线且无缓存：返回离线提示页
  return new Response(offlinePage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/** Network First：先走网络并更新缓存，网络失败则取缓存 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('// 离线：协议数据暂不可用', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
}

/** 离线兜底页面（极简） */
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>NetViz — 离线</title>
<style>body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}
h1{font-size:2rem;margin-bottom:.5rem}p{color:#8b949e}</style></head>
<body><div><h1>📡 当前离线</h1>
<p>请检查网络连接后刷新页面。</p>
<p style="margin-top:1.5rem"><a href="./" style="color:#4f8ef7">重新加载</a></p>
</div></body></html>`;
}


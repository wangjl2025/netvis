const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8766;

const MIME = {
  html: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  json: 'application/json',
  png: 'image/png',
  ico: 'image/x-icon',
  xml: 'application/xml',
  txt: 'text/plain',
  webmanifest: 'application/manifest+json',
};

const s = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const f = path.join(ROOT, urlPath);
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) {
    res.writeHead(404);
    res.end('Not found: ' + urlPath);
    return;
  }
  const ext = path.extname(f).slice(1).toLowerCase();
  const ct = (MIME[ext] || 'text/plain') + ';charset=utf-8';
  // 本地开发：禁用所有缓存，确保每次都拿到最新文件
  res.writeHead(200, {
    'Content-Type': ct,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });
  res.end(fs.readFileSync(f));
});

s.listen(PORT, '0.0.0.0', () => {
  console.log(`NetViz dev server → http://localhost:${PORT}/`);
});

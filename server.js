const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const s = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const f = path.join(ROOT, urlPath);
  if (!fs.existsSync(f)) {
    res.writeHead(404);
    res.end('Not found: ' + urlPath);
    return;
  }
  const ext = path.extname(f).slice(1);
  const ct = { html: 'text/html', js: 'application/javascript', css: 'text/css' }[ext] || 'text/plain';
  res.writeHead(200, { 'Content-Type': ct + ';charset=utf-8' });
  res.end(fs.readFileSync(f));
});

s.listen(8765, '127.0.0.1', () => {
  console.log('NetViz server running at http://127.0.0.1:8765/');
});

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'Frontend');
const PORT = process.env.PORT || 8000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/page/index.html' : req.url;
  const safePath = decodeURIComponent(urlPath.split('?')[0]);
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Server Error');
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Static preview server running at http://localhost:${PORT}`);
});

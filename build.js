const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Production Build for Salini Tyre Repairs...\n');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// 1. Clean & recreate dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Copy images folder recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const imagesSrc = path.join(srcDir, 'images');
const imagesDist = path.join(distDir, 'images');
if (fs.existsSync(imagesSrc)) {
  copyDirSync(imagesSrc, imagesDist);
  console.log('✅ Copied /images folder to dist/images/');
}

// 3. Process & Minify index.html
let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const originalHtmlSize = Buffer.byteLength(html, 'utf8');

// Insert Service Worker Registration script before </body>
const swRegisterScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').then(function(reg) {
          console.log('PWA ServiceWorker registered with scope:', reg.scope);
        }).catch(function(err) {
          console.log('ServiceWorker registration failed:', err);
        });
      });
    }
  </script>
`;

if (html.includes('</body>')) {
  html = html.replace('</body>', swRegisterScript + '\n</body>');
} else {
  html += swRegisterScript;
}

// Safe minification (remove HTML comments, minify inline whitespace cleanly)
let minifiedHtml = html
  .replace(/<!--(?!\[if)[\s\S]*?-->/g, '') // Remove HTML comments
  .replace(/\n\s+/g, '\n')                 // Trim leading spaces per line
  .replace(/\s+\n/g, '\n')                 // Trim trailing spaces per line
  .replace(/>\s+</g, '><');                // Collapse spaces between tags

fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHtml, 'utf8');
const minifiedHtmlSize = Buffer.byteLength(minifiedHtml, 'utf8');

console.log(`✅ Minified index.html (${(originalHtmlSize / 1024).toFixed(1)} KB -> ${(minifiedHtmlSize / 1024).toFixed(1)} KB, Saved ${(((originalHtmlSize - minifiedHtmlSize) / originalHtmlSize) * 100).toFixed(1)}%)`);

// 4. Generate Service Worker sw.js
const swContent = `
const CACHE_NAME = 'salini-tyres-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './images/carousel-1.jpg',
  './images/carousel-2.jpg',
  './images/carousel-3.jpg',
  './images/carousel-4.jpg',
  './images/carousel-5.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch background update
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
`;

fs.writeFileSync(path.join(distDir, 'sw.js'), swContent.trim(), 'utf8');
console.log('✅ Generated Service Worker dist/sw.js for PWA offline support');

// 5. Copy & Update manifest.json
const manifestPath = path.join(srcDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  let manifestStr = fs.readFileSync(manifestPath, 'utf8');
  fs.writeFileSync(path.join(distDir, 'manifest.json'), manifestStr, 'utf8');
  console.log('✅ Copied manifest.json to dist/');
}

// 6. Generate Netlify / Cloudflare deployment headers
const headersContent = `
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/sw.js
  Cache-Control: public, max-age=0, must-revalidate
`;
fs.writeFileSync(path.join(distDir, '_headers'), headersContent.trim(), 'utf8');
console.log('✅ Generated production headers file dist/_headers');

// 7. Copy server.js to dist/server.js adapted for production
const serverDistContent = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const decodedUrl = decodeURIComponent(req.url);
  let filePath = path.resolve(PUBLIC_DIR, decodedUrl === '/' ? 'index.html' : decodedUrl.substring(1));
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('File Not Found');
      } else {
        res.statusCode = 500;
        res.end('Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' || ext === '.js' ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(\`Production Server is running at http://localhost:\${PORT}\`);
});
`;
fs.writeFileSync(path.join(distDir, 'server.js'), serverDistContent.trim(), 'utf8');
console.log('✅ Generated production server dist/server.js');

console.log('\n🎉 Production Build Completed Successfully! Output in dist/\n');

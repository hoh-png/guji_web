// 临时验证用静态服务器（验证完成后随 _verify/ 目录一起删除）
// 仅用 Node 内置能力，避免依赖沙箱中不可用的子进程。
//
// 目录约定：
//   /original/**  → 原版静态站点快照（原样服务，无回退）
//   /ref/**       → React 重构版构建产物
//   /assets/**、/images/** → 映射到 /ref/ 下的同名路径，
//                   因为重构版 base='/'，产物里引用的是根路径绝对地址。
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PORT = Number(process.argv[2] || 4180)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

/** 把 URL 路径解析为磁盘文件；目录则取其中的 index.html */
function resolveFile(urlPath) {
  // 原版快照挂在 /original/ 下，其余根路径一律指向重构版构建产物 _verify/ref/
  const candidates = urlPath.startsWith('/original/')
    ? [path.join(ROOT, urlPath.replace(/^\//, ''))]
    : [path.join(ROOT, 'ref', urlPath.replace(/^\//, ''))]

  for (const candidate of candidates) {
    if (!candidate.startsWith(ROOT)) continue // 防目录穿越
    try {
      const stat = fs.statSync(candidate)
      if (stat.isFile()) return { filePath: candidate, stat }
      if (stat.isDirectory()) {
        const indexFile = path.join(candidate, 'index.html')
        if (fs.existsSync(indexFile)) {
          return { filePath: indexFile, stat: fs.statSync(indexFile) }
        }
      }
    } catch {
      /* 该候选项不存在，继续下一个 */
    }
  }
  return null
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    const isOriginal = urlPath.startsWith('/original/')

    let found = resolveFile(urlPath)

    // 单页应用路由回退：重构版的子页面路由形如 /pages/science.html，
    // 磁盘上并不存在这个文件，交回 index.html 由前端路由解析
    //（等价于 Nginx 的 try_files $uri /index.html）。
    // 只对 SPA 路由前缀生效，缺失的静态资源仍然老实报 404。
    const isSpaRoute = urlPath === '/' || urlPath === '/index.html' || urlPath.startsWith('/pages/')
    if (!found && !isOriginal && isSpaRoute) {
      const fallback = path.join(ROOT, 'ref', 'index.html')
      if (fs.existsSync(fallback)) found = { filePath: fallback, stat: fs.statSync(fallback) }
    }

    if (!found) return send(res, 404, 'not found: ' + urlPath)

    const ext = path.extname(found.filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': found.stat.size,
      'Cache-Control': 'no-store',
    })
    fs.createReadStream(found.filePath).pipe(res)
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`[verify-server] http://127.0.0.1:${PORT}/  root=${ROOT}`)
  })

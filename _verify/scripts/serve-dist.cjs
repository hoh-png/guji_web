// 静态服务器：把 _verify/ 目录按原样伺服，用于在浏览器里验证构建产物。
//
// 用法：
//   npm run build
//   xcopy /E /Y dist _verify            # Windows：把产物放到 _verify 根下
//   node _verify/scripts/serve-dist.cjs 4182
//   # 打开 http://127.0.0.1:4182/index.html
//
// 产物必须放在 _verify 根下（index.html + assets/ + images/），
// 因为应用用的是根路径绝对地址；未命中的 /pages/* 回退到 index.html。
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PORT = Number(process.argv[2] || 4182)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(body)
}

function stream(res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase()
  const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    // 图片允许缓存，便于验证预加载是否真的命中缓存；其余不缓存，避免拿到旧包
    'Cache-Control': isImage ? 'public, max-age=31536000' : 'no-store',
  })
  fs.createReadStream(filePath).pipe(res)
}

/** 尝试把 URL 路径解析为磁盘文件；目录取其中的 index.html */
function tryFile(urlPath) {
  const candidate = path.join(ROOT, urlPath.replace(/^\//, ''))
  if (!candidate.startsWith(ROOT)) return null
  try {
    const stat = fs.statSync(candidate)
    if (stat.isFile()) return { filePath: candidate, stat }
    if (stat.isDirectory()) {
      const index = path.join(candidate, 'index.html')
      if (fs.existsSync(index)) return { filePath: index, stat: fs.statSync(index) }
    }
  } catch {
    /* 不存在 */
  }
  return null
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])

    let found = tryFile(urlPath)

    // 单页应用路由回退：/pages/* 与根路径交给 index.html
    if (!found) {
      const index = path.join(ROOT, 'index.html')
      if (fs.existsSync(index)) found = { filePath: index, stat: fs.statSync(index) }
    }

    if (!found) return send(res, 404, 'not found: ' + urlPath)
    stream(res, found.filePath, found.stat)
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`[serve-plain] http://127.0.0.1:${PORT}/  root=${ROOT}`)
  })

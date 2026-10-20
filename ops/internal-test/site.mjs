import { createReadStream, existsSync, statSync } from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(scriptDir, "../../dist")
const indexFile = path.join(distDir, "index.html")
const host = "127.0.0.1"
const port = 4174
const apiPort = 3101

if (!existsSync(indexFile)) {
  throw new Error("dist/index.html is missing; run npm run build with VITE_API_URL=/api first")
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

function serveFile(file, method, res) {
  const stats = statSync(file)
  res.writeHead(200, {
    "content-length": stats.size,
    "content-type": contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
    "x-content-type-options": "nosniff",
  })
  if (method === "HEAD") return res.end()
  createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname)
  } catch {
    res.writeHead(400).end("Bad request")
    return
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const proxy = http.request({
      hostname: host,
      port: apiPort,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `${host}:${apiPort}` },
    }, (upstream) => {
      res.writeHead(upstream.statusCode || 502, upstream.headers)
      upstream.pipe(res)
    })
    proxy.on("error", () => res.writeHead(502).end("API unavailable"))
    req.pipe(proxy)
    return
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" }).end()
    return
  }

  const file = path.resolve(distDir, pathname.replace(/^\/+/, ""))
  if (file !== distDir && !file.startsWith(`${distDir}${path.sep}`)) {
    res.writeHead(403).end("Forbidden")
    return
  }
  const resolved = existsSync(file) && statSync(file).isFile() ? file : indexFile
  serveFile(resolved, req.method, res)
})

server.listen(port, host, () => {
  console.log(`Internal gateway listening at http://${host}:${port}`)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}

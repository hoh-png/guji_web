/**
 * 在页面里处理图片：解码 → 抠白底 → 裁到内容 → 缩到目标宽 → 导出 WebP（保留透明）。
 * 逐张处理并通过 CDP 回传 base64，避免依赖本机 imagemagick 之类的工具。
 *
 * 用法: node _verify/scripts/process-images.cjs <cdpPort> <base> <manifestJson>
 *
 * manifest 格式: [{ "src": "public/.../x.png", "out": "public/.../x.webp", "width": 320 }]
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const MANIFEST = process.argv[4]
const ROOT = path.resolve(__dirname, '..', '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const jobs = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target on port ' + PORT)

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  await new Promise((res, rej) => {
    ws.addEventListener('open', res)
    ws.addEventListener('error', rej)
  })
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(m.error.message)) : resolve(m.result)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const myId = ++id
      pending.set(myId, { resolve, reject })
      ws.send(JSON.stringify({ id: myId, method, params }))
      setTimeout(() => {
        if (pending.has(myId)) {
          pending.delete(myId)
          reject(new Error('timeout ' + method))
        }
      }, 180000)
    })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: `${BASE}/index.html` })
  await sleep(2500)

  let before = 0
  let after = 0

  for (const job of jobs) {
    const srcAbs = path.join(ROOT, job.src)
    if (!fs.existsSync(srcAbs)) {
      console.log(`  跳过（不存在）: ${job.src}`)
      continue
    }
    const srcSize = fs.statSync(srcAbs).size
    const b64 = fs.readFileSync(srcAbs).toString('base64')
    const mime = 'image/png' // 这批源文件实际都是 PNG
    const width = job.width || 320

    const res = await evaluate(`(async () => {
      const dataUrl = ${JSON.stringify(`data:${mime};base64,` + b64)};
      const img = await new Promise((res) => {
        const i = new Image();
        const to = setTimeout(() => res('TIMEOUT'), 60000);
        i.onload = () => { clearTimeout(to); res(i); };
        i.onerror = () => { clearTimeout(to); res('ERROR'); };
        i.src = dataUrl;
      });
      if (img === 'TIMEOUT' || img === 'ERROR') return { ok: false, reason: img };

      const W = img.naturalWidth, H = img.naturalHeight;
      const src = document.createElement('canvas');
      src.width = W; src.height = H;
      const sctx = src.getContext('2d');
      sctx.clearRect(0, 0, W, H);
      sctx.drawImage(img, 0, 0);
      const d = sctx.getImageData(0, 0, W, H);

      /*
       * 这批文物图是「白底 + 居中主体」，需要把白底抠成透明。
       * 判据：与白色的最大通道差，留有过渡区避免硬边。
       */
      const NEAR = 8;
      const FAR = 30;
      let minX = W, minY = H, maxX = -1, maxY = -1;
      const px = d.data;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const diff = Math.max(255 - px[i], 255 - px[i + 1], 255 - px[i + 2]);
          if (diff <= NEAR) px[i + 3] = 0;
          else if (diff < FAR) px[i + 3] = Math.round((255 * (diff - NEAR)) / (FAR - NEAR));
          if (px[i + 3] > 8) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return { ok: false, reason: 'EMPTY' };
      sctx.putImageData(d, 0, 0);

      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const tw = Math.min(${width}, cw);
      const th = Math.round((ch / cw) * tw);
      const out = document.createElement('canvas');
      out.width = tw; out.height = th;
      const octx = out.getContext('2d');
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.clearRect(0, 0, tw, th);
      octx.drawImage(src, minX, minY, cw, ch, 0, 0, tw, th);
      const url = out.toDataURL('image/webp', 0.9);
      return { ok: true, outWidth: tw, outHeight: th, base64: url.slice(url.indexOf(',') + 1) };
    })()`)

    if (!res.ok) {
      console.log(`  ${path.basename(job.out)} 失败: ${res.reason}`)
      continue
    }

    const outAbs = path.join(ROOT, job.out)
    fs.mkdirSync(path.dirname(outAbs), { recursive: true })
    const buf = Buffer.from(res.base64, 'base64')
    fs.writeFileSync(outAbs, buf)
    before += srcSize
    after += buf.length
    console.log(
      `  ${path.basename(job.out).padEnd(14)} ${(srcSize / 1024).toFixed(0)} KB -> ${(buf.length / 1024).toFixed(0)} KB  (${res.outWidth}×${res.outHeight})`,
    )
  }

  console.log(`\n合计 ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB`)
  ws.close()
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

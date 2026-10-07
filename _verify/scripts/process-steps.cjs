/**
 * 处理修复步骤图：白底抠成透明 → 裁到内容 → 缩到目标宽，输出 WebP。
 *
 * 这批图是「整幅 2160×1620 画布 + 纯白底 + 居中器物」，
 * 直接贴到工坊里会是一块白方块，所以要抠底。
 *
 * 用法: node _verify/scripts/process-steps.cjs <cdpPort> <base> [prefix] [width]
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const PREFIX = process.argv[4] || 'step'
const WIDTH = Number(process.argv[5] || 420)
const ROOT = path.resolve(__dirname, '..', '..')
const SRC_DIR = path.join(ROOT, '_verify', 'src-steps')
const OUT_DIR = path.join(ROOT, 'public', 'images', 'workshop')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.png'))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

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

  fs.mkdirSync(OUT_DIR, { recursive: true })

  let before = 0
  let after = 0

  for (const file of files) {
    const abs = path.join(SRC_DIR, file)
    const buf = fs.readFileSync(abs)
    before += buf.length
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
    const index = Number(file.match(/\d+/)[0])

    const res = await evaluate(`(async () => {
      const img = await new Promise((res) => {
        const i = new Image();
        const to = setTimeout(() => res('TIMEOUT'), 60000);
        i.onload = () => { clearTimeout(to); res(i); };
        i.onerror = () => { clearTimeout(to); res('ERROR'); };
        i.src = ${JSON.stringify(dataUrl)};
      });
      if (img === 'TIMEOUT' || img === 'ERROR') return { ok: false, reason: img };

      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H);
      const px = d.data;

      // 抠白底：与白色的最大通道差做判据，留过渡区避免硬边
      const NEAR = 10, FAR = 34;
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const diff = Math.max(255 - px[i], 255 - px[i + 1], 255 - px[i + 2]);
          let a;
          if (diff <= NEAR) a = 0;
          else if (diff < FAR) a = Math.round((255 * (diff - NEAR)) / (FAR - NEAR));
          else a = 255;
          px[i + 3] = Math.min(px[i + 3], a);
          if (px[i + 3] > 8) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return { ok: false, reason: 'EMPTY' };
      ctx.putImageData(d, 0, 0);

      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const tw = Math.min(${WIDTH}, cw);
      const th = Math.round((ch / cw) * tw);
      const out = document.createElement('canvas');
      out.width = tw; out.height = th;
      const octx = out.getContext('2d');
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.clearRect(0, 0, tw, th);
      octx.drawImage(c, minX, minY, cw, ch, 0, 0, tw, th);
      const url = out.toDataURL('image/webp', 0.92);
      return { ok: true, w: tw, h: th, base64: url.slice(url.indexOf(',') + 1) };
    })()`)

    if (!res.ok) {
      console.log(`  ${file} 失败: ${res.reason}`)
      continue
    }

    const outBuf = Buffer.from(res.base64, 'base64')
    const name = `${PREFIX}-${index}.webp`
    fs.writeFileSync(path.join(OUT_DIR, name), outBuf)
    after += outBuf.length
    console.log(`  ${name.padEnd(14)} ${(buf.length / 1024).toFixed(0)} KB -> ${(outBuf.length / 1024).toFixed(0)} KB  (${res.w}×${res.h})`)
  }

  console.log(`\n合计 ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB`)
  ws.close()
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

/**
 * 量出商店素材的可见内容边界（去掉四周留白），供 CSS 按比例摆放。
 * 用法: node _verify/measure-shop.cjs <cdpPort> <verifyBase>
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const FILES = [
  'back-arrow.webp',
  'back-frame.webp',
  'slot-frame.webp',
  'grid-frame.webp',
  'coin.webp',
  'ingot.webp',
  'currency-frame.webp',
  'stamp-owned.webp',
  'badge-discount.webp',
  'divider.webp',
]

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
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
      }, 120000)
    })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: BASE + '/images/shop/reference.jpg' })
  await sleep(800)

  const out = []
  for (const f of FILES) {
    const url = BASE + '/images/shop/components/' + f
    const r = await evaluate(`(async () => {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('load fail ${f}'));
        i.src = ${JSON.stringify(url)} + '?ts=' + Date.now();
      });
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
      const corners = [px(1,1), px(W-2,1), px(1,H-2), px(W-2,H-2)];
      const bgAlpha = Math.round(corners.reduce((s,c)=>s+c[3],0)/4);
      const bg = [0,1,2].map(k => Math.round(corners.reduce((s,c)=>s+c[k],0)/4));
      const whiteBg = bgAlpha > 200 && bg[0] > 235 && bg[1] > 235 && bg[2] > 235;

      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const a = d[i+3];
          let diff = whiteBg
            ? Math.max(255 - d[i], 255 - d[i+1], 255 - d[i+2])
            : Math.max(Math.abs(d[i]-bg[0]), Math.abs(d[i+1]-bg[1]), Math.abs(d[i+2]-bg[2]));
          if (a > 16 && diff > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      return { W, H, whiteBg, bg, content: maxX >= 0 ? { x: minX, y: minY, w: maxX-minX+1, h: maxY-minY+1 } : null };
    })()`)
    out.push({ file: f, ...r })
    const c = r.content
    console.log(
      `${f.padEnd(22)} ${(r.W + 'x' + r.H).padEnd(11)} 底=${r.whiteBg ? '白' : JSON.stringify(r.bg)}  ` +
        (c ? `内容 x${c.x} y${c.y} ${c.w}x${c.h}` : '无内容'),
    )
  }

  fs.writeFileSync(path.join(__dirname, 'shop-measure.json'), JSON.stringify(out, null, 2), 'utf8')
  ws.close()
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

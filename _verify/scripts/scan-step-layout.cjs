/**
 * 量每个文件夹「步骤1」里不透明内容的分栏情况，
 * 用于判断图里是一件文物还是两件并排。
 * 用法: node _verify/scripts/scan-step-layout.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const JS = `(async () => {
  const out = [];
  for (let n = 1; n <= 14; n++) {
    const url = '${BASE}/images/stepcheck/f' + n + '.png?t=' + Date.now();
    const img = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = url;
    });
    if (!img) { out.push({ folder: n, error: 'load fail' }); continue; }
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;

    // 列方向投影：统计每列的不透明像素数
    const colCount = new Array(W).fill(0);
    let allMinX = W, allMaxX = -1, allMinY = H, allMaxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 24) {
          colCount[x]++;
          if (x < allMinX) allMinX = x; if (x > allMaxX) allMaxX = x;
          if (y < allMinY) allMinY = y; if (y > allMaxY) allMaxY = y;
        }
      }
    }
    // 找列投影里的「空档」（连续若干列计数为 0）
    const gaps = [];
    let run = 0;
    for (let x = allMinX; x <= allMaxX; x++) {
      if (colCount[x] === 0) { run++; }
      else { if (run >= 12) gaps.push([x - run, x - 1, run]); run = 0; }
    }
    out.push({
      folder: n,
      content: { x: allMinX, y: allMinY, w: allMaxX - allMinX + 1, h: allMaxY - allMinY + 1 },
      gaps: gaps.map(g => ({ from: g[0], to: g[1], width: g[2] })),
      columns: gaps.length + 1,
    });
  }
  return out;
})()`

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
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
      setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); reject(new Error('timeout ' + method)) } }, 180000)
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

  const out = await evaluate(JS)
  out.forEach((r) => {
    if (r.error) return console.log(`  文件夹 ${r.folder}: ${r.error}`)
    console.log(
      `  文件夹 ${String(r.folder).padStart(2)}  内容 ${String(r.content.w).padStart(4)}×${String(r.content.h).padStart(4)}` +
        `  分栏 ${r.columns}` +
        (r.gaps.length ? `  空档 ${r.gaps.map((g) => `${g.from}-${g.to}(${g.width}px)`).join(', ')}` : ''),
    )
  })
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

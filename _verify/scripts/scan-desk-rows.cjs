/**
 * 逐行扫描桌面素材，打印每行不透明像素的跨度，
 * 用于判断「台面表面」与「桌腿」的分界在哪一行。
 * 用法: node _verify/scripts/scan-desk-rows.cjs <cdpPort> <base> [file]
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const FILE = process.argv[4] || 'desk-1.png'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const JS = `(async () => {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('load fail'));
    i.src = '${BASE}/images/props/desks/${FILE}?t=' + Date.now();
  });
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let count = 0, left = W, right = -1;
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 24) {
        count++;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    rows.push({ y, count, span: right < 0 ? 0 : right - left + 1, left, right });
  }
  const contentTop = rows.find(r => r.count > 0)?.y ?? 0;
  const contentBottom = [...rows].reverse().find(r => r.count > 0)?.y ?? H - 1;
  // 只返回内容范围内的采样行
  const sample = rows.filter(r => r.y >= contentTop && r.y <= contentBottom && r.y % 8 === 0)
    .map(r => ({ y: r.y, span: r.span, pctOfH: +(r.y / H * 100).toFixed(1) }));
  return { file: '${FILE}', size: [W, H], contentTop, contentBottom, sample };
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
      setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); reject(new Error('timeout ' + method)) } }, 120000)
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
  console.log(`${out.file}  ${out.size.join('x')}  内容 y ${out.contentTop}..${out.contentBottom}\n`)
  console.log('  y     占高%   跨度')
  out.sample.forEach((r) => console.log(`  ${String(r.y).padStart(4)}  ${String(r.pctOfH).padStart(5)}%  ${r.span}`))
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

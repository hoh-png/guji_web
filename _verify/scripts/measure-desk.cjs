/**
 * 量桌面素材里「台面」的位置（好把文物摆在桌面上）。
 *
 * 做法：逐行统计不透明像素的横向跨度。
 * 桌面（桌板）那一行跨度最宽，桌腿处会明显收窄 —— 跨度骤降的那一行就是台面前沿。
 *
 * 用法: node _verify/scripts/measure-desk.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const JS = `(async () => {
  const out = [];
  for (const f of ['desk-1.png', 'desk-2.png', 'desk-3.png']) {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('load fail ' + f));
      i.src = '${BASE}/images/props/desks/' + f + '?t=' + Date.now();
    });
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H).data;

    // 逐行统计不透明像素数量与左右边界
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
      rows.push({ y, count, left, right, span: right < 0 ? 0 : right - left + 1 });
    }

    // 内容整体范围
    const contentTop = rows.find(r => r.count > 0)?.y ?? 0;
    const contentBottom = [...rows].reverse().find(r => r.count > 0)?.y ?? H - 1;
    const maxSpan = Math.max(...rows.map(r => r.span));
    // 跨度骤降处 = 台面前沿（桌腿开始）
    let edgeY = null;
    for (let i = contentTop; i <= contentBottom; i++) {
      if (rows[i].span >= maxSpan * 0.9 && rows[i + 3] && rows[i + 3].span < maxSpan * 0.75) {
        edgeY = rows[i + 3].y;
        break;
      }
    }
    out.push({
      file: f, size: [W, H],
      contentTop, contentBottom, maxSpan,
      edgeY,
      edgePct: edgeY === null ? null : +((edgeY / H) * 100).toFixed(1),
      centerXPct: 50,
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
  console.log(JSON.stringify(out, null, 2))
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

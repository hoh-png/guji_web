/**
 * 量左下角文物详情卡的实际盒模型，确认内边距与宽度生效。
 * 用法: node _verify/scripts/check-relic-card.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
      setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); reject(new Error('timeout ' + method)) } }, 60000)
    })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Page.navigate', { url: `${BASE}/pages/challenge.html?t=${Date.now()}` })
  await sleep(3500)

  const info = await evaluate(`(() => {
    const c = document.querySelector('.challenge-relic-card');
    if (!c) return { present: false };
    const cs = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    const meta = c.querySelector('.relic-meta');
    const mr = meta ? meta.getBoundingClientRect() : null;
    const h2 = c.querySelector('h2');
    const hr = h2 ? h2.getBoundingClientRect() : null;
    return {
      /* 屏幕像素（画布有整体缩放，需换算） */
      boxOnScreen: [Math.round(r.width), Math.round(r.height)],
      /* 场景坐标（未缩放） */
      boxInScene: [Math.round(r.width / 0.563), Math.round(r.height / 0.563)],
      cssWidth: cs.width,
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
      border: cs.borderTopWidth,
      metaBoxInScene: mr ? [Math.round(mr.width / 0.563), Math.round(mr.height / 0.563)] : null,
      h2BoxInScene: hr ? [Math.round(hr.width / 0.563), Math.round(hr.height / 0.563)] : null,
      metaGapFromCardEdge: mr ? Math.round((mr.left - r.left) / 0.563) : null,
      parentClass: c.parentElement?.className,
    };
  })()`)

  console.log(JSON.stringify(info, null, 2))
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

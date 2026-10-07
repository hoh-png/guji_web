/**
 * 打印文物的定位上下文（计算值、父链、偏移父），用于排查定位偏差。
 * 用法: node _verify/scripts/debug-artifact.cjs <cdpPort> <base>
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
  await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
  await sleep(3600)

  const info = await evaluate(`(() => {
    const art = document.querySelector('.artifact-slot');
    const desk = document.querySelector('.stage-desk');
    const stage = document.querySelector('.workshop-stage');
    const chain = [];
    let el = art;
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      chain.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 40),
        position: cs.position,
        top: cs.top,
        left: cs.left,
        transform: cs.transform,
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      });
      el = el.offsetParent || el.parentElement;
    }
    const cs = getComputedStyle(art);
    return {
      viewport: [window.innerWidth, window.innerHeight],
      artComputed: { position: cs.position, top: cs.top, left: cs.left, transform: cs.transform, width: cs.width },
      stageHeight: stage ? stage.getBoundingClientRect().height : null,
      deskBox: desk ? (() => { const r = desk.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() : null,
      offsetParentChain: chain,
    };
  })()`)

  console.log(JSON.stringify(info, null, 2))
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

/**
 * 赏藏品页截图 + 视频几何信息。
 * 用法: node _verify/scripts/shot-gallery.cjs <cdpPort> <base>
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
  await send('Page.navigate', { url: `${BASE}/pages/gallery.html?t=${Date.now()}` })
  await sleep(3500)

  const info = await evaluate(`(() => {
    const v = document.querySelector('.gallery-video');
    if (!v) return { present: false };
    const r = v.getBoundingClientRect();
    const cs = getComputedStyle(v);
    return {
      viewport: [window.innerWidth, window.innerHeight],
      videoRatio: +(v.videoWidth / v.videoHeight).toFixed(3),
      viewportRatio: +(window.innerWidth / window.innerHeight).toFixed(3),
      box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      objectFit: cs.objectFit,
      hasControls: v.controls,
      muted: v.muted,
      loop: v.loop,
      paused: v.paused,
      currentTime: +v.currentTime.toFixed(2),
    };
  })()`)
  console.log(JSON.stringify(info, null, 2))

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'gallery-now.png'), Buffer.from(shot.data, 'base64'))
  console.log('截图: _verify/gallery-now.png')
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

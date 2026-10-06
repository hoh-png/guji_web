/**
 * 量工坊页上文物、名称牌、提示的渲染尺寸与位置。
 * 用法: node _verify/scripts/check-workshop-size.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://localhost:5173'
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
  await sleep(4000)

  const info = await evaluate(`(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
    const art = q('.artifact-slot');
    const img = q('.artifact-image');
    const desk = q('.stage-desk');
    const cs = art ? getComputedStyle(art) : null;
    return {
      href: location.href,
      viewport: [window.innerWidth, window.innerHeight],
      artCss: cs ? { width: cs.width, transform: cs.transform, origin: cs.transformOrigin } : null,
      artBox: box(art),
      imgBox: box(img),
      imgNatural: img ? [img.naturalWidth, img.naturalHeight] : null,
      deskBox: box(desk),
      metaBox: box(q('.artifact-meta')),
      hintBox: box(q('.step-hint')),
      hintText: q('.step-hint') ? q('.step-hint').textContent.trim() : null,
    };
  })()`)

  console.log(JSON.stringify(info, null, 2))

  if (info.deskBox) {
    const k = info.deskBox.w / 1100
    const tableY = info.deskBox.y + 408.5 * k
    const floorY = info.deskBox.y + 648 * k
    console.log(`\n台面 y ≈ ${tableY.toFixed(0)}   桌腿落地 y ≈ ${floorY.toFixed(0)}`)
    if (info.imgBox) {
      console.log(`文物渲染 ${info.imgBox.w}×${info.imgBox.h}，底边 ${info.imgBox.bottom}（与台面差 ${(info.imgBox.bottom - tableY).toFixed(0)}px）`)
      console.log(`文物底边中点 x = ${info.imgBox.x + info.imgBox.w / 2}`)
    }
    if (info.metaBox) console.log(`名称牌/进度 y=${info.metaBox.y}..${info.metaBox.bottom} ${info.metaBox.y > floorY ? '（已在桌下）' : '（仍在桌上或桌面区）'}`)
    if (info.hintBox) console.log(`提示条 y=${info.hintBox.y}..${info.hintBox.bottom} ${info.hintBox.y > floorY ? '（已在桌下）' : '（仍在桌上或桌面区）'}`)
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'workshop-live.png'), Buffer.from(shot.data, 'base64'))
  console.log('\n截图: _verify/workshop-live.png')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

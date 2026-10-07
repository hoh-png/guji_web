/**
 * 量文物、桌子、提示三者的位置关系（确认提示在桌子下方空地上）。
 * 用法: node _verify/scripts/measure-workshop.cjs <cdpPort> <base>
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
    const q = (s) => document.querySelector(s);
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1), right: +r.right.toFixed(1) }; };
    const desk = q('.stage-desk');
    const img = q('.artifact-image');
    const hint = q('.step-hint');
    const meta = q('.artifact-meta');
    const art = q('.artifact-slot');
    const deskBox = box(desk);
    const scale = deskBox ? deskBox.w / 1100 : 1;
    return {
      viewport: [window.innerWidth, window.innerHeight],
      desk: deskBox,
      deskContentBottomY: deskBox ? +(deskBox.y + 648 * scale).toFixed(1) : null,
      artInnerWidthScaled: art ? getComputedStyle(art).width : null,
      artTransform: art ? getComputedStyle(art).transform : null,
      img: box(img),
      imgNatural: img ? [img.naturalWidth, img.naturalHeight] : null,
      meta: box(meta),
      hint: box(hint),
      hintText: hint ? hint.textContent.trim() : null,
    };
  })()`)

  console.log(JSON.stringify(info, null, 2))

  if (info.img && info.imgNatural) {
    const ratio = info.img.w / info.imgNatural[0]
    console.log(`\n文物显示尺寸 ${info.img.w} × ${info.img.h}（基准 447 宽 → 实际缩放 ${(info.img.w / 447).toFixed(3)}）`)
    console.log(`文物底边 y = ${info.img.bottom}   台面 y = ${info.deskContentBottomY ?? '—'}`)
  }
  if (info.hint && info.desk) {
    const deskBottom = info.desk.bottom
    console.log(`\n提示条 [y=${info.hint.y} bottom=${info.hint.bottom}]`)
    console.log(`桌子显示区底边 y = ${deskBottom}`)
    console.log(`提示在桌子下方: ${info.hint.y > deskBottom ? '是' : '否（与桌子重叠）'}`)
    console.log(`提示距视口底部 ${(info.viewport[1] - info.hint.bottom).toFixed(0)}px`)
  }
  if (info.meta && info.img) {
    console.log(`\n名称牌/进度点: [x=${info.meta.x} y=${info.meta.y} w=${info.meta.w} h=${info.meta.h}]`)
    console.log(`  是否与桌子中段重叠: ${info.meta.y > info.desk.y && info.meta.y < info.desk.bottom ? '是' : '否'}`)
  }

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

/**
 * 把桌面素材的「可见内容范围」换算成页面像素。
 * 桌面图有大量透明留白，元素坐标不能按图片外框算。
 *
 * 用法: node _verify/scripts/measure-desk-onscreen.cjs <cdpPort> <base>
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
      setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); reject(new Error('timeout ' + method)) } }, 120000)
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

  const out = await evaluate(`(() => {
    const desk = document.querySelector('.stage-desk');
    const r = desk.getBoundingClientRect();
    /* 桌图内容范围（scan-desk-rows.cjs 量得 desk-1.png：y 316..648，台面 408.5，水平内容 865 居中） */
    const CONTENT = { top: 316, bottom: 648, tableSurface: 408.5, imgW: 1100, imgH: 825, contentW: 865 };
    const k = r.width / CONTENT.imgW;
    return {
      deskBox: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)],
      scale: +k.toFixed(4),
      /* 页面像素 */
      contentTopY: +(r.y + CONTENT.top * k).toFixed(1),
      contentBottomY: +(r.y + CONTENT.bottom * k).toFixed(1),
      tableSurfaceY: +(r.y + CONTENT.tableSurface * k).toFixed(1),
      tableLeftX: +(r.x + (CONTENT.imgW - CONTENT.contentW) / 2 * k).toFixed(1),
      tableRightX: +(r.x + (CONTENT.imgW + CONTENT.contentW) / 2 * k).toFixed(1),
      viewportH: window.innerHeight,
      /* 可见内容底边到视口底部还有多少空间 */
      gapBelowTable: +(window.innerHeight - (r.y + CONTENT.bottom * k)).toFixed(1),
    };
  })()`)

  console.log(JSON.stringify(out, null, 2))
  console.log(`\n桌子可见内容：y ${out.contentTopY} .. ${out.contentBottomY}`)
  console.log(`台面表面 y = ${out.tableSurfaceY}`)
  console.log(`桌腿下沿 y = ${out.contentBottomY}，其下到视口底部还有 ${out.gapBelowTable}px 空地`)
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

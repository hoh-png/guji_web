/**
 * 关卡页自检：底图 + 碎片逐块覆盖。
 * 用法: node _verify/scripts/check-relic-layers.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const ANSWERS = [1, 2, 0, 1, 1]
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

  const snap = () => evaluate(`(() => {
    const base = document.querySelector('.relic-base');
    const box = document.querySelector('.challenge-relic');
    const br = box.getBoundingClientRect();
    const scale = br.width / parseFloat(getComputedStyle(box).width);
    return {
      baseLoaded: !!base && base.complete && base.naturalWidth > 0,
      baseFilter: base ? getComputedStyle(base).filter : null,
      relicBox: [Math.round(br.width), Math.round(br.height)],
      pieces: Array.from(document.querySelectorAll('.relic-piece')).map((p, i) => {
        const r = p.getBoundingClientRect();
        return {
          n: i + 1,
          loaded: p.complete && p.naturalWidth > 0,
          /* 相对文物图左上角的坐标与尺寸（文物图坐标，非屏幕像素） */
          x: Math.round((r.left - br.left) / scale),
          y: Math.round((r.top - br.top) / scale),
          w: Math.round(r.width / scale),
          h: Math.round(r.height / scale),
        };
      }),
      restored: !!document.querySelector('.challenge-relic.is-restored'),
    };
  })()`)

  let s = await snap()
  console.log(`初始：底图加载=${s.baseLoaded}  滤镜=${s.baseFilter}  碎片=${s.pieces.length} 块`)
  console.log(`文物图显示尺寸 ${JSON.stringify(s.relicBox)}（文物图坐标 460×527）\n`)

  for (let n = 1; n <= 5; n += 1) {
    await evaluate(`document.querySelectorAll('.route-piece')[${n - 1}].click()`)
    await sleep(380)
    await evaluate(`document.querySelectorAll('.quiz-opt')[${ANSWERS[n - 1]}].click()`)
    await sleep(280)
    await evaluate(`document.querySelector('.quiz-panel-close')?.click()`)
    await sleep(340)
    s = await snap()
    const p = s.pieces.find((x) => x.n === n)
    console.log(
      `第 ${n} 关后：碎片 ${s.pieces.length} 块` +
        (p ? `   新增碎片${n} @(${p.x}, ${p.y}) ${p.w}×${p.h} 图OK=${p.loaded}` : '') +
        `   全部修复=${s.restored}`,
    )
  }

  console.log('\n最终各碎片位置（文物图坐标）：')
  s.pieces.forEach((p) => console.log(`  ${p.n}. (${p.x}, ${p.y})  ${p.w}×${p.h}`))

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'challenge-after.png'), Buffer.from(shot.data, 'base64'))
  console.log('\n截图: _verify/challenge-after.png  （可人工看一遍）')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

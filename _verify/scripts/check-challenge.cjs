/**
 * 关卡页自检：修复台、测验、以及「已答对碎片变亮」是否生效。
 *
 * 用法: node _verify/scripts/check-challenge.cjs <cdpPort> <base>
 *
 * 答案下标与 src/data/questions.js 保持一致，改题库时要同步这里。
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const ANSWERS = [1, 2, 0, 1, 1] // 第 1..5 关的正确选项下标
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
  await sleep(4000)

  const snap = () => evaluate(`(() => {
    const dim = document.querySelector('.relic-layer--dim');
    const lit = document.querySelector('.relic-layer--lit');
    const defs = document.querySelector('.relic-clip-defs clipPath');
    const rects = defs ? Array.from(defs.querySelectorAll('rect')) : [];
    const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
    return {
      dimFilter: dim ? getComputedStyle(dim).filter : null,
      dimBox: box(dim),
      litPresent: !!lit,
      litClip: lit ? getComputedStyle(lit).clipPath : null,
      litBox: box(lit),
      sameSize: JSON.stringify(box(dim)) === JSON.stringify(box(lit)),
      clipIdFound: !!(defs && defs.id && lit && (lit.style.clipPath || '').includes(defs.id)),
      litRects: rects.map(r => [ +r.getAttribute('x'), +r.getAttribute('y'), +r.getAttribute('width'), +r.getAttribute('height') ]),
      labels: Array.from(document.querySelectorAll('.route-piece-index')).map(e => e.textContent),
      restored: !!document.querySelector('.challenge-relic.is-restored'),
    };
  })()`)

  console.log('=== 初始（未修复）===')
  let s = await snap()
  console.log(`  底图滤镜 ${s.dimFilter}   尺寸 ${JSON.stringify(s.dimBox)}`)
  console.log(`  亮层存在=${s.litPresent}  亮区=${s.litRects.length} 块  编号 ${JSON.stringify(s.labels)}`)

  console.log('\n=== 逐关答对 ===')
  for (let n = 1; n <= 5; n += 1) {
    await evaluate(`document.querySelectorAll('.route-piece')[${n - 1}].click()`)
    await sleep(420)
    await evaluate(`document.querySelectorAll('.quiz-opt')[${ANSWERS[n - 1]}].click()`)
    await sleep(320)
    const correct = await evaluate(`(() => {
      const opts = Array.from(document.querySelectorAll('.quiz-opt'));
      const idx = opts.findIndex(o => o.classList.contains('correct'));
      return idx;
    })()`)
    await evaluate(`document.querySelector('.quiz-panel-close')?.click()`)
    await sleep(380)
    s = await snap()
    console.log(
      `  第 ${n} 关（选中下标 ${ANSWERS[n - 1]}，判定正确项 ${correct}）-> 亮区 ${s.litRects.length} 块  ` +
        `编号 ${JSON.stringify(s.labels)}  全部修复=${s.restored}`,
    )
  }

  console.log('\n=== 亮区矩形（相对文物图的百分比）===')
  s.litRects.forEach((r, i) => {
    console.log(
      `  ${i + 1}. x=${(r[0] * 100).toFixed(1)}%  y=${(r[1] * 100).toFixed(1)}%  ` +
        `w=${(r[2] * 100).toFixed(1)}%  h=${(r[3] * 100).toFixed(1)}%`,
    )
  })
  console.log(`  亮层/底图尺寸一致: ${s.sameSize}    clipPath 指向的 id 存在: ${s.clipIdFound}`)
  console.log(`  亮层 clip-path: ${s.litClip}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(__dirname, '..', 'challenge-after.png'), Buffer.from(shot.data, 'base64'))
  console.log('\n截图: _verify/challenge-after.png')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

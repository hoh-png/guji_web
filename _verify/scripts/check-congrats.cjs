/**
 * 验证：最后一关答对后，题目弹窗先收起，祝贺弹窗再出现，两者不叠加。
 * 用法: node _verify/scripts/check-congrats.cjs <cdpPort> <base>
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

  for (let n = 1; n <= 4; n += 1) {
    await evaluate(`document.querySelectorAll('.route-piece')[${n - 1}].click()`)
    await sleep(320)
    await evaluate(`document.querySelectorAll('.quiz-opt')[${ANSWERS[n - 1]}].click()`)
    await sleep(240)
    await evaluate(`document.querySelector('.quiz-panel-close')?.click()`)
    await sleep(280)
  }
  console.log('前四关已完成\n')

  // 第 5 关：答对后不再手动关闭
  await evaluate(`document.querySelectorAll('.route-piece')[4].click()`)
  await sleep(320)
  await evaluate(`document.querySelectorAll('.quiz-opt')[${ANSWERS[4]}].click()`)

  /* 状态：题目弹窗（含选项）与祝贺弹窗分别是否存在 */
  const state = () => evaluate(`(() => ({
    question: !!document.querySelector('.quiz-opt'),
    congrats: !!document.querySelector('.congrats-panel'),
    overlays: document.querySelectorAll('.quiz-overlay').length,
  }))()`)

  const t0 = Date.now()
  console.log('时刻(ms)   题目弹窗  祝贺弹窗  遮罩层数')
  let bothAtOnce = false
  for (let i = 0; i < 45; i += 1) {
    const s = await state()
    const t = Date.now() - t0
    if (i % 4 === 0 || (s.congrats && !s.question) || (s.question && s.congrats)) {
      console.log(`  ${String(t).padStart(5)}      ${s.question ? '有' : '无'}        ${s.congrats ? '有' : '无'}       ${s.overlays}`)
    }
    if (s.question && s.congrats) bothAtOnce = true
    await sleep(100)
  }

  console.log(`\n两者同时存在过: ${bothAtOnce ? '是 ← 有问题' : '否 ✓'}`)
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

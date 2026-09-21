/**
 * 验证关卡再点开的行为：
 *   已答对 -> 只出解析（无选项、无按钮）
 *   答错   -> 重新出题，且不给解析
 * 用法: node _verify/scripts/check-answer-review.cjs <cdpPort> <base>
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

  const snap = () => evaluate(`(() => ({
    q: document.querySelector('.quiz-q')?.textContent?.slice(0, 22) || null,
    optCount: document.querySelectorAll('.quiz-opt').length,
    staticOpt: document.querySelectorAll('.quiz-opt--static').length,
    why: document.querySelector('.quiz-why')?.textContent?.trim() || null,
    nextBtn: document.querySelector('.quiz-next')?.textContent?.trim() || null,
    labels: Array.from(document.querySelectorAll('.route-piece-index')).map(e => e.textContent).join(''),
  }))()`)

  const openAndAnswer = async (n, optIndex) => {
    await evaluate(`document.querySelectorAll('.route-piece')[${n - 1}].click()`)
    await sleep(350)
    if (optIndex !== null) {
      await evaluate(`document.querySelectorAll('.quiz-opt')[${optIndex}].click()`)
      await sleep(300)
    }
  }

  // 第 1 关答错（正确答案是 1，故意选 0）
  console.log('=== 第 1 关：答错 ===')
  await openAndAnswer(1, 0)
  let s = await snap()
  console.log(`  答错后：解析=${s.why}   按钮=${s.nextBtn}`)
  console.log(`  解析是否会泄露答案文字: ${s.why && s.why.length > 20 ? '是 ← 有问题' : '否 ✓'}`)
  await evaluate(`document.querySelector('.quiz-panel-close')?.click()`)
  await sleep(300)

  console.log('\n=== 第 1 关：重新点开（答错后） ===')
  await openAndAnswer(1, null)
  s = await snap()
  console.log(`  题干=${s.q}…`)
  console.log(`  选项 ${s.optCount} 个（应为 4 = 重新出题）   解析=${s.why}   编号 ${s.labels}`)
  await evaluate(`document.querySelector('.quiz-panel-close')?.click()`)
  await sleep(300)

  // 第 2 关答对（正确答案是 2）
  console.log('\n=== 第 2 关：答对 ===')
  await openAndAnswer(2, 2)
  s = await snap()
  console.log(`  答对后：解析=${s.why}   按钮=${s.nextBtn}   编号 ${s.labels}`)
  await sleep(2200) // 等自动收起
  await evaluate(`document.querySelector('.quiz-panel-close')?.click()`)
  await sleep(300)

  console.log('\n=== 第 2 关：再点开（已答对） ===')
  await openAndAnswer(2, null)
  s = await snap()
  console.log(`  题干=${s.q}…`)
  console.log(`  选项 ${s.optCount} 个（应为 1 = 静态正确项）  静态项 ${s.staticOpt} 个`)
  console.log(`  解析="${s.why?.slice(0, 26)}…"   按钮=${s.nextBtn}`)

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

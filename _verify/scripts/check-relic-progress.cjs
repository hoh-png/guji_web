/**
 * 验证「文物来自商店 + 进度按文物保存」：
 *   1. 未设文物时工坊显示提示
 *   2. 设为使用后摆出该文物，从出土状态开始
 *   3. 推进几步后切换到另一件文物，再切回来 —— 进度应保持
 *
 * 用法: node _verify/scripts/check-relic-progress.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STEP_TOOLS = ['hammer', 'heat-gun', 'tweezers', 'dropper', 'scalpel', 'needle-awl', 'soldering-iron']

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
  const mouse = async (type, x, y) =>
    send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })

  // 先进入同源页面才能写 localStorage
  await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
  await sleep(3000)

  const KEY = 'guji-web:player-state:v1'
  const seed = `(() => {
    const s = JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) || '{}');
    s.ingot = 50;
    /* 拥有三件文物，其中一件已接入图（hubei-3），另两件仅用于验证切换 */
    s.ownedRelicIds = ['hubei-1', 'hubei-3', 'other-1'];
    s.equippedRelicId = 'hubei-3';
    s.relicProgress = {};
    localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify(s));
    return 'ok';
  })()`
  await evaluate(seed)
  await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
  await sleep(3600)

  const snap = () => evaluate(`(() => ({
    src: (document.querySelector('.artifact-image')?.getAttribute('src') || '').split('/').pop() || null,
    doneDots: document.querySelectorAll('.step-dot.is-done').length,
    caption: document.querySelector('.step-hint')?.textContent.replace(/\\s+/g, ' ').trim() || null,
    switcher: Array.from(document.querySelectorAll('.relic-switch-item')).map(b => b.textContent + (b.classList.contains('on') ? '(使用中)' : '')),
    saved: (() => { const s = JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) || '{}'); return { equipped: s.equippedRelicId, progress: s.relicProgress }; })(),
  }))()`)

  console.log('设为使用 hubei-3 后:')
  let s = await snap()
  console.log('  ' + JSON.stringify(s, null, 2).replace(/\n/g, '\n  '))

  const dragToolToArtifact = async (toolGroup) => {
    const pos = await evaluate(`(() => {
      const sprite = Array.from(document.querySelectorAll('.tool-sprite')).find(s => (s.dataset.toolId || '').startsWith(${JSON.stringify(toolGroup)}));
      const art = document.querySelector('.artifact-slot');
      if (!sprite || !art) return null;
      const a = sprite.querySelector('.tool-image').getBoundingClientRect();
      const b = art.getBoundingClientRect();
      return { from: [a.x + a.width / 2, a.y + a.height / 2], to: [b.x + b.width / 2, b.y + b.height / 2] };
    })()`)
    if (!pos) throw new Error('找不到工具或文物: ' + toolGroup)
    await mouse('mousePressed', pos.from[0], pos.from[1])
    await sleep(60)
    await mouse('mouseMoved', pos.to[0], pos.to[1])
    await sleep(60)
    await mouse('mouseReleased', pos.to[0], pos.to[1])
    await sleep(420)
  }

  console.log('\n推进三步：')
  for (let i = 0; i < 3; i += 1) {
    await dragToolToArtifact(STEP_TOOLS[i])
    s = await snap()
    console.log(`  ${STEP_TOOLS[i].padEnd(12)} -> 图=${(s.src || '—').padEnd(16)} 已完成=${s.doneDots}  存档进度=${JSON.stringify(s.saved.progress)}`)
  }

  console.log('\n切换到 other-1（另一件文物）：')
  await evaluate(`Array.from(document.querySelectorAll('.relic-switch-item')).find(b => b.textContent.includes('彩陶盆'))?.click()`)
  await sleep(900)
  s = await snap()
  console.log(`  图=${s.src}  已完成=${s.doneDots}  存档=${JSON.stringify(s.saved)}`)
  console.log(`  切换器: ${JSON.stringify(s.switcher)}`)

  console.log('\n切回 hubei-3：')
  await evaluate(`Array.from(document.querySelectorAll('.relic-switch-item')).find(b => b.textContent.includes('青铜盖豆'))?.click()`)
  await sleep(900)
  s = await snap()
  console.log(`  图=${s.src}  已完成=${s.doneDots}（应为 3）`)
  console.log(`  信息带: ${s.caption}`)
  console.log(`  存档: ${JSON.stringify(s.saved)}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'workshop-progress.png'), Buffer.from(shot.data, 'base64'))
  console.log('\n截图: _verify/workshop-progress.png')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

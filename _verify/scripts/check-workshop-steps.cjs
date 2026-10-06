/**
 * 检查修复工坊：文物图渲染 + 按顺序用对工具推进七道工序。
 *
 * 拖动用 CDP 的真实鼠标事件模拟：在工具图上按下、移到文物上、松手。
 *
 * 用法: node _verify/scripts/check-workshop-steps.cjs <cdpPort> <base>
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 七道工序要求的工具（与 src/data/restoration.js 一致） */
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
  const mouse = async (type, x, y, extra = {}) =>
    send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
  await sleep(3600)

  const initial = await evaluate(`(() => {
    const img = document.querySelector('.artifact-image');
    const slot = document.querySelector('.artifact-slot');
    const dots = document.querySelectorAll('.step-dot');
    return {
      artifactPresent: !!img,
      imgLoaded: !!img && img.complete && img.naturalWidth > 0,
      src: img ? img.getAttribute('src').split('/').pop() : null,
      slotBox: slot ? (() => { const r = slot.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() : null,
      dots: dots.length,
      doneDots: document.querySelectorAll('.step-dot.is-done').length,
      caption: document.querySelector('.artifact-caption')?.textContent.replace(/\\s+/g, ' ').trim(),
      hint: document.querySelector('.artifact-hint')?.textContent.trim(),
      tools: Array.from(document.querySelectorAll('.tool-sprite')).map(s => s.dataset.toolId),
    };
  })()`)
  console.log('初始: ' + JSON.stringify(initial, null, 2))

  const snap = () => evaluate(`(() => ({
    src: document.querySelector('.artifact-image')?.getAttribute('src').split('/').pop(),
    doneDots: document.querySelectorAll('.step-dot.is-done').length,
    nextDot: document.querySelector('.step-dot.is-next') ? Array.from(document.querySelectorAll('.step-dot')).indexOf(document.querySelector('.step-dot.is-next')) + 1 : null,
    caption: document.querySelector('.artifact-caption')?.textContent.replace(/\\s+/g, ' ').trim(),
    toast: document.querySelector('.toast.show')?.textContent.trim() || null,
  }))()`)

  /** 把某个工具拖到文物中心松手 */
  const dragToolToArtifact = async (toolGroup) => {
    const pos = await evaluate(`(() => {
      const sprite = Array.from(document.querySelectorAll('.tool-sprite')).find(s => (s.dataset.toolId || '').startsWith(${JSON.stringify(toolGroup)}));
      const art = document.querySelector('.artifact-slot');
      if (!sprite || !art) return null;
      const img = sprite.querySelector('.tool-image');
      const a = img.getBoundingClientRect();
      const b = art.getBoundingClientRect();
      return { from: [a.x + a.width / 2, a.y + a.height / 2], to: [b.x + b.width / 2, b.y + b.height / 2] };
    })()`)
    if (!pos) throw new Error('找不到工具或文物: ' + toolGroup)
    await mouse('mousePressed', pos.from[0], pos.from[1])
    await sleep(60)
    await mouse('mouseMoved', (pos.from[0] + pos.to[0]) / 2, (pos.from[1] + pos.to[1]) / 2)
    await sleep(60)
    await mouse('mouseMoved', pos.to[0], pos.to[1])
    await sleep(60)
    await mouse('mouseReleased', pos.to[0], pos.to[1])
    await sleep(420)
  }

  console.log('\n=== 先用错工具（热风枪打第 1 步） ===')
  await dragToolToArtifact('heat-gun')
  let s = await snap()
  console.log(`  图=${s.src}  已完成=${s.doneDots}  提示=${s.toast}`)

  console.log('\n=== 按顺序用对七件工具 ===')
  for (let i = 0; i < STEP_TOOLS.length; i += 1) {
    await dragToolToArtifact(STEP_TOOLS[i])
    s = await snap()
    console.log(
      `  第 ${i + 1} 步（${STEP_TOOLS[i].padEnd(15)}）-> 图=${(s.src || '').padEnd(22)} 已完成=${s.doneDots}  下一步点=${s.nextDot}  提示=${s.toast}`,
    )
  }

  const final = await evaluate(`(() => ({
    hint: document.querySelector('.artifact-hint')?.textContent.trim(),
    caption: document.querySelector('.artifact-caption')?.textContent.replace(/\\s+/g, ' ').trim(),
    doneDots: document.querySelectorAll('.step-dot.is-done').length,
    nextDot: !!document.querySelector('.step-dot.is-next'),
  }))()`)
  console.log('\n最终: ' + JSON.stringify(final, null, 2))

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(__dirname, '..', 'workshop-steps.png'), Buffer.from(shot.data, 'base64'))
  console.log('\n截图: _verify/workshop-steps.png')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

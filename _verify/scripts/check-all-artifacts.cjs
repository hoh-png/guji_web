/**
 * 验证 14 件文物全部可玩：逐件设为使用、跑完七步、检查图与存档。
 * 用法: node _verify/scripts/check-all-artifacts.cjs <cdpPort> <base>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const IDS = [
  'hubei-1', 'hubei-2', 'hubei-3', 'hubei-4', 'hubei-5', 'hubei-6', 'hubei-7',
  'other-1', 'other-2', 'other-3', 'other-4', 'other-5', 'other-6', 'other-7',
]
const STEP_TOOLS = ['hammer', 'heat-gun', 'tweezers', 'dropper', 'scalpel', 'needle-awl', 'soldering-iron']
const KEY = 'guji-web:player-state:v1'

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
  await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
  await sleep(3000)

  /* 一次给足元宝并拥有全部 14 件 */
  await evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) || '{}');
    s.ingot = 999;
    s.ownedRelicIds = ${JSON.stringify(IDS)};
    s.equippedRelicId = ${JSON.stringify(IDS[0])};
    s.relicProgress = {};
    localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify(s));
    return 'ok';
  })()`)
  await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
  await sleep(3600)

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
    await sleep(50)
    await mouse('mouseMoved', pos.to[0], pos.to[1])
    await sleep(50)
    await mouse('mouseReleased', pos.to[0], pos.to[1])
    await sleep(300)
  }

  const equip = async (relicId) => {
    await evaluate(`(() => {
      const s = JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) || '{}');
      s.equippedRelicId = ${JSON.stringify(relicId)};
      localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify(s));
      return 'ok';
    })()`)
  }

  console.log('逐件验证（每件跑完七步）：\n')
  let allOk = true

  for (const relicId of IDS) {
    await equip(relicId)
    await send('Page.navigate', { url: `${BASE}/pages/workshop.html?t=${Date.now()}` })
    await sleep(2600)

    const first = await evaluate(`(() => ({
      src: (document.querySelector('.artifact-image')?.getAttribute('src') || '').split('/').pop() || null,
      loaded: (() => { const i = document.querySelector('.artifact-image'); return !!i && i.complete && i.naturalWidth > 0; })(),
      name: document.querySelector('.artifact-name')?.textContent || null,
      dots: document.querySelectorAll('.step-dot').length,
    }))()`)

    let ok = first.loaded && first.src === `${relicId}-1.webp` && first.dots === 7

    for (const tool of STEP_TOOLS) {
      await dragToolToArtifact(tool)
    }
    await sleep(400)

    const last = await evaluate(`(() => {
      const img = document.querySelector('.artifact-image');
      return {
        src: (img?.getAttribute('src') || '').split('/').pop() || null,
        loaded: !!img && img.complete && img.naturalWidth > 0,
        doneDots: document.querySelectorAll('.step-dot.is-done').length,
        saved: JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) || '{}').relicProgress,
      };
    })()`)

    const stepOk = last.doneDots === 7 && last.src === `${relicId}-8.webp` && last.loaded
    if (!ok || !stepOk) allOk = false

    console.log(
      `  ${relicId.padEnd(9)} ${String(first.name || '—').padEnd(10)} ` +
        `首图=${(first.src || '—').padEnd(16)}${first.loaded ? '✓' : '✗'}  ` +
        `末图=${(last.src || '—').padEnd(16)}${last.loaded ? '✓' : '✗'}  ` +
        `进度=${last.doneDots}/7  存档=${JSON.stringify(last.saved?.[relicId])}`,
    )
  }

  console.log(allOk ? '\n全部 14 件通过 ✓' : '\n有未通过项，见上')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

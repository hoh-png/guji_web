/**
 * 快速体检：打开某页，报告是否有渲染、有无报错、关键元素是否在。
 * 用法: node _verify/scripts/page-health.cjs <cdpPort> <url>
 */
const PORT = process.argv[2]
const URL_TO_OPEN = process.argv[3] || 'http://localhost:5173/pages/workshop.html'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const logs = []
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(m.error.message)) : resolve(m.result)
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      logs.push(`[console.${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    } else if (m.method === 'Runtime.exceptionThrown') {
      logs.push('[exception] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 400))
    } else if (m.method === 'Log.entryAdded') {
      logs.push(`[log.${m.params.entry.level}] ` + String(m.params.entry.text).slice(0, 300))
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
    if (r.exceptionDetails) return { __evalError: r.exceptionDetails.exception?.description || r.exceptionDetails.text }
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Page.navigate', { url: URL_TO_OPEN })
  await sleep(4500)

  const info = await evaluate(`(() => {
    const root = document.getElementById('root');
    return {
      href: location.href,
      title: document.title,
      rootChildren: root ? root.children.length : null,
      bodyText: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 220),
      hasWorkshop: !!document.querySelector('.workshop'),
      artifactSlot: !!document.querySelector('.artifact-slot'),
      artifactImg: !!document.querySelector('.artifact-image'),
      toolSprites: document.querySelectorAll('.tool-sprite').length,
      stepHint: !!document.querySelector('.step-hint'),
      switcher: document.querySelectorAll('.relic-switch-item').length,
      saved: JSON.parse(localStorage.getItem('guji-web:player-state:v1') || '{}'),
    };
  })()`)

  console.log(JSON.stringify(info, null, 2))
  if (logs.length) {
    console.log('\n=== 控制台 / 异常 ===')
    logs.slice(0, 15).forEach((l) => console.log('  ' + l))
  } else {
    console.log('\n（无控制台错误）')
  }
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

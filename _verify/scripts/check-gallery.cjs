/**
 * 检查赏藏品页：导航栏有「赏藏品」按钮，点击后进入整屏视频页且视频可播放。
 * 用法: node _verify/scripts/check-gallery.cjs <cdpPort> <base>
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

  const nav = await evaluate(`(() => {
    const links = Array.from(document.querySelectorAll('.workshop-actions a'));
    return { labels: links.map(a => a.textContent.trim()), hrefs: links.map(a => a.getAttribute('href')) };
  })()`)
  console.log('工坊导航栏: ' + JSON.stringify(nav))

  /* 点「赏藏品」 */
  const clicked = await evaluate(`(() => {
    const a = Array.from(document.querySelectorAll('.workshop-actions a')).find(x => x.textContent.trim() === '赏藏品');
    if (!a) return false;
    a.click();
    return true;
  })()`)
  console.log(`点击「赏藏品」: ${clicked}`)
  await sleep(3000)

  const gallery = await evaluate(`(() => {
    const v = document.querySelector('.gallery-video');
    const r = v ? v.getBoundingClientRect() : null;
    return {
      href: location.href,
      hasVideo: !!v,
      src: v ? v.getAttribute('src') : null,
      readyState: v ? v.readyState : null,
      duration: v ? +v.duration.toFixed(2) : null,
      videoWidth: v ? v.videoWidth : null,
      videoHeight: v ? v.videoHeight : null,
      paused: v ? v.paused : null,
      loop: v ? v.loop : null,
      autoplay: v ? v.autoplay : null,
      box: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
      viewport: [window.innerWidth, window.innerHeight],
      fillsScreen: r ? (Math.abs(r.width - window.innerWidth) < 2 && Math.abs(r.height - window.innerHeight) < 2) : null,
      extraText: document.body.innerText.replace(/\\s+/g, ' ').trim().slice(0, 120),
    };
  })()`)
  console.log('\n赏藏品页: ' + JSON.stringify(gallery, null, 2))

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'gallery.png'), Buffer.from(shot.data, 'base64'))
  console.log('\n截图: _verify/gallery.png')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

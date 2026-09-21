/**
 * 检查智慧科普：左栏目录 + 右栏滚动正文，点目录跳转。
 * 用法: node _verify/scripts/check-science.cjs <cdpPort> <base>
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
  await send('Page.navigate', { url: `${BASE}/pages/science.html?t=${Date.now()}` })
  await sleep(3200)

  const initial = await evaluate(`(() => {
    const nav = document.querySelector('.paper-nav');
    const box = document.querySelector('.paper-content');
    const bg = document.querySelector('.paper-bg');
    return {
      bgLoaded: !!bg && bg.complete && bg.naturalWidth > 0,
      title: document.querySelector('.paper-title-bar h1')?.textContent,
      navItems: Array.from(document.querySelectorAll('.paper-nav-item')).map(e => e.textContent),
      activeItem: document.querySelector('.paper-nav-item.on')?.textContent,
      sections: Array.from(document.querySelectorAll('.paper-section h2')).map(e => e.textContent),
      contentScrollable: box ? box.scrollHeight > box.clientHeight + 2 : null,
      navScrollable: nav ? nav.scrollHeight > nav.clientHeight + 2 : null,
      hasMoreButtons: document.querySelectorAll('.science-more').length,
    };
  })()`)
  console.log('初始: ' + JSON.stringify(initial, null, 2))

  // 点最后一个目录项，验证跳转与高亮
  await evaluate(`(() => {
    const items = document.querySelectorAll('.paper-nav-item');
    items[items.length - 1].click();
  })()`)
  await sleep(1200)
  const afterJump = await evaluate(`(() => {
    const box = document.querySelector('.paper-content');
    const active = document.querySelector('.paper-nav-item.on')?.textContent;
    const secs = Array.from(document.querySelectorAll('.paper-section'));
    const last = secs[secs.length - 1];
    return {
      activeItem: active,
      scrollTop: Math.round(box.scrollTop),
      lastSectionTop: Math.round(last.offsetTop - box.offsetTop),
      atBottom: Math.abs(box.scrollTop + box.clientHeight - box.scrollHeight) < 4,
    };
  })()`)
  console.log('\n点最后一项后: ' + JSON.stringify(afterJump, null, 2))

  // 背景是否随内容滚动（应保持不动）
  const bgFixed = await evaluate(`(() => {
    const bg = document.querySelector('.paper-bg');
    const sheet = document.querySelector('.paper-sheet');
    const b = bg.getBoundingClientRect(), s = sheet.getBoundingClientRect();
    return { sameOrigin: Math.abs(b.top - s.top) < 1 && Math.abs(b.left - s.left) < 1 };
  })()`)
  console.log(`\n背景与纸面同起点（未随内容滚动）: ${bgFixed.sameOrigin}`)

  // 滚回中间，验证高亮跟随
  await evaluate(`document.querySelector('.paper-content').scrollTo({ top: 0 })`)
  await sleep(900)
  const backTop = await evaluate(`document.querySelector('.paper-nav-item.on')?.textContent`)
  console.log(`滚回顶部后高亮: ${backTop}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  require('fs').writeFileSync(require('path').join(__dirname, '..', 'science-detail.png'), Buffer.from(shot.data, 'base64'))
  console.log('截图: _verify/science-detail.png')

  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

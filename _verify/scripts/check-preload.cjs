/**
 * 验证预加载是否真的让图片「就绪」：
 *  1. 打开应用后等待预加载跑完
 *  2. 对每个图片地址新建 Image 计时；命中缓存/已解码时应为个位数毫秒
 *  3. 在 SPA 内切换路由（不刷新文档），确认工坊与商店的图瞬间就位
 * 用法: node _verify/check-preload2.cjs <cdpPort> <base> <w> <h>
 */
const fs = require('fs')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const WIDTH = Number(process.argv[4] || 1920)
const HEIGHT = Number(process.argv[5] || 1080)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

function launch(port) {
  const exe = BROWSERS.find((p) => fs.existsSync(p))
  const profile = path.join(__dirname, '..', 'ws-pl2-' + Date.now())
  fs.mkdirSync(profile, { recursive: true })
  const child = spawn(exe, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`, 'about:blank',
  ], { detached: true, stdio: 'ignore' })
  child.unref()
  return child.pid
}

async function waitTarget(port, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const p = list.find((t) => t.type === 'page')
      if (p) return p
    } catch { /* wait */ }
    await sleep(400)
  }
  throw new Error('devtools not ready')
}

async function main() {
  const pid = launch(PORT)
  const page = await waitTarget(PORT)
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

  // 从主页进入（SPA 内部跳转），等预加载跑一会儿
  await send('Page.navigate', { url: `${BASE}/index.html` })
  await sleep(6000)

  const timing = await evaluate(`(async () => {
    const urls = [
      '/images/props/venues/venue-2.jpg',
      '/images/props/venues/venue-3.jpg',
      '/images/props/desks/desk-2.png',
      '/images/props/desks/desk-3.png',
      '/images/props/tools/hammer-3.webp',
      '/images/props/tools/heat-gun-2.webp',
      '/images/shop/shop-bg.jpg',
    ];
    const out = [];
    for (const u of urls) {
      const t0 = performance.now();
      await new Promise((res) => {
        const i = new Image();
        i.onload = res;
        i.onerror = res;
        i.src = u + '?probe=1';
      });
      out.push({ url: u.split('/').pop(), ms: Math.round(performance.now() - t0) });
    }
    return out;
  })()`)
  console.log('预加载后再次请求同一地址的耗时（ms）:')
  timing.forEach((t) => console.log(`  ${t.url.padEnd(20)} ${t.ms} ms`))

  // SPA 内切到工坊（从商店的「工具」栏目点进工坊），量首屏图片是否立即就绪
  const spa = await evaluate(`(async () => {
    // 先切到商店（SPA 跳转，不刷新文档）
    const shopLink = document.querySelector('a[href="/pages/shop.html"]');
    if (shopLink) shopLink.click();
    await new Promise(r => setTimeout(r, 1500));

    // 再从商店跳到工坊
    const toWorkshop = document.querySelector('a[href="/pages/workshop.html"]');
    if (toWorkshop) toWorkshop.click();
    await new Promise(r => setTimeout(r, 1200));

    const imgs = Array.from(document.querySelectorAll('img'));
    const venue = document.querySelector('.stage-venue');
    const desk = document.querySelector('.stage-desk');
    const ready = (el) => !!el && el.complete && el.naturalWidth > 0;
    return {
      path: location.pathname,
      imgTotal: imgs.length,
      imgReady: imgs.filter(ready).length,
      busy: imgs.filter(i => !ready(i)).map(i => (i.currentSrc || i.src).split('/').pop()),
      venueReady: ready(venue),
      deskReady: ready(desk),
    };
  })()`)
  console.log('SPA 切到工坊: ' + JSON.stringify(spa))

  ws.close()
  spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

/**
 * 用浏览器实测某个视频文件能否解码（videoWidth > 0 即成功）。
 * 用法: node _verify/scripts/test-video.cjs <cdpPort> <base> <视频相对路径>
 */
const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const REL = process.argv[4] || '/media/demo.mp4'
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
  await send('Page.navigate', { url: `${BASE}/index.html?t=${Date.now()}` })
  await sleep(2500)

  const result = await evaluate(`(async () => {
    const v = document.createElement('video');
    v.muted = true;
    v.src = ${JSON.stringify(BASE + REL)} + '?t=' + Date.now();
    document.body.appendChild(v);
    v.load();

    const info = await new Promise((resolve) => {
      const done = () => resolve({
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        duration: Number.isFinite(v.duration) ? +v.duration.toFixed(2) : null,
        error: v.error ? { code: v.error.code, message: v.error.message } : null,
      });
      v.addEventListener('loadeddata', done, { once: true });
      v.addEventListener('error', done, { once: true });
      setTimeout(done, 8000);
    });

    v.remove();
    return info;
  })()`)

  const decodable = result.videoWidth > 0 && result.videoHeight > 0
  console.log(`文件: ${REL}`)
  console.log(JSON.stringify(result, null, 2))
  console.log(decodable ? '\n结论：可解码 ✓' : '\n结论：无法解码 ✗（videoWidth/Height 为 0）')
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

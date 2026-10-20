/**
 * 探测浏览器对视频编码的支持情况，以及 demo 视频能否解码。
 * 用法: node _verify/scripts/probe-video.cjs <cdpPort> <base>
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
  await send('Page.navigate', { url: `${BASE}/pages/gallery.html?t=${Date.now()}` })
  await sleep(3000)

  const info = await evaluate(`(async () => {
    const v = document.createElement('video');
    const types = {
      'H.264 mp4': 'video/mp4; codecs="avc1.42E01E"',
      'HEVC mp4': 'video/mp4; codecs="hvc1.1.6.L93.B0"',
      'VP9 webm': 'video/webm; codecs="vp9"',
      'AV1 mp4': 'video/mp4; codecs="av01.0.05M.08"',
      'generic mp4': 'video/mp4',
    };
    const canPlay = {};
    for (const [k, t] of Object.entries(types)) canPlay[k] = v.canPlayType(t) || '（空）';

    const el = document.querySelector('.gallery-video');
    const before = el ? { rs: el.readyState, w: el.videoWidth, h: el.videoHeight, paused: el.paused } : null;

    /* 尝试明确 seek 一帧并读取是否有画面 */
    let after = null;
    if (el) {
      try {
        el.currentTime = 1;
        await new Promise((r) => setTimeout(r, 800));
        after = {
          rs: el.readyState,
          w: el.videoWidth,
          h: el.videoHeight,
          currentTime: +el.currentTime.toFixed(2),
          error: el.error ? { code: el.error.code, message: el.error.message } : null,
        };
      } catch (e) {
        after = { thrown: String(e) };
      }
    }

    return { userAgent: navigator.userAgent.slice(0, 90), canPlay, before, after };
  })()`)

  console.log(JSON.stringify(info, null, 2))
  ws.close()
}

main().catch((e) => { console.error('FATAL ' + (e.stack || e)); process.exit(1) })

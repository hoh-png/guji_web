/**
 * 把知识挑战的素材裁到内容并缩到目标尺寸。
 *
 * 这批图的共同点：整幅画布 + 白底 + 主体画在某一处，后缀与实际格式也不符，
 * 因此统一做三件事：白底抠成透明 → 裁到内容边界 → 等比缩到目标尺寸，导出 PNG。
 *
 * 用法: node _verify/scripts/crop-quiz-assets.cjs <cdpPort> <base>
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const ROOT = path.resolve(__dirname, '..', '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 目标尺寸依据样例图（docs/reference/知识挑战-关卡页-样例.jpg，1750×1080）里各组件的占比：
 *   文物完整体  约占样例高 42%
 *   关卡路线    约占样例宽 43%
 *   文物碎片    约占样例宽 8~9%
 */
const JOBS = [
  { src: 'public/images/文物完整体.png', out: 'public/images/quiz/relic.png', width: 460 },
  { src: 'public/images/关卡路线.jpg', out: 'public/images/quiz/route.png', width: 750 },
  { src: 'public/images/文物碎片-1.jpg', out: 'public/images/quiz/piece-1.png', width: 220 },
  { src: 'public/images/文物碎片-2.jpg', out: 'public/images/quiz/piece-2.png', width: 220 },
  { src: 'public/images/文物碎片-3.jpg', out: 'public/images/quiz/piece-3.png', width: 220 },
  { src: 'public/images/文物碎片-4.jpg', out: 'public/images/quiz/piece-4.png', width: 220 },
  { src: 'public/images/文物碎片-5.png', out: 'public/images/quiz/piece-5.png', width: 220 },
]

/** 按真实格式判断 MIME（后缀不可信） */
function mimeOf(buf) {
  if (buf[0] === 0x89) return 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf.toString('ascii', 0, 4) === 'RIFF') return 'image/webp'
  return 'application/octet-stream'
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target on port ' + PORT)

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  await new Promise((res, rej) => {
    ws.addEventListener('open', res)
    ws.addEventListener('error', rej)
  })
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
      setTimeout(() => {
        if (pending.has(myId)) {
          pending.delete(myId)
          reject(new Error('timeout ' + method))
        }
      }, 180000)
    })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: `${BASE}/index.html` })
  await sleep(2500)

  let before = 0
  let after = 0

  for (const job of JOBS) {
    const abs = path.join(ROOT, job.src)
    if (!fs.existsSync(abs)) {
      console.log(`  跳过（不存在）: ${job.src}`)
      continue
    }
    const buf = fs.readFileSync(abs)
    before += buf.length
    const dataUrl = `data:${mimeOf(buf)};base64,${buf.toString('base64')}`

    const res = await evaluate(`(async () => {
      const img = await new Promise((res) => {
        const i = new Image();
        const to = setTimeout(() => res('TIMEOUT'), 60000);
        i.onload = () => { clearTimeout(to); res(i); };
        i.onerror = () => { clearTimeout(to); res('ERROR'); };
        i.src = ${JSON.stringify(dataUrl)};
      });
      if (img === 'TIMEOUT' || img === 'ERROR') return { ok: false, reason: img };

      const W = img.naturalWidth, H = img.naturalHeight;
      const src = document.createElement('canvas');
      src.width = W; src.height = H;
      const sctx = src.getContext('2d');
      sctx.clearRect(0, 0, W, H);
      sctx.drawImage(img, 0, 0);
      const d = sctx.getImageData(0, 0, W, H);
      const px = d.data;

      // 白底抠成透明，留过渡区避免硬边
      const NEAR = 8, FAR = 30;
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const diff = Math.max(255 - px[i], 255 - px[i+1], 255 - px[i+2]);
          let a;
          if (diff <= NEAR) a = 0;
          else if (diff < FAR) a = Math.round((255 * (diff - NEAR)) / (FAR - NEAR));
          else a = 255;
          // 与原有 alpha 取较小值（源图若本身带透明，不把它变不透明）
          px[i+3] = Math.min(px[i+3], a);
          if (px[i+3] > 8) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return { ok: false, reason: 'EMPTY' };
      sctx.putImageData(d, 0, 0);

      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const tw = Math.min(${job.width}, cw);
      const th = Math.round((ch / cw) * tw);
      const out = document.createElement('canvas');
      out.width = tw; out.height = th;
      const octx = out.getContext('2d');
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.clearRect(0, 0, tw, th);
      octx.drawImage(src, minX, minY, cw, ch, 0, 0, tw, th);
      const url = out.toDataURL('image/png');
      return {
        ok: true, outWidth: tw, outHeight: th,
        srcW: W, srcH: H,
        cropX: minX, cropY: minY, cropW: cw, cropH: ch,
        base64: url.slice(url.indexOf(',') + 1),
      };
    })()`)

    if (!res.ok) {
      console.log(`  ${path.basename(job.out)} 失败: ${res.reason}`)
      continue
    }

    const outAbs = path.join(ROOT, job.out)
    fs.mkdirSync(path.dirname(outAbs), { recursive: true })
    const outBuf = Buffer.from(res.base64, 'base64')
    fs.writeFileSync(outAbs, outBuf)
    after += outBuf.length
    console.log(
      `  ${path.basename(job.out).padEnd(12)} 原 ${res.srcW}×${res.srcH}  内容 ${res.cropW}×${res.cropH}@${res.cropX},${res.cropY}` +
        `  -> ${res.outWidth}×${res.outHeight}  ${(buf.length / 1024).toFixed(0)}KB -> ${(outBuf.length / 1024).toFixed(0)}KB`,
    )
  }

  console.log(`\n合计 ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB`)
  ws.close()
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

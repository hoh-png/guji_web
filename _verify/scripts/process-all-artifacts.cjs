/**
 * 把桌面上「修复步骤」里的 14 件文物、每件 8 张图，批量处理进 public/images/workshop/。
 *
 * 每件文物对应商店里的一件藏品（relics.js 的 id），
 * 输出文件名形如 `<relicId>-<序号>.webp`，序号 1 = 出土状态，2..8 = 七道工序完成态。
 *
 * 用法: node _verify/scripts/process-all-artifacts.cjs <cdpPort> <base> [源目录]
 */
const fs = require('fs')
const path = require('path')

const PORT = process.argv[2]
const BASE = process.argv[3] || 'http://127.0.0.1:4182'
const SRC_ROOT = process.argv[4] || 'C:\\Users\\HOHUI\\Desktop\\修复步骤'
const ROOT = path.resolve(__dirname, '..', '..')
const TMP = path.join(ROOT, '_verify', 'src-steps')
const OUT_DIR = path.join(ROOT, 'public', 'images', 'workshop')
const WIDTH = 420
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 文件夹名 -> 商店文物 id */
const ARTIFACTS = [
  { id: 'hubei-3', folder: '青铜盖豆' },
  { id: 'hubei-2', folder: '鸳鸯形漆盒' },
  { id: 'hubei-4', folder: '青铜编钟' },
  { id: 'hubei-5', folder: '青铜方鉴' },
  { id: 'hubei-6', folder: '越王勾践剑' },
  { id: 'hubei-7', folder: '青花人纹瓶' },
  { id: 'hubei-1', folder: '彩绘漆木鼓架' },
  { id: 'other-1', folder: '彩陶盆' },
  { id: 'other-2', folder: '鹰形陶鼎' },
  { id: 'other-3', folder: '青铜面具' },
  { id: 'other-4', folder: '青铜马踏飞燕' },
  { id: 'other-5', folder: '金银品脱提梁壶' },
  { id: 'other-6', folder: '彩绘骑马陶俑' },
  { id: 'other-7', folder: '石雕人面像' },
]

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

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

  /** 处理单张：抠白底 -> 裁到内容 -> 缩到 WIDTH -> WebP */
  const convert = async (dataUrl) =>
    evaluate(`(async () => {
      const img = await new Promise((res) => {
        const i = new Image();
        const to = setTimeout(() => res('TIMEOUT'), 60000);
        i.onload = () => { clearTimeout(to); res(i); };
        i.onerror = () => { clearTimeout(to); res('ERROR'); };
        i.src = ${JSON.stringify(dataUrl)};
      });
      if (img === 'TIMEOUT' || img === 'ERROR') return { ok: false, reason: img };

      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H);
      const px = d.data;

      const NEAR = 10, FAR = 34;
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const diff = Math.max(255 - px[i], 255 - px[i + 1], 255 - px[i + 2]);
          let a;
          if (diff <= NEAR) a = 0;
          else if (diff < FAR) a = Math.round((255 * (diff - NEAR)) / (FAR - NEAR));
          else a = 255;
          px[i + 3] = Math.min(px[i + 3], a);
          if (px[i + 3] > 8) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return { ok: false, reason: 'EMPTY' };
      ctx.putImageData(d, 0, 0);

      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const tw = Math.min(${WIDTH}, cw);
      const th = Math.max(1, Math.round((ch / cw) * tw));
      const out = document.createElement('canvas');
      out.width = tw; out.height = th;
      const octx = out.getContext('2d');
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.clearRect(0, 0, tw, th);
      octx.drawImage(c, minX, minY, cw, ch, 0, 0, tw, th);
      const url = out.toDataURL('image/webp', 0.92);
      return { ok: true, w: tw, h: th, base64: url.slice(url.indexOf(',') + 1) };
    })()`)

  let before = 0
  let after = 0
  let done = 0
  let failed = 0

  for (const artifact of ARTIFACTS) {
    const folder = path.join(SRC_ROOT, artifact.folder)
    if (!fs.existsSync(folder)) {
      console.log(`\n【${artifact.folder}】源目录不存在，跳过`)
      failed += 8
      continue
    }
    const files = fs
      .readdirSync(folder)
      .filter((f) => /^步骤\d+\.jpg$/.test(f))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

    console.log(`\n【${artifact.folder}】-> ${artifact.id}  ${files.length} 张`)
    for (const file of files) {
      const index = Number(file.match(/\d+/)[0])
      const abs = path.join(folder, file)
      const buf = fs.readFileSync(abs)
      before += buf.length
      const res = await convert(`data:image/png;base64,${buf.toString('base64')}`)
      if (!res.ok) {
        console.log(`  ${file} 失败: ${res.reason}`)
        failed += 1
        continue
      }
      const outBuf = Buffer.from(res.base64, 'base64')
      fs.writeFileSync(path.join(OUT_DIR, `${artifact.id}-${index}.webp`), outBuf)
      after += outBuf.length
      done += 1
      console.log(`  ${(artifact.id + '-' + index).padEnd(14)} ${(buf.length / 1024).toFixed(0)} → ${(outBuf.length / 1024).toFixed(0)} KB  ${res.w}×${res.h}`)
    }
  }

  console.log(`\n完成 ${done} 张，失败 ${failed} 张`)
  console.log(`合计 ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB`)
  ws.close()
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

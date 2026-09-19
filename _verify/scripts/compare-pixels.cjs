/**
 * 临时验证脚本（验证完成后随 _verify/ 目录一起删除）
 *
 * 逐像素比对「原版」与「重构版」的无头截图。
 * 只依赖 Node 内置 zlib，自己解 PNG（IHDR + IDAT 反滤波），无需额外依赖。
 *
 * 用法: node _verify/pixel.cjs
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SHOT_DIR = path.join(__dirname, 'shots')

/* ------------------------------ 最小 PNG 解码 ------------------------------ */
function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png')

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (bitDepth !== 8) throw new Error('only 8-bit png supported, got ' + bitDepth)
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error('unsupported color type ' + colorType)

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)

  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      let value = line[x]
      switch (filter) {
        case 0: break
        case 1: value = value + a; break
        case 2: value = value + b; break
        case 3: value = value + ((a + b) >> 1); break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          value = value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default: throw new Error('bad filter ' + filter)
      }
      cur[x] = value & 0xff
    }
  }

  return { width, height, channels, data: out }
}

/* -------------------------------- 比对 -------------------------------- */
function comparePng(fileA, fileB) {
  const a = decodePng(fs.readFileSync(fileA))
  const b = decodePng(fs.readFileSync(fileB))

  const result = {
    sizeA: `${a.width}x${a.height}`,
    sizeB: `${b.width}x${b.height}`,
    sameSize: a.width === b.width && a.height === b.height,
    diffPixels: 0,
    totalPixels: 0,
    maxChannelDelta: 0,
    diffRatio: 0,
    sampleDiffs: [],
  }

  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  result.totalPixels = a.width * a.height

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (y * a.width + x) * a.channels
      const ib = (y * b.width + x) * b.channels
      const dr = Math.abs(a.data[ia] - b.data[ib])
      const dg = Math.abs(a.data[ia + 1] - b.data[ib + 1])
      const db = Math.abs(a.data[ia + 2] - b.data[ib + 2])
      const delta = Math.max(dr, dg, db)
      if (delta > 0) {
        result.diffPixels++
        if (delta > result.maxChannelDelta) result.maxChannelDelta = delta
        if (result.sampleDiffs.length < 8) {
          result.sampleDiffs.push({ x, y, orig: [a.data[ia], a.data[ia + 1], a.data[ia + 2]], ref: [b.data[ib], b.data[ib + 1], b.data[ib + 2]] })
        }
      }
    }
  }

  // 尺寸不同的部分全部计为差异
  if (!result.sameSize) {
    result.diffPixels += Math.abs(a.width * a.height - b.width * b.height)
  }
  result.diffRatio = result.totalPixels ? result.diffPixels / result.totalPixels : 0
  return result
}

/* --------------------------------- 主流程 --------------------------------- */
function main() {
  const files = fs.readdirSync(SHOT_DIR).filter((f) => f.endsWith('.png') && !f.startsWith('_'))
  const groups = new Map()

  for (const file of files) {
    const parts = file.replace(/\.png$/, '').split('__')
    if (parts.length !== 3) continue
    const [page, side, viewport] = parts
    const key = `${page}__${viewport}`
    if (!groups.has(key)) groups.set(key, {})
    groups.get(key)[side] = path.join(SHOT_DIR, file)
  }

  const keys = [...groups.keys()].sort()
  let totalDiffPixels = 0
  let worst = null
  const rows = []

  for (const key of keys) {
    const group = groups.get(key)
    if (!group.orig || !group.ref) {
      rows.push({ key, note: 'MISSING PAIR' })
      continue
    }
    const r = comparePng(group.orig, group.ref)
    totalDiffPixels += r.diffPixels
    if (!worst || r.diffRatio > worst.ratio) worst = { key, ratio: r.diffRatio, detail: r }
    rows.push({ key, ...r })
  }

  console.log('页面__视口'.padEnd(30) + '尺寸'.padEnd(14) + '差异像素'.padEnd(12) + '差异占比'.padEnd(12) + '最大通道差')
  for (const row of rows) {
    if (row.note) {
      console.log(row.key.padEnd(30) + row.note)
      continue
    }
    const pct = (row.diffRatio * 100).toFixed(4) + '%'
    console.log(
      row.key.padEnd(30) +
        `${row.sizeA}/${row.sizeB}`.padEnd(14) +
        String(row.diffPixels).padEnd(12) +
        pct.padEnd(12) +
        String(row.maxChannelDelta),
    )
  }

  console.log(`\n比对组合数: ${rows.filter((r) => !r.note).length}`)
  console.log(`差异像素总计: ${totalDiffPixels}`)
  if (worst) {
    console.log(`差异最大的一组: ${worst.key} → ${(worst.ratio * 100).toFixed(4)}%`)
    if (worst.detail.sampleDiffs.length) {
      console.log('前几个差异点: ' + JSON.stringify(worst.detail.sampleDiffs.slice(0, 5)))
    }
  }

  fs.writeFileSync(path.join(__dirname, 'pixel-report.json'), JSON.stringify(rows, null, 2), 'utf8')
}

main()

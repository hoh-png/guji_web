/**
 * 检查源码里静态引用的图片是否都存在（防止清理时误删在用的素材）。
 * 只扫 '...' / "..." / `...` 里写死的 /images/xxx 路径，
 * 拼接出来的路径（如 `/images/quiz/piece-${n}.png`）由 check-props 覆盖。
 *
 * 用法: node _verify/scripts/check-assets.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC = path.join(ROOT, 'public')
const SRC = path.join(ROOT, 'src')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const REF = /['"`](\/images\/[^'"`\s$]+\.(?:png|jpe?g|webp|gif|svg))['"`]/g

const refs = new Set()
for (const file of walk(SRC)) {
  if (!/\.(jsx?|css)$/.test(file)) continue
  const code = fs.readFileSync(file, 'utf8')
  for (const m of code.matchAll(REF)) refs.add(m[1])
}

const missing = [...refs].filter((r) => !fs.existsSync(path.join(PUBLIC, r)))

console.log(`  静态引用图片: ${refs.size} 个`)
if (missing.length) {
  console.log('  缺失:')
  missing.forEach((m) => console.log('    ' + m))
  process.exitCode = 1
} else {
  console.log('  全部存在 ✓')
}

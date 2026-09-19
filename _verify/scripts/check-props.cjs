// 临时校验脚本：确认道具数据自洽（id/名称/品质/图片路径/价格）
// 用法: node _verify/check-props.cjs
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'props.js'), 'utf8')

// 用正则直接解析源文件里的 tool(...) 调用，避免引入 ESM 加载器
const calls = [...src.matchAll(/tool\('([a-z-]+)', '([a-z-]+-\d)', '([^']+)', (\d), '([^']+)'\)/g)].map((m) => ({
  groupId: m[1],
  id: m[2],
  name: m[3],
  tier: Number(m[4]),
  use: m[5],
}))

console.log(`解析到 ${calls.length} 个工具`)

const problems = []
const seenIds = new Set()

for (const t of calls) {
  if (seenIds.has(t.id)) problems.push(`id 重复: ${t.id}`)
  seenIds.add(t.id)

  if (!t.id.startsWith(t.groupId + '-')) problems.push(`id 与 groupId 不匹配: ${t.groupId} / ${t.id}`)
  const tierFromId = Number(t.id.split('-').pop())
  if (tierFromId !== t.tier) problems.push(`id 尾号与品质不一致: ${t.id} tier=${t.tier}`)

  const img = path.join(ROOT, 'public', 'images', 'props', 'tools', `${t.id}.webp`)
  if (!fs.existsSync(img)) problems.push(`图片缺失: public/images/props/tools/${t.id}.webp`)
}

// 每个 groupId 应恰好有 3 个品质
const byGroup = new Map()
for (const t of calls) {
  if (!byGroup.has(t.groupId)) byGroup.set(t.groupId, [])
  byGroup.get(t.groupId).push(t.tier)
}
for (const [group, tiers] of byGroup) {
  const sorted = [...tiers].sort()
  if (JSON.stringify(sorted) !== '[1,2,3]') problems.push(`品质不完整: ${group} -> ${JSON.stringify(sorted)}`)
}
console.log(`工具分组: ${byGroup.size} 组（每组应为 3 个品质）`)

// 场所与工作台图片
// 场所是 JPEG；工作台带透明背景，用 PNG（JPEG 会把透明区压黑）
const sceneChecks = []
for (const id of ['venue-1', 'venue-2', 'venue-3']) sceneChecks.push([`${id}.jpg`, path.join(ROOT, 'public', 'images', 'props', 'venues', `${id}.jpg`)])
for (const id of ['desk-1', 'desk-2', 'desk-3']) sceneChecks.push([`${id}.png`, path.join(ROOT, 'public', 'images', 'props', 'desks', `${id}.png`)])
for (const [label, file] of sceneChecks) {
  if (!fs.existsSync(file)) problems.push(`图片缺失: ${label}`)
}
console.log(`场所/工作台检查: ${sceneChecks.length} 个`)

// 背景图（原图为 JPEG，后缀已修正为 .jpg）
for (const f of ['img1.jpg', 'img2.jpg']) {
  if (!fs.existsSync(path.join(ROOT, 'public', 'images', f))) problems.push(`背景图缺失: public/images/${f}`)
}

// 商店组件与货币档位配图
const shopChecks = []
for (let n = 1; n <= 5; n += 1) {
  shopChecks.push([`coin-${n}.webp`, path.join(ROOT, 'public', 'images', 'shop', 'raw-coin', `coin-${n}.webp`)])
  shopChecks.push([`ingot-${n}.webp`, path.join(ROOT, 'public', 'images', 'shop', 'raw-ingot', `ingot-${n}.webp`)])
}
for (const [label, file] of shopChecks) {
  if (!fs.existsSync(file)) problems.push(`商店配图缺失: ${label}`)
}
console.log(`商店配图检查: ${shopChecks.length} 个`)

if (problems.length) {
  console.log('\n发现问题:')
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exit(1)
}
console.log('\n✓ 道具数据自洽：id、品质、图片路径全部对得上')

// 输出一张对照表，便于人工核对
console.log('\nid'.padEnd(24) + '名称'.padEnd(14) + '品质  用途')
for (const t of calls) {
  console.log(t.id.padEnd(22) + t.name.padEnd(12) + `tier ${t.tier}  ${t.use}`)
}

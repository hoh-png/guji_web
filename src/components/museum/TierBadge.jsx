/** 品质标记：低级 / 中级 / 高级 */
export default function TierBadge({ tier }) {
  const map = {
    1: { name: '低级', tone: 'low' },
    2: { name: '中级', tone: 'mid' },
    3: { name: '高级', tone: 'high' },
  }
  const info = map[tier]
  if (!info) return null
  return <span className={`tier-badge tone-${info.tone}`}>{info.name}</span>
}

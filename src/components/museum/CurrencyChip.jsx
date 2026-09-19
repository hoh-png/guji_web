/**
 * 货币展示。
 *
 * 铜钱与元宝共用一套样式，只换图标与单位名：
 *   铜钱 —— 购买道具、场所、工作台
 *   元宝 —— 购买文物（素材待补），也可与铜钱互相兑换
 *
 * 图标直接复用商店里的 coin / ingot 素材，保证全站视觉一致。
 *
 * @param {object}  props
 * @param {'copper'|'ingot'} props.kind   货币种类
 * @param {number}  props.value           数量
 * @param {'md'|'sm'} props.size          尺寸档位
 */
export default function CurrencyChip({ kind, value, size = 'md' }) {
  const isCopper = kind !== 'ingot'
  const label = isCopper ? '铜钱' : '元宝'
  const icon = isCopper ? '/images/shop/components/coin.webp' : '/images/shop/components/ingot.webp'

  return (
    <span className={`currency-chip currency-chip--${size}`} title={label}>
      <img className="currency-icon" src={icon} alt="" draggable="false" />
      <span className="currency-value">{value}</span>
      <span className="currency-unit">{label}</span>
    </span>
  )
}

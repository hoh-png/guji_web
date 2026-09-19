import { SHOP_SLOT_SIZE } from '../../data/shop.js'

/**
 * 商店里的单个商品格。
 *
 * 不用 slot-frame 图片素材，而是直接用 HTML/CSS 画出格子：
 * 米色内容区 + 底部棕色价签条。
 *
 * 原因：格子框素材是一整张 2592×1600 的图，内容只占其中 281×269，
 * 摆进格位需要缩放 + 负偏移，一旦比例对不上就会整体错位
 * （道具图、名称、价格全部跟着偏）。改成 CSS 直接画，
 * 尺寸由布局决定，先摆好格子再往里面放内容，不可能再错位。
 *
 * @param {object}   props
 * @param {object}   props.item      商品数据
 * @param {boolean}  props.affordable 余额是否足够
 */
export default function ShopCell({ item, affordable = true }) {
  const width = SHOP_SLOT_SIZE.w
  const height = SHOP_SLOT_SIZE.h

  const currencyIcon = item.currency === 'ingot' ? '/images/shop/components/ingot.webp' : '/images/shop/components/coin.webp'
  const currencyName = item.currency === 'ingot' ? '元宝' : '铜钱'

  return (
    <div
      className={`shop-cell${item.active ? ' is-active' : ''}`}
      style={{ width, height }}
      data-key={item.key}
    >
      {/* 格子本体：米色区 + 底部价签条，全部由 CSS 绘制 */}
      <span className="cell-body" aria-hidden="true" />

      {/* 道具图 */}
      <img className="cell-art" src={item.image} alt={item.name} draggable="false" loading="lazy" />

      {/* 名称 */}
      <span className="cell-name">{item.name}</span>

      {/* 已拥有的印章 */}
      {item.owned ? (
        <img className="cell-stamp" src="/images/shop/components/stamp-owned.webp" alt="已藏" draggable="false" />
      ) : null}

      {/* 标价：货币图标 + 数值 */}
      <span className="cell-price">
        <img className="cell-coin" src={currencyIcon} alt={currencyName} draggable="false" />
        <span className="cell-price-value">{item.price}</span>
      </span>

      {/* 操作：悬停时出现 */}
      <span className="cell-actions">
        {item.exchange ? (
          <button type="button" className="cell-btn cell-btn--buy" disabled={!affordable} onClick={item.onBuy}>
            {affordable ? '兑换' : '不足'}
          </button>
        ) : item.owned ? (
          item.active ? (
            <span className="cell-btn cell-btn--on">使用中</span>
          ) : (
            <button type="button" className="cell-btn" onClick={item.onEquip}>
              设为使用
            </button>
          )
        ) : (
          <button type="button" className="cell-btn cell-btn--buy" onClick={item.onBuy}>
            兑换
          </button>
        )}
      </span>
    </div>
  )
}

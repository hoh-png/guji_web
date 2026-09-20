import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { DESKS, TOOLS, VENUES } from '../../data/props.js'
import {
  COPPER_TIERS,
  CURRENCY_TIERS,
  SHOP_CANVAS,
  SHOP_CATEGORIES,
  SHOP_SLOT_COUNT,
  getSlotPosition,
} from '../../data/shop.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import useAutoNotice from '../../hooks/useAutoNotice.js'
import ShopCell from './ShopCell.jsx'
import './ShopPage.css'

/**
 * 道具商店。
 *
 * 画面按素材 public/images/shop/reference.jpg（2592×1600）复刻：
 *   · 背景图即整个场景（屋檐 + 左侧挂幡 + 中央公告板），已横向拓展以适配宽屏
 *   · 左上角返回按钮、右上角铜钱/元宝资源框
 *   · 左侧挂幡：四个栏目（工具 / 文物 / 铜钱 / 元宝）
 *   · 中央公告板：5 列 × 3 行 = 15 个展示格
 *
 * 商店组件素材都是「整张 2592×1600 画布 + 内容画在某一处」的透明图，
 * 因此统一用窗格裁切（容器定位到内容坐标 + 内层图片负偏移）摆放，保证 1:1 不变形。
 */

/** 道具 / 场所 / 工作台的铜钱定价，当前统一为 0 */
const PRICE_COPPER = { tool: 0, venue: 0, desk: 0 }


/**
 * 返回按钮：从哪个页面进入商店，就回到哪个页面。
 * 进入时带了 state.from 就直接用；直接用地址打开时回退到浏览器历史。
 */
function useBackTarget() {
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from
  return () => {
    if (from) navigate(from)
    else navigate(-1)
  }
}

export default function ShopPage() {
  usePageTitle('道具商店 · 古迹修复系统')

  const { state, notice, clearNotice, buyTool, buyVenue, buyDesk, equipTool, selectVenue, selectDesk, exchange } = usePlayer()
  const goBack = useBackTarget()

  const [category, setCategory] = useState('tool')
  const [filterTier, setFilterTier] = useState('all')

  useAutoNotice(notice, clearNotice)

  const canvasRef = useRef(null)

  /*
   * 画布等比缩放 + 顶部信息条按视口宽定位。
   * --s：整幅场景按 min(宽/2592, 高/1600) 缩放，保证比例不变；
   * --edge-x：画布左右边缘在画布坐标系里的内边距，
   *           画布比 2592 宽时右上的资源框要跟着右移，否则会离边太远。
   */
  useEffect(() => {
    const fit = () => {
      const el = canvasRef.current
      if (!el) return
      /*
       * 场景固定 2592×1600，整体等比缩放：s = min(视口宽/2592, 视口高/1600)。
       * 宽屏下左右差额由 .shop-scene 的背景色渐隐补上（背景图已含镜面拓展，
       * 观感上像是场景自然延伸），不再把画布撑宽——撑宽会把左侧挂幡挤出画面。
       */
      const s = Math.min(window.innerWidth / SHOP_CANVAS.width, window.innerHeight / SHOP_CANVAS.height)
      el.style.setProperty('--s', String(s))
      el.style.setProperty('--edge-pad', '41')
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const ownedTools = useMemo(() => new Set(state.ownedToolIds), [state.ownedToolIds])
  const equippedTools = useMemo(() => new Set(state.equippedToolIds), [state.equippedToolIds])
  const ownedVenues = useMemo(() => new Set(state.ownedVenueIds), [state.ownedVenueIds])
  const ownedDesks = useMemo(() => new Set(state.ownedDeskIds), [state.ownedDeskIds])

  /**
   * 工具栏目：不再分页，所有分类堆在一页里从上往下翻。
   * 每个分类 = 一行标题 + 3 张卡片（低级 / 中级 / 高级）。
   */
  const toolSections = useMemo(() => {
    if (category !== 'tool') return []

    const sections = TOOLS.map((group) => ({
      id: group.groupId,
      title: group.group,
      desc: group.description,
      items: group.items.map((item) => ({
        key: item.id,
        name: item.name,
        image: item.image,
        owned: ownedTools.has(item.id),
        active: equippedTools.has(item.id),
        price: PRICE_COPPER.tool,
        currency: 'copper',
        onBuy: () => buyTool(item.id),
        onEquip: () => equipTool(item.id),
      })),
    }))

    // 工作台与场所也各自成组，接在工具后面
    sections.push({
      id: 'desk',
      title: '工作台',
      desc: '承托文物的工作台，台面越讲究，操作越稳妥。',
      items: DESKS.map((d) => ({
        key: d.id,
        name: d.name,
        image: d.image,
        owned: ownedDesks.has(d.id),
        active: state.equippedDeskId === d.id,
        price: PRICE_COPPER.desk,
        currency: 'copper',
        onBuy: () => buyDesk(d.id),
        onEquip: () => selectDesk(d.id),
      })),
    })

    sections.push({
      id: 'venue',
      title: '场所',
      desc: '更专业的场所能承接更高难度的文物，也更有修复的氛围。',
      items: VENUES.map((v) => ({
        key: v.id,
        name: v.name,
        image: v.image,
        owned: ownedVenues.has(v.id),
        active: state.equippedVenueId === v.id,
        price: PRICE_COPPER.venue,
        currency: 'copper',
        onBuy: () => buyVenue(v.id),
        onEquip: () => selectVenue(v.id),
      })),
    })

    return sections
  }, [
    category,
    ownedTools,
    equippedTools,
    ownedDesks,
    ownedVenues,
    state.equippedDeskId,
    state.equippedVenueId,
    buyTool,
    buyDesk,
    buyVenue,
    equipTool,
    selectDesk,
    selectVenue,
  ])

  /** 其余栏目的商品列表 */
  const items = useMemo(() => {
    if (category === 'tool') return []

    if (category === 'venue') {
      return VENUES.map((v) => ({
        key: v.id,
        name: v.name,
        image: v.image,
        owned: ownedVenues.has(v.id),
        active: state.equippedVenueId === v.id,
        price: PRICE_COPPER.venue,
        currency: 'copper',
        onBuy: () => buyVenue(v.id),
        onEquip: () => selectVenue(v.id),
      }))
    }

    if (category === 'desk') {
      return DESKS.map((d) => ({
        key: d.id,
        name: d.name,
        image: d.image,
        owned: ownedDesks.has(d.id),
        active: state.equippedDeskId === d.id,
        price: PRICE_COPPER.desk,
        currency: 'copper',
        onBuy: () => buyDesk(d.id),
        onEquip: () => selectDesk(d.id),
      }))
    }

    /* 元宝栏目：用铜钱兑换元宝，展示可得元宝数，价格为所需铜钱。
       每个档位用对应的元宝图（ingot-1 .. ingot-5）。 */
    if (category === 'ingot') {
      return CURRENCY_TIERS.map((tier, index) => ({
        key: `ingot-${tier.amount}`,
        name: `${tier.amount} 元宝`,
        image: `/images/shop/raw-ingot/ingot-${index + 1}.webp`,
        price: tier.price,
        currency: 'copper',
        owned: false,
        exchange: true,
        onBuy: () => exchange('ingot', tier.amount, tier.price),
      }))
    }

    /* 铜钱栏目：用元宝兑换铜钱，展示可得铜钱数，价格为所需元宝。
       每个档位用对应的铜钱图（coin-1 .. coin-5）。 */
    if (category === 'copper') {
      return COPPER_TIERS.map((tier, index) => ({
        key: `copper-${tier.amount}`,
        name: `${tier.amount} 铜钱`,
        image: `/images/shop/raw-coin/coin-${index + 1}.webp`,
        price: tier.price,
        currency: 'ingot',
        owned: false,
        exchange: true,
        onBuy: () => exchange('copper', tier.amount, tier.price),
      }))
    }

    // 文物要用元宝购买，素材与数据尚未提供
    return []
  }, [
    category,
    filterTier,
    ownedTools,
    equippedTools,
    ownedVenues,
    ownedDesks,
    state.equippedVenueId,
    state.equippedDeskId,
    buyTool,
    buyVenue,
    buyDesk,
    equipTool,
    selectVenue,
    selectDesk,
    exchange,
  ])

  const affordable = (item) => {
    if (!item || item.exchange === undefined) return true
    return item.currency === 'copper' ? state.copper >= item.price : state.ingot >= item.price
  }

  return (
    <div className="shop-scene">
      <div className="shop-canvas" ref={canvasRef}>
        {/* 场景背景：屋檐 + 挂幡 + 公告板（已横向拓展） */}
        <img className="shop-bg" src="/images/shop/shop-bg.jpg" alt="" draggable="false" />

        {/* 左上角：返回。
            按钮由 CSS 直接绘制（棕色圆角底 + 白色箭头 + 「返回」文字），
            不依赖 back-frame / back-arrow 素材，避免素材内容位置换算带来的偏差。 */}
        <button type="button" className="shop-back" onClick={goBack} aria-label="返回">
          <svg className="shop-back-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path
              d="M13.2 7.2 6 14.4a2.4 2.4 0 0 0 0 3.2l7.2 7.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M7.4 16h17.8" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
          </svg>
          <span className="shop-back-text">返回</span>
        </button>

        {/* 右上角：铜钱 / 元宝（贴画布右边，随视口宽度右移） */}
        <div className="shop-chip shop-chip--ingot">
          <span className="part">
            <img src="/images/shop/components/currency-frame.webp" alt="" draggable="false" style={{ marginLeft: -1814, marginTop: -56 }} />
          </span>
          <img className="shop-chip-icon" src="/images/shop/components/ingot.webp" alt="元宝" draggable="false" />
          <span className="shop-chip-value">{state.ingot}</span>
        </div>
        <div className="shop-chip shop-chip--copper">
          <span className="part">
            <img src="/images/shop/components/currency-frame.webp" alt="" draggable="false" style={{ marginLeft: -1814, marginTop: -56 }} />
          </span>
          <img className="shop-chip-icon" src="/images/shop/components/coin.webp" alt="铜钱" draggable="false" />
          <span className="shop-chip-value">{state.copper}</span>
        </div>

        {/* 左侧挂幡：栏目（相邻两项之间加一条分界线） */}
        <nav className="shop-plaque" aria-label="商品栏目">
          {SHOP_CATEGORIES.map((cat, index) => (
            <Fragment key={cat.id}>
              {index > 0 ? (
                <span className="shop-menu-divider" aria-hidden="true">
                  <img src="/images/shop/components/divider.webp" alt="" draggable="false" />
                </span>
              ) : null}
              <button
                type="button"
                className={`shop-menu-item${category === cat.id ? ' on' : ''}`}
                onClick={() => {
                  setCategory(cat.id)
                  setFilterTier('all')
                }}
              >
                {cat.name}
              </button>
            </Fragment>
          ))}
        </nav>

        {/*
          工具栏目：所有分类堆在一页里，从上往下滚动。
          每个分类 = 一行标题 + 三张卡片（低级 / 中级 / 高级）。
        */}
        {category === 'tool' ? (
          <div className="shop-scroll">
            <div className="shop-scroll-inner">
              {toolSections.map((section) => (
                <section className="shop-group" key={section.id}>
                  <div className="shop-group-head">
                    <span className="shop-group-title">{section.title}</span>
                    {section.desc ? <span className="shop-group-desc">{section.desc}</span> : null}
                  </div>
                  <div className="shop-group-row">
                    {section.items.map((item) => (
                      <ShopCell key={item.key} item={item} affordable={affordable(item)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 其余栏目：仍用固定格位摆放 */}
            <div className="shop-grid">
              {items.slice(0, SHOP_SLOT_COUNT).map((item, index) => {
                const pos = getSlotPosition(index, items.length)
                return (
                  <div className="shop-slot" key={item.key} style={{ left: pos.left, top: pos.top }}>
                    <ShopCell item={item} affordable={affordable(item)} />
                  </div>
                )
              })}
            </div>

            {items.length === 0 ? (
              <div className="shop-empty">{category === 'relic' ? '文物素材尚未提供，敬请期待' : '该栏目暂未开放'}</div>
            ) : null}
          </>
        )}

        <div className={`toast${notice ? ' show' : ''}`} role="status" aria-live="polite">
          {notice ? notice.text : ''}
        </div>
      </div>
    </div>
  )
}

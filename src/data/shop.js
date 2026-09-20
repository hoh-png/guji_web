/**
 * 道具商店的配置。
 *
 * 布局依据设计源图 docs/reference/商店示意图.png（2592×1600）：
 * 左侧挂幡是栏目菜单，中央公告板是商品陈列区。
 * 改商店布局时对着这张图核对比例。
 *
 * 货币约定：
 *   铜钱 —— 用于购买道具与场所，也可兑换元宝
 *   元宝 —— 用于购买文物，也可兑换铜钱
 */

/** 栏目顺序与示意图左侧挂幡一致 */
export const SHOP_CATEGORIES = [
  { id: 'tool', name: '工具', currency: 'copper' },
  { id: 'relic', name: '文物', currency: 'ingot' },
  { id: 'copper', name: '铜钱', currency: 'ingot' },
  { id: 'ingot', name: '元宝', currency: 'copper' },
]

/** 兑换比例：1 元宝 = 1000 铜钱。档位仅控制页面展示，实际扣款由后端校验。 */
export const CURRENCY_TIERS = [
  { amount: 1, price: 1000 },
  { amount: 5, price: 5000 },
  { amount: 10, price: 10000 },
  { amount: 25, price: 25000 },
  { amount: 50, price: 50000 },
]

export const COPPER_TIERS = [
  { amount: 1000, price: 1 },
  { amount: 5000, price: 5 },
  { amount: 10000, price: 10 },
  { amount: 25000, price: 25 },
  { amount: 50000, price: 50 },
]

/** 画布尺寸：所有定位以它为基准，再整体缩放到窗口 */
export const SHOP_CANVAS = { width: 2592, height: 1600 }

/** 陈列上限：5 列 × 3 行 */
export const SHOP_GRID = { cols: 5, rows: 3 }
export const SHOP_SLOT_COUNT = SHOP_GRID.cols * SHOP_GRID.rows

/**
 * 组件在画布上的内容位置（单位：画布 px，全部实测自素材的 alpha 通道）。
 * 每个组件的图片都是整张 2592×1600，内容画在 x/y/w/h 这一块里。
 */
export const SHOP_PARTS = {
  backFrame: { x: 149, y: 47, w: 183, h: 75 },
  backArrow: { x: 43, y: 42, w: 84, h: 84 },
  currencyFrame: { x: 1814, y: 56, w: 301, h: 76 },

  stamp: { x: 1002, y: 976, w: 97, h: 147 },
  badge: { x: 1462, y: 780, w: 96, h: 75 },
  /* 分界线素材：实际是一根很细的横线，内容只有 124×1 */
  divider: { x: 126, y: 890, w: 124, h: 1 },
}

/**
 * 商品陈列范围：公告板（背景图上那块空白宣纸）的可用区域。
 *
 * 注意：不叠加 grid-frame 底板 —— 那张素材自带 15 个空格子，
 * 货币栏目只有 5 个商品时会露出一片空框。背景本身在公告板位置
 * 已经是空白宣纸，商品直接摆上去更干净。
 */
/**
 * 商品陈列范围：公告板（背景图上那块空白宣纸）的可用区域。
 * 按用户要求整体左移 1% 屏宽、下移 1% 屏高：
 * 以标准 16:9 画布算，1% 宽 = 26px、1% 高 = 16px。
 *
 * h 必须够分 3 行：行距 = (h - 格高) / 2，需 ≥ 格高，否则行与行会重叠。
 */
export const SHOP_BOARD = { x: 514, y: 676, w: 1520, h: 860 }

/**
 * 单格尺寸。格子由 CSS 直接绘制（见 ShopCell.jsx），
 * 不再依赖 slot-frame 图片素材，因此尺寸只需容纳「道具图 + 名称 + 价格」。
 */
export const SHOP_SLOT_SIZE = { w: 260, h: 210 }

/**
 * 第 index 格的左上角坐标。
 *
 * 规则：
 *  - 列数按实际商品数收窄（满 5 个才 5 列），因此 3 件的子栏目会排得更紧凑；
 *  - 横向：不足一行时整块居中，不会缩在左边；
 *  - 纵向：始终从公告板顶部开始排，不做垂直居中（保持原有上边距）。
 */
export function getSlotPosition(index, itemCount = SHOP_SLOT_COUNT) {
  const cols = Math.min(SHOP_GRID.cols, Math.max(1, itemCount))
  const rows = Math.max(1, Math.ceil(itemCount / SHOP_GRID.cols))
  const col = index % cols
  const row = Math.floor(index / cols)

  /* 格间距：按同一套比例算，保证各行各列间距一致 */
  const padX = (SHOP_BOARD.w - SHOP_GRID.cols * SHOP_SLOT_SIZE.w) / (SHOP_GRID.cols + 1)
  const padY = (SHOP_BOARD.h - SHOP_GRID.rows * SHOP_SLOT_SIZE.h) / (SHOP_GRID.rows + 1)
  const pitchX = SHOP_SLOT_SIZE.w + padX
  const pitchY = SHOP_SLOT_SIZE.h + padY

  const blockW = cols * SHOP_SLOT_SIZE.w + (cols - 1) * padX

  const originX = SHOP_BOARD.x + (SHOP_BOARD.w - blockW) / 2
  const originY = SHOP_BOARD.y

  return {
    left: Math.round(originX + col * pitchX),
    top: Math.round(originY + row * pitchY),
  }
}

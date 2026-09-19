/**
 * 全站图片登记表。
 *
 * 所有会被 <img> 或 CSS 引用的图片都在这里集中登记，
 * 供预加载器使用 —— 切换场景时若图片还没进缓存，会闪一下；
 * 提前预热就没有这个问题。
 */

/* 8 类工具 × 3 个品质 */
const TOOL_SLUGS = [
  'hammer',
  'tweezers',
  'scalpel',
  'needle-awl',
  'dropper',
  'soldering-iron',
  'heat-gun',
  'mat',
]

const toolImages = TOOL_SLUGS.flatMap((slug) => [1, 2, 3].map((tier) => `/images/props/tools/${slug}-${tier}.webp`))

const venueImages = ['venue-1', 'venue-2', 'venue-3'].map((id) => `/images/props/venues/${id}.jpg`)

/* 工作台带透明背景，用 PNG */
const deskImages = ['desk-1.png', 'desk-2.png', 'desk-3.png'].map((f) => `/images/props/desks/${f}`)

/* 全屏背景（登录页、主页） */
export const HOME_BACKGROUND = '/images/img1.jpg'
export const LOGIN_BACKGROUND = '/images/img2.jpg'
const pageBackgrounds = [HOME_BACKGROUND, LOGIN_BACKGROUND]

/* 商店：场景背景 + 界面组件 */
const shopImages = [
  '/images/shop/shop-bg.jpg',
  '/images/shop/components/coin.webp',
  '/images/shop/components/ingot.webp',
  '/images/shop/components/back-frame.webp',
  '/images/shop/components/back-arrow.webp',
  '/images/shop/components/currency-frame.webp',
  '/images/shop/components/slot-frame.webp',
  '/images/shop/components/grid-frame.webp',
  '/images/shop/components/stamp-owned.webp',
  '/images/shop/components/badge-discount.webp',
  '/images/shop/components/divider.webp',
  /* 货币兑换档位的配图：铜钱 / 元宝 各 5 档 */
  ...[1, 2, 3, 4, 5].map((n) => `/images/shop/raw-coin/coin-${n}.webp`),
  ...[1, 2, 3, 4, 5].map((n) => `/images/shop/raw-ingot/ingot-${n}.webp`),
]

/** 全部图片 */
export const ALL_IMAGES = [...toolImages, ...venueImages, ...deskImages, ...pageBackgrounds, ...shopImages]

/**
 * 优先预热的图：主页背景 + 货币图标 + 场所 / 工作台 / 全部工具。
 * 这些是主页与工坊一进去就看得到的，晚一点就会出现空白。
 *
 * 登录页背景（LOGIN_BACKGROUND）不在这里 —— 登录页不需要预热；
 * 它仍在 ALL_IMAGES 里，会随延后一批预热，切回登录页时同样不会闪。
 */
export const PRIORITY_IMAGES = [
  HOME_BACKGROUND,
  '/images/shop/components/coin.webp',
  '/images/shop/components/ingot.webp',
  ...venueImages,
  ...deskImages,
  ...toolImages,
]

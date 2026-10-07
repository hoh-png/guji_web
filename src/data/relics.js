/**
 * 商店「文物」栏目的数据。
 *
 * 素材来源：public/images/shop/relics/，两批——
 *   hubei/  战国·湖北（漆木器、青铜礼器、越王剑等）
 *   other/  其他地区（新石器彩陶、三星堆、唐代陶俑等）
 *
 * 图片已处理过：白底抠成透明、裁到内容、缩到 360px 宽的 WebP。
 * 原始大图归档在 docs/assets-source 下的 relics-hubei / relics-other（不入库）。
 *
 * 定价：统一用元宝。当前暂定 0 元宝，改价只需改 INGOT_PRICES。
 */

/** 文物价格（元宝）。当前均为 0。 */
export const INGOT_PRICES = {
  common: 0, // 常见
  fine: 0, // 精品
  rare: 0, // 珍品
}

/** 品级：仅用于展示标签，与价格档位对应 */
export const RELIC_GRADES = {
  common: { id: 'common', name: '常见', tone: 'low' },
  fine: { id: 'fine', name: '精品', tone: 'mid' },
  rare: { id: 'rare', name: '珍品', tone: 'high' },
}

/**
 * 文物清单。
 * name / desc 是我按画面内容判断的，若与实际不符，直接改这里即可。
 */
export const RELICS = [
  /* ---------------- 湖北（战国·楚地） ---------------- */
  {
    id: 'hubei-1',
    name: '彩绘漆木鼓架',
    region: '湖北',
    grade: 'rare',
    image: '/images/shop/relics/hubei/hubei-1.webp',
    desc: '双鸟衔鼓、虎形座，战国楚地漆木工艺。',
  },
  {
    id: 'hubei-2',
    name: '鸳鸯形漆盒',
    region: '湖北',
    grade: 'fine',
    image: '/images/shop/relics/hubei/hubei-2.webp',
    desc: '鸳鸯造型，器身满绘漆彩纹样。',
  },
  {
    id: 'hubei-3',
    name: '青铜盖豆',
    region: '湖北',
    grade: 'common',
    image: '/images/shop/relics/hubei/hubei-3.webp',
    desc: '带盖高柄豆，器身饰蟠螭纹。',
  },
  {
    id: 'hubei-4',
    name: '青铜编钟',
    region: '湖北',
    grade: 'rare',
    image: '/images/shop/relics/hubei/hubei-4.webp',
    desc: '甬钟形制，钮部铸双龙，钟面有枚。',
  },
  {
    id: 'hubei-5',
    name: '青铜方鉴',
    region: '湖北',
    grade: 'fine',
    image: '/images/shop/relics/hubei/hubei-5.webp',
    desc: '方体带盖，四角饰兽，通体铸繁密纹饰。',
  },
  {
    id: 'hubei-6',
    name: '越王勾践剑',
    region: '湖北',
    grade: 'rare',
    image: '/images/shop/relics/hubei/hubei-6.webp',
    desc: '剑身满布菱形暗格纹，近格处有铭文。',
  },
  {
    id: 'hubei-7',
    name: '青花人物纹梅瓶',
    region: '湖北',
    grade: 'fine',
    image: '/images/shop/relics/hubei/hubei-7.webp',
    desc: '肩部绘云鹤，腹部开光内绘人物故事。',
  },

  /* ---------------- 其他地区 ---------------- */
  {
    id: 'other-1',
    name: '彩陶盆',
    region: '其他',
    grade: 'common',
    image: '/images/shop/relics/other/other-1.webp',
    desc: '新石器时代彩陶，内壁绘鱼纹与几何纹。',
  },
  {
    id: 'other-2',
    name: '鹰形陶鼎',
    region: '其他',
    grade: 'fine',
    image: '/images/shop/relics/other/other-2.webp',
    desc: '鹰形造型的三足陶鼎，鼎口开于背部。',
  },
  {
    id: 'other-3',
    name: '青铜面具',
    region: '其他',
    grade: 'rare',
    image: '/images/shop/relics/other/other-3.webp',
    desc: '粗眉大眼、阔耳凸目，三星堆式样。',
  },
  {
    id: 'other-4',
    name: '青铜奔马',
    region: '其他',
    grade: 'rare',
    image: '/images/shop/relics/other/other-4.webp',
    desc: '三足腾空、一足踏飞鸟的奔马造型。',
  },
  {
    id: 'other-5',
    name: '金银平脱提梁壶',
    region: '其他',
    grade: 'fine',
    image: '/images/shop/relics/other/other-5.webp',
    desc: '提梁圆壶，通体饰缠枝花鸟纹。',
  },
  {
    id: 'other-6',
    name: '彩绘骑马陶俑',
    region: '其他',
    grade: 'common',
    image: '/images/shop/relics/other/other-6.webp',
    desc: '唐代彩绘陶俑，骑者端坐马背。',
  },
  {
    id: 'other-7',
    name: '石雕人面像',
    region: '其他',
    grade: 'fine',
    image: '/images/shop/relics/other/other-7.webp',
    desc: '宽额厚唇的石雕人面，表面有拼接痕迹。',
  },
]

/** 按 id 取文物 */
export function getRelicById(id) {
  return RELICS.find((r) => r.id === id) || null
}

/** 批次开始的默认拥有：无（文物都要用元宝购买） */
export const STARTER_RELIC_IDS = []

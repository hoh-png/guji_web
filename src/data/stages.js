/**
 * 知识挑战的关卡数据。
 *
 * 一关对应一件待修复文物 + 一张关卡路线 + 该文物被拆分出的碎片。
 * 路线图上按「起 → 终」的顺序有若干圆环，玩家沿路线逐关答题，
 * 答对即把对应碎片放回原位；题目与通关进度由后端接口提供。
 */

/** 关卡路线图原始尺寸，用于把圆心像素换算成百分比 */
export const ROUTE_IMAGE_SIZE = { width: 750, height: 581 }

/**
 * 五个圆环的圆心（像素，相对 route.png）。
 * 由 _verify/scripts/measure-route-circles.cjs 从路线图的镂空区量得。
 */
export const ROUTE_CIRCLES = [
  { id: 1, x: 275, y: 163, piece: 1 },
  { id: 2, x: 590, y: 61, piece: 2 },
  { id: 3, x: 650, y: 425, piece: 3 },
  { id: 4, x: 357, y: 399, piece: 4 },
  { id: 5, x: 94, y: 481, piece: 5 },
]

/**
 * 第一关：铜盖豆。
 *
 * 「逐块复原」的摆放方式：
 *   底层是完整的文物图（整体调暗），表层是五块碎片图。
 *   答对一关就把对应那块碎片盖回器物上，五块盖满即修复完成。
 *
 * pieces 里控制「左侧图表层」位置与大小的字段：
 *   slot   —— 位置。相对文物图的百分比：x 是碎片左边缘、y 是上边缘。
 *             文物图本身已经裁到器物，所以这些比例直接就是「盖在器物上」的位置。
 *   scale  —— 大小。相对基准宽的倍数：1 = 基准（文物图宽度的 24%），
 *             1.2 = 放大两成，0.8 = 缩小两成。每块独立可调，
 *             高度按各自原图宽高比自动算。
 *
 * width / height 是图片原始像素尺寸，只用来算宽高比，不是显示尺寸。
 * cx / cy 是碎片在路线圆环里的对齐中心，与左侧无关。
 */
export const RELIC_STAGES = [
  {
    id: 'stage-1',
    name: '铜盖豆',
    relicImage: {
      src: '/images/quiz/relic.png',
      size: { width: 460, height: 527 },
    },
    routeImage: '/images/quiz/route.png',
    pieces: [
      { id: 1, image: '/images/quiz/piece-1.png', width: 220, height: 135, cx: 0.5, cy: 0.5, slot: { x: 32, y: -0.8 }, scale: 1.0 },
      { id: 2, image: '/images/quiz/piece-2.png', width: 220, height: 183, cx: 0.5, cy: 0.5, slot: { x: -0.7, y: 0.5 }, scale: 0.9 },
      { id: 3, image: '/images/quiz/piece-3.png', width: 220, height: 144, cx: 0.5, cy: 0.5, slot: { x: 30, y: 18 }, scale: 1.15 },
      { id: 4, image: '/images/quiz/piece-4.png', width: 181, height: 224, cx: 0.5, cy: 0.5, slot: { x: 9, y: 36 }, scale: 0.9 },
      { id: 5, image: '/images/quiz/piece-5.png', width: 220, height: 136, cx: 0.5, cy: 0.5, slot: { x: 21.5, y: 69 }, scale: 1.0 },
    ],
  },
]

/** 取第一关（当前只做了一关） */
export function getStage(index = 0) {
  return RELIC_STAGES[index] || null
}

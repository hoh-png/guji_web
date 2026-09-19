import { ALL_IMAGES, PRIORITY_IMAGES } from '../../data/images.js'
import useImagePreload from '../../hooks/useImagePreload.js'

/**
 * 应用级预加载：挂在 <App /> 里，只在最外层渲染一次。
 *
 * 先把首屏与工坊最常用的图（背景、工具、场所、工作台、货币图标）预热，
 * 其余（商店场景与组件）再延后预热，避免和首屏抢带宽。
 * 这样在各页面之间切换、换装备、换场景时图片已在缓存里，不会闪。
 */
export default function AppPreloader() {
  useImagePreload(PRIORITY_IMAGES, { idleDelay: 150 })

  const rest = ALL_IMAGES.filter((src) => !PRIORITY_IMAGES.includes(src))
  useImagePreload(rest, { idleDelay: 1500 })

  return null
}

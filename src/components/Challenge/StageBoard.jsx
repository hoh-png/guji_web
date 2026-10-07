import { ROUTE_CIRCLES, ROUTE_IMAGE_SIZE } from '../../data/stages.js'

/**
 * 修复台：左侧文物完整体 + 右侧关卡路线与碎片。
 *
 * 版面按设计样例 docs/reference/知识挑战-关卡页-样例.jpg 复刻。
 * 坐标全部用场景像素（基准 1750×1080），外层只做一次整体缩放，
 * 因此元素之间的相对关系由坐标保证，不随窗口尺寸变化而错位。
 *
 * 「逐块复原」的做法：
 *   底层 = 完整的文物图，整体调暗；
 *   表层 = 五块碎片图，按各自在文物图上的位置盖上去。
 *   答对一关就显示对应那块碎片，于是画面一块块亮起来。
 *   碎片本来就是从这张图上切下来的，位置一致即可严丝合缝。
 *
 * @param {object}   props
 * @param {object}   props.stage       关卡数据
 * @param {object}   props.relicBox    文物完整体在场景中的位置与宽度 { x, y, width }
 * @param {object}   props.routeBox    路线图在场景中的位置与宽度 { x, y, width }
 * @param {number[]} props.solvedIds   已归位的碎片编号
 * @param {number}   props.pieceWidth  碎片在路线上的显示宽度
 * @param {function} props.onSelect    点击某个圆环时的回调，参数为关卡号
 */
export default function StageBoard({ stage, relicBox, routeBox, solvedIds, pieceWidth, onSelect }) {
  const routeScale = routeBox.width / ROUTE_IMAGE_SIZE.width
  const routeHeight = ROUTE_IMAGE_SIZE.height * routeScale
  const allSolved = solvedIds.length >= stage.pieces.length

  /*
   * 碎片在器物上的基准显示宽度：文物图宽度的 61%（第一块按这个大小调合适了）。
   * 每块的实际宽度 = 基准 × 该块的 scale，见 data/stages.js 的 pieces[].scale；
   * 高度按各自原图宽高比自动算，所以改一块的大小不影响其他块。
   */
  const pieceBaseWidth = relicBox.width * 0.61

  return (
    <>
      {/* 左侧：文物完整体（底层调暗，表层逐块盖上碎片） */}
      <div
        className={`challenge-relic${allSolved ? ' is-restored' : ''}`}
        style={{ left: relicBox.x, top: relicBox.y, width: relicBox.width }}
      >
        <img className="relic-base" src={stage.relicImage.src} alt={stage.name} draggable="false" />

        {stage.pieces.map((piece) => {
          if (!solvedIds.includes(piece.id) || !piece.slot) return null

          const w = pieceBaseWidth * (piece.scale ?? 1)
          const h = w * (piece.height / piece.width)

          return (
            <img
              className="relic-piece"
              key={piece.id}
              src={piece.image}
              alt=""
              draggable="false"
              style={{
                left: `${piece.slot.x}%`,
                top: `${piece.slot.y}%`,
                width: w,
                height: h,
              }}
            />
          )
        })}
      </div>

      {/* 右侧：关卡路线 + 碎片位（一点即开该关题目） */}
      <div
        className="challenge-route"
        style={{ left: routeBox.x, top: routeBox.y, width: routeBox.width, height: routeHeight }}
      >
        <img className="route-image" src={stage.routeImage} alt="关卡路线" draggable="false" />

        {ROUTE_CIRCLES.map((circle) => {
          const piece = stage.pieces.find((p) => p.id === circle.piece)
          if (!piece) return null

          const isSolved = solvedIds.includes(circle.id)
          // 圆心：路线图像素 -> 相对路线容器的坐标
          const relX = circle.x * routeScale
          const relY = circle.y * routeScale
          const pieceHeight = (piece.height / piece.width) * pieceWidth

          // 让碎片的视觉中心落在圆心上（cx / cy 见 stages.js）
          const left = relX - pieceWidth * piece.cx
          const top = relY - pieceHeight * piece.cy

          return (
            <button
              type="button"
              className={`route-piece${isSolved ? ' is-done' : ''}`}
              key={circle.id}
              style={{ left, top, width: pieceWidth }}
              onClick={() => onSelect(circle.id)}
              aria-label={`第 ${circle.id} 关`}
            >
              <img src={piece.image} alt={`碎片 ${piece.id}`} draggable="false" />
              <span className="route-piece-index">{isSolved ? '✓' : circle.id}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

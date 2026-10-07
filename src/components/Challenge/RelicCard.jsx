/**
 * 知识挑战 · 文物详情卡片。
 *
 * 只输出内容（名称、状态标签、修复进度），外壳样式由使用方提供
 * （关卡页里是左下角的 .challenge-relic-card）。
 *
 * @param {object}   props
 * @param {object}   props.stage      关卡数据（见 src/data/stages.js）
 * @param {number}   props.solved     已修复的碎片数
 */
export default function RelicCard({ stage, solved }) {
  const total = stage.pieces.length
  const percent = Math.round((solved / total) * 100)

  return (
    <div className="relic-meta">
      <h2>{stage.name}</h2>
      <div className="tags">
        <span>待修复文物</span>
        <span>共 {total} 块碎片</span>
        <span>
          已归位 {solved} / {total}
        </span>
      </div>
      <div className="relic-progress">
        <span className="relic-progress-bar">
          <span className="relic-progress-fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="relic-progress-value">{percent}%</span>
      </div>
    </div>
  )
}

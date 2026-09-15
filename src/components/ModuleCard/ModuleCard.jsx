import { Link } from 'react-router-dom'

/**
 * 主页上的功能模块卡片。
 *
 * 对应原 index.html 中的：
 *   <div class="module" id="mod-xxx" onclick="goTo('...')" title="...">
 *     <span class="tag">…</span>
 *     <span class="hint">点击进入 →</span>
 *   </div>
 *
 * 说明：
 *  - id 必须保留，主页样式表用 #mod-science / #mod-game / #mod-quiz 定位三块热区；
 *  - 原版通过 JS 给 .module 补了 tabindex/role="button"，这里改用原生 <Link>，
 *    键盘可聚焦、回车即可跳转，视觉表现不变。
 */
export default function ModuleCard({ id, tag, hint, title, to }) {
  return (
    <Link className="module" id={id} to={to} title={title} aria-label={tag}>
      <span className="tag">{tag}</span>
      <span className="hint">{hint}</span>
    </Link>
  )
}

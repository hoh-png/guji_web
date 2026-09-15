import { Link } from 'react-router-dom'

/**
 * 子页面通用外壳。
 *
 * 对应原 pages/*.html 中完全相同的这段结构：
 *   <div class="sub-page">
 *     <div class="wrap">
 *       <h1>标题</h1>
 *       <div class="card"><h2>…</h2><p>/<ul>…</p></ul></div>
 *       <a class="btn-back" href="../index.html">返回主页</a>
 *     </div>
 *   </div>
 *
 * 三个子页面只差内容，因此把外壳抽成组件。
 * 样式由 src/styles/subpage.css 提供，已在 src/main.jsx 中全局引入；
 * 注意这里必须用原始类名 .sub-page，不能走 CSS Modules（会被改名导致样式失效）。
 *
 * @param {object}   props
 * @param {string}   props.heading  页面大标题
 * @param {Array}    props.cards    卡片数据（见 src/data/*Content.js）
 * @param {string}   props.backTo   「返回主页」的目标路由
 */
export default function SubPageLayout({ heading, cards, backTo }) {
  return (
    <div className="sub-page">
      <div className="wrap">
        <h1>{heading}</h1>

        {cards.map((card) => (
          <div className="card" key={card.id}>
            <h2>{card.title}</h2>
            {card.blocks.map((block, index) =>
              block.type === 'list' ? (
                <ul key={`${card.id}-list-${index}`}>
                  {block.items.map((item, itemIndex) => (
                    <li key={`${card.id}-item-${itemIndex}`}>
                      {item.lead ? <strong>{item.lead}</strong> : null}
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={`${card.id}-p-${index}`}>{block.text}</p>
              ),
            )}
          </div>
        ))}

        <Link className="btn-back" to={backTo}>
          返回主页
        </Link>
      </div>
    </div>
  )
}

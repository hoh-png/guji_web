import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes.js'

/**
 * 子页面通用外壳。
 *
 * 结构：
 *   <div class="sub-page">
 *     <div class="wrap">
 *       <h1>标题</h1>
 *       <div class="card"><h2>…</h2> 段落 / 列表 / 跳转按钮 </div>
 *       <a class="btn-back">返回主页</a>
 *     </div>
 *   </div>
 *
 * 三个子页面只差内容，因此把外壳抽成组件。
 * 样式由 src/styles/subpage.css 提供，已在 src/main.jsx 中全局引入；
 * 注意这里必须用原始类名 .sub-page，不能走 CSS Modules（会被改名导致样式失效）。
 *
 * 卡片内容支持三种 block：
 *   { type: 'paragraph', text }
 *   { type: 'list', items: [{ lead?, text }] }
 *   { type: 'link-button', label, to }   // to 为 ROUTES 的键名
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
            {card.blocks.map((block, index) => {
              const key = `${card.id}-${index}`

              if (block.type === 'list') {
                return (
                  <ul key={key}>
                    {block.items.map((item, itemIndex) => (
                      <li key={`${key}-${itemIndex}`}>
                        {item.lead ? <strong>{item.lead}</strong> : null}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )
              }

              if (block.type === 'link-button') {
                return (
                  <Link className="btn-primary inline-cta" key={key} to={ROUTES[block.to] || block.to}>
                    {block.label}
                  </Link>
                )
              }

              return <p key={key}>{block.text}</p>
            })}
          </div>
        ))}

        <Link className="btn-back" to={backTo}>
          返回主页
        </Link>
      </div>
    </div>
  )
}

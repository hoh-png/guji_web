/**
 * 页面头部：左侧标题 + 说明，右侧放积分等状态。
 *
 * 复用 subpage.css 的 h1 字号与字距，仅去掉其下边框以便与右侧状态对齐。
 */
export default function MuseumHead({ title, subtitle, children }) {
  return (
    <div className="museum-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <div className="head-sub">{subtitle}</div> : null}
      </div>
      {children ? <div className="btn-row">{children}</div> : null}
    </div>
  )
}

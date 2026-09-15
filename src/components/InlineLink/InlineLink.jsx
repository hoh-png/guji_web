/**
 * 行内功能链接。
 *
 * 原版用 onclick 阻止默认跳转（href="#"）并执行提示逻辑，
 * 例如「忘记密码?」「立即申请修复师权限」。
 * 这里保持同样的视觉与行为：仍是带 .row-opt a / .apply-link a 样式的 <a>。
 */
export default function InlineLink({ onClick, children }) {
  return (
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault()
        onClick?.()
      }}
    >
      {children}
    </a>
  )
}

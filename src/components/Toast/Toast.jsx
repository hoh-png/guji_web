import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

/**
 * 提示浮层。
 *
 * 还原原版 js/main.js 中的 showToast()：
 *  - 写入文本并加上 .show 类；
 *  - 2200ms 后移除 .show 类（重复调用会重置计时器）。
 *
 * 通过 ref 暴露 show(msg) 方法，方便页面像调用普通函数一样使用。
 */
const Toast = forwardRef(function Toast(_props, ref) {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useImperativeHandle(ref, () => ({
    show(msg) {
      setMessage(msg)
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 2200)
    },
  }))

  return (
    <div className={visible ? 'toast show' : 'toast'} role="status" aria-live="polite">
      {message}
    </div>
  )
})

export default Toast

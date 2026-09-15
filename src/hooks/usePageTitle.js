import { useEffect } from 'react'

/**
 * 设置浏览器标签页标题。
 * 原版每个 HTML 都有自己的 <title>，React 是单页应用，因此用这个 Hook 逐个还原。
 */
export default function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}

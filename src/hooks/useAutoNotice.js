import { useEffect } from 'react'

/**
 * 提示浮层的自动消隐。
 *
 * PlayerContext 里的 notice 只负责「什么时候提示什么」，
 * 显示时长交给这里统一控制（2200ms，与登录页 Toast 一致）。
 */
const NOTICE_DURATION = 2200

export default function useAutoNotice(notice, clearNotice) {
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(clearNotice, NOTICE_DURATION)
    return () => clearTimeout(timer)
  }, [notice, clearNotice])
}

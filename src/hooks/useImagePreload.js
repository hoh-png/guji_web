import { useEffect, useRef } from 'react'

/**
 * 图片预加载 + 预解码。
 *
 * 只把图请求下来还不够：渲染时浏览器仍要解码，解码期间画面同样是空白，
 * 换场景时就会「闪一下」。所以这里在请求完成后调用 img.decode()，
 * 让图片提前变成可立即绘制的状态。
 *
 * 其余要点：
 *  - 去重：模块级 Set 记录已处理的地址，跨页面共享；
 *  - 并行度受限：默认同时 6 张，避免和首屏资源抢带宽；
 *  - 空闲启动：默认等浏览器空闲再开始，不阻塞首屏；
 *  - 失败忽略：预加载失败不影响功能，真正渲染时浏览器会再请求一次。
 */

/** 已经处理过（已请求或已解码）的地址 */
const done = new Set()

function loadOne(src) {
  return new Promise((resolve) => {
    if (!src || done.has(src)) {
      resolve()
      return
    }
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      // decode() 之后图片可直接绘制，渲染时不会再出现空白帧
      const mark = () => {
        done.add(src)
        resolve()
      }
      if (typeof img.decode === 'function') {
        img.decode().then(mark, mark)
      } else {
        mark()
      }
    }
    img.onerror = () => {
      done.add(src) // 失败的也标记，避免反复重试
      resolve()
    }
    img.src = src
  })
}

/**
 * 预热一批图片。
 *
 * @param {string[]} sources            图片地址列表
 * @param {object}   [options]
 * @param {boolean}  [options.immediate] true = 立刻开始（换装备等需要即时生效的场景）
 * @param {number}   [options.idleDelay] 空闲启动的额外延迟（毫秒）
 * @param {number}   [options.concurrency] 并发数，默认 6
 */
export default function useImagePreload(sources, { immediate = false, idleDelay = 200, concurrency = 6 } = {}) {
  const key = sources.join('|')
  const timerRef = useRef(null)

  useEffect(() => {
    const list = (key ? key.split('|') : []).filter(Boolean)
    if (!list.length) return undefined

    let cancelled = false
    let cursor = 0

    const worker = async () => {
      while (!cancelled && cursor < list.length) {
        const src = list[cursor]
        cursor += 1
        await loadOne(src)
      }
    }

    const start = () => {
      const lanes = Math.max(1, Math.min(concurrency, list.length))
      for (let i = 0; i < lanes; i += 1) worker()
    }

    const schedule = () => {
      // 让出一帧再开始，避免和当前渲染抢主线程
      timerRef.current = setTimeout(start, 0)
    }

    if (immediate) {
      schedule()
    } else if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(schedule, { timeout: 1500 })
    } else {
      timerRef.current = setTimeout(schedule, idleDelay)
    }

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, immediate, idleDelay, concurrency])
}

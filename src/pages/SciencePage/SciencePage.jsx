import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SCIENCE_ENTRIES, SCIENCE_HEADING } from '../../data/scienceContent.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import '../../styles/paper.css'

/**
 * 智慧科普。
 *
 * 版式：一张画好边框的卷轴纸铺底（public/images/science/science-bg.jpg），
 * 纸面上分左右两栏 ——
 *   左栏：目录，列出全部小节，固定不动
 *   右栏：正文，可上下滚动；点左栏标题跳转到对应小节
 * 滚动正文时，左栏自动高亮当前小节（文档站 / 飞书文档的常见做法）。
 *
 * 背景不动、只有右栏滚动：滚动容器只套在正文上，纸面本体不参与滚动。
 */

/** 背景图原始尺寸，用于换算纸面内的百分比定位 */
const PAPER_RATIO = 2073 / 1280

/**
 * 纸面内的定位（百分比，照着背景的图形留白量得）：
 *   标题横幅 —— 顶部那道空白卷轴
 *   目录栏   —— 左侧白边之内
 *   正文栏   —— 中部大幅空白纸面
 */
const LAYOUT = {
  back: { left: 2.9, top: 6.1 },
  titleBar: { left: 21, top: 5.6, width: 58, height: 6.2 },
  nav: { left: 12.5, top: 17, width: 18, height: 61 },
  content: { left: 32, top: 17, width: 55.5, height: 61 },
}

export default function SciencePage() {
  usePageTitle('智慧科普 · 古迹修复系统')

  const navigate = useNavigate()
  const contentRef = useRef(null)
  const sectionRefs = useRef({})
  const [activeId, setActiveId] = useState(SCIENCE_ENTRIES[0]?.id || null)

  const entries = useMemo(() => SCIENCE_ENTRIES, [])

  /** 点目录：把对应小节滚到正文区顶部 */
  const jumpTo = useCallback((id) => {
    const box = contentRef.current
    const target = sectionRefs.current[id]
    if (!box || !target) return
    box.scrollTo({ top: target.offsetTop - box.offsetTop, behavior: 'smooth' })
    setActiveId(id)
  }, [])

  /**
   * 滚动正文时算出当前小节：取「顶部已越过正文区上沿」的最后一节。
   * 用 offsetTop 直接算，比 IntersectionObserver 在嵌套滚动容器里更稳。
   */
  const handleScroll = useCallback(() => {
    const box = contentRef.current
    if (!box) return
    const line = box.scrollTop + box.clientHeight * 0.25
    let current = entries[0]?.id || null
    for (const entry of entries) {
      const el = sectionRefs.current[entry.id]
      if (!el) continue
      if (el.offsetTop - box.offsetTop <= line) current = entry.id
    }
    setActiveId(current)
  }, [entries])

  /* 打开页面时若 URL 带了 #id，直接定位到那一节 */
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && sectionRefs.current[hash]) {
      jumpTo(hash)
    }
    // 只在首次挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="paper-scene">
      <div className="paper-sheet" style={{ aspectRatio: PAPER_RATIO }}>
        <img className="paper-bg" src="/images/science/science-bg.jpg" alt="" draggable="false" />

        {/* 左上角：返回首页。
            外观完全由这张图决定（棕色圆底 + 箭头），CSS 只管位置与大小，
            悬浮 / 按下时用 brightness 做深浅反馈。 */}
        <button
          type="button"
          className="paper-back"
          style={{ left: `${LAYOUT.back.left}%`, top: `${LAYOUT.back.top}%` }}
          onClick={() => navigate(ROUTES.HOME)}
          aria-label="返回主页"
          title="返回主页"
        >
          <img src="/images/science/back.png" alt="" draggable="false" />
        </button>

        {/* 顶部卷轴横幅：页面标题 */}
        <div
          className="paper-title-bar"
          style={{
            left: `${LAYOUT.titleBar.left}%`,
            top: `${LAYOUT.titleBar.top}%`,
            width: `${LAYOUT.titleBar.width}%`,
            height: `${LAYOUT.titleBar.height}%`,
          }}
        >
          <h1>{SCIENCE_HEADING}</h1>
        </div>

        {/* 左栏：目录（固定不动） */}
        <nav
          className="paper-nav"
          style={{
            left: `${LAYOUT.nav.left}%`,
            top: `${LAYOUT.nav.top}%`,
            width: `${LAYOUT.nav.width}%`,
            height: `${LAYOUT.nav.height}%`,
          }}
          aria-label="科普目录"
        >
          {entries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`paper-nav-item${activeId === entry.id ? ' on' : ''}${
                entry.section === '拓展' ? ' is-extra' : ''
              }`}
              onClick={() => jumpTo(entry.id)}
              title={entry.title}
            >
              {entry.title}
            </button>
          ))}
        </nav>

        {/* 右栏：正文（只有它滚动） */}
        <div
          className="paper-content"
          ref={contentRef}
          onScroll={handleScroll}
          style={{
            left: `${LAYOUT.content.left}%`,
            top: `${LAYOUT.content.top}%`,
            width: `${LAYOUT.content.width}%`,
            height: `${LAYOUT.content.height}%`,
          }}
        >
          {entries.map((entry) => (
            <section
              className="paper-section"
              key={entry.id}
              id={entry.id}
              ref={(el) => {
                sectionRefs.current[entry.id] = el
              }}
            >
              {entry.section ? <p className="paper-section-tag">{entry.section}</p> : null}
              <h2>{entry.title}</h2>
              {entry.subtitle ? <p className="paper-subtitle">{entry.subtitle}</p> : null}

              {entry.blocks.map((block, index) => {
                const key = `${entry.id}-${index}`

                if (block.type === 'list') {
                  return (
                    <ul key={key} className="paper-list">
                      {block.items.map((item, i) => (
                        <li key={`${key}-${i}`}>
                          {item.lead ? <strong>{item.lead}</strong> : null}
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  )
                }

                if (block.type === 'note') {
                  return (
                    <p className="paper-note" key={key}>
                      {block.text}
                    </p>
                  )
                }

                return (
                  <p className="paper-paragraph" key={key}>
                    {block.text}
                  </p>
                )
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

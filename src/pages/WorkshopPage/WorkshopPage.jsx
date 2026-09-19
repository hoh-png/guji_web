import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../../context/PlayerContext.jsx'
import CurrencyChip from '../../components/museum/CurrencyChip.jsx'
import { DESKS, VENUES, getDeskById, getToolById, getVenueById, sortToolsBySlot } from '../../data/props.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import useAutoNotice from '../../hooks/useAutoNotice.js'
import useImagePreload from '../../hooks/useImagePreload.js'
import { ROUTES } from '../../constants/routes.js'
import './WorkshopPage.css'

/*
 * 各类工具占「工具排」宽度的百分比，按器物实际体量给出比例关系。
 * 用百分比而非固定像素，整排工具会随桌子大小等比缩放，永远保持一行不换行。
 */
const TOOL_WIDTH_RATIO = {
  hammer: 0.13,
  'heat-gun': 0.13,
  'soldering-iron': 0.13,
  mat: 0.14,
  dropper: 0.1,
  scalpel: 0.1,
  tweezers: 0.1,
  'needle-awl': 0.09,
}

const DEFAULT_TOOL_RATIO = 0.11

/* 键盘微调步长（像素） */
const NUDGE_STEP = 6
const NUDGE_STEP_LARGE = 24

/**
 * 工具精灵。
 *
 * 拖动规则：按住可拖动，松手回到原位——拖动只作用于图片本身，
 * 工具名称留在原位不动，因此一眼能看出每个工具原本在哪。
 *
 * 实现要点：
 *  - 位移直接写在被拖的 <img> 的 style.transform 上，走 DOM 不走 React state，
 *    因此拖动过程中不会触发整棵树重渲染；
 *  - 松手时把 transform 清空，配合 CSS 的 transition 自然弹回原位；
 *  - 指针事件绑定在图片上，所以「按住图片」才拖动，点名称不会误触。
 */
function ToolSprite({ tool, selected, onSelect }) {
  const imageRef = useRef(null)
  const dragRef = useRef({ pointerId: null, startX: 0, startY: 0 })

  const ratio = TOOL_WIDTH_RATIO[tool.groupId] || DEFAULT_TOOL_RATIO

  const applyOffset = (dx, dy) => {
    const image = imageRef.current
    if (image) image.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
  }

  const endDrag = (event) => {
    if (dragRef.current.pointerId === null) return
    dragRef.current.pointerId = null
    applyOffset(0, 0) // 回原位
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handlePointerDown(event) {
    // 只响应主键拖动
    if (event.button !== undefined && event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY }
    onSelect(tool.id)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  function handlePointerMove(event) {
    if (dragRef.current.pointerId !== event.pointerId) return
    applyOffset(event.clientX - dragRef.current.startX, event.clientY - dragRef.current.startY)
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
    const moves = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const delta = moves[event.key]
    if (!delta) return
    event.preventDefault()
    onSelect(tool.id)
    applyOffset(delta[0], delta[1])
  }

  const endKeyNudge = () => applyOffset(0, 0)

  return (
    <div
      className={`tool-sprite${selected ? ' is-selected' : ''}`}
      style={{ width: `${ratio * 100}%` }}
      role="button"
      tabIndex={0}
      aria-label={`${tool.name}：按住可拖动，松手回到原位；方向键可微调`}
      data-tool-id={tool.id}
      onFocus={() => onSelect(tool.id)}
      onBlur={endKeyNudge}
      onKeyDown={handleKeyDown}
      onKeyUp={endKeyNudge}
    >
      <img
        ref={imageRef}
        className="tool-image"
        src={tool.image}
        alt={tool.name}
        draggable="false"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      />
      <span className="tool-name">{tool.name}</span>
    </div>
  )
}

/**
 * 修复文物（工坊页）。
 *
 * 组成：场所铺满背景 + 桌面居中作操作台 + 修复工具按住可拖动。
 * 工具来源是商店里兑换并「设为使用」的那些。
 * 文物图片尚未提供，中央先放占位区；各工具与文物的交互逻辑待文物素材到位后再接。
 */
export default function WorkshopPage() {
  usePageTitle('修复文物 · 古迹修复系统')

  const { state, notice, clearNotice } = usePlayer()
  const [selectedId, setSelectedId] = useState(null)

  useAutoNotice(notice, clearNotice)

  /*
   * 按固定槽位排序，而不是按 equippedToolIds 的数组顺序：
   * 同类工具共用一个槽位，换成更高级的那件后仍然停在原位，不会跑到末尾。
   */
  const equippedTools = useMemo(
    () => sortToolsBySlot(state.equippedToolIds.map((id) => getToolById(id)).filter(Boolean)),
    [state.equippedToolIds],
  )

  const venue = getVenueById(state.equippedVenueId) || VENUES[0]
  const desk = getDeskById(state.equippedDeskId) || DESKS[0]
  // 桌子宽度随品质递增；数值按「与场所背景里的工作台大小相称」来定
  const deskWidth = { 1: 600, 2: 680, 3: 760 }[desk.tier] || 600

  /*
   * 换场所 / 换桌子 / 换装备时立即预热对应图片。
   * 这几张都是整屏或大幅画面，等渲染时才请求会明显闪一下。
   */
  useImagePreload(
    [venue.image, desk.image, ...equippedTools.map((t) => t.image)],
    { immediate: true },
  )

  return (
    <div className="workshop">
      {/* 顶部信息条 */}
      <header className="workshop-head">
        <div className="workshop-title">
          <h1>修复文物</h1>
          <span className="workshop-loc">
            {venue.name} · {desk.name}
          </span>
        </div>
        <div className="workshop-actions">
          {/* 操作提示：原来是舞台底部的一条浮层，会压到背景下方杂乱的箱子与地面 */}
          <span className="workshop-tip">
            {selectedId
              ? `已选中「${getToolById(selectedId)?.name}」：按住道具拖动可临时挪动，松手自动回到原位`
              : '按住道具拖动可临时挪动，松手自动回到原位'}
          </span>
          <CurrencyChip kind="copper" value={state.copper} />
          <CurrencyChip kind="ingot" value={state.ingot} />
          <Link className="btn-ghost" to={ROUTES.SHOP} state={{ from: ROUTES.WORKSHOP }}>
            道具商店
          </Link>
          <Link className="btn-ghost" to={ROUTES.HOME}>
            返回主页
          </Link>
        </div>
      </header>

      {/* 操作舞台：场所做背景，桌面居中，工具摆在台面上 */}
      <div className="workshop-stage">
        <img className="stage-venue" src={venue.image} alt={`${venue.name}场景`} draggable="false" />

        <img
          className="stage-desk"
          src={desk.image}
          alt={desk.name}
          draggable="false"
          style={{ width: deskWidth }}
        />

        {/* 文物占位区：素材到位后替换为真实文物与修复交互 */}
        <div className="artifact-slot">
          <div className="artifact-inner">
            <span className="artifact-label">文物待修复</span>
            <span className="artifact-note">文物素材准备中</span>
          </div>
        </div>

        {/* 摆在操作台上的工具：按住图片可拖动，松手回到原位 */}
        <div className="tool-tray">
          {equippedTools.length ? (
            equippedTools.map((tool) => (
              <ToolSprite key={tool.id} tool={tool} selected={selectedId === tool.id} onSelect={setSelectedId} />
            ))
          ) : (
            <p className="tray-empty">
              还没有可用的工具，
              <Link to={ROUTES.SHOP} state={{ from: ROUTES.WORKSHOP }}>
                去道具商店
              </Link>
              兑换并「设为使用」后，就会摆到这里
            </p>
          )}
        </div>
      </div>

      <div className={`toast${notice ? ' show' : ''}`} role="status" aria-live="polite">
        {notice ? notice.text : ''}
      </div>
    </div>
  )
}

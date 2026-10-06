import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  PURCHASE_RESULT,
  addCurrency,
  advanceRelicProgress,
  buyCopperWithIngot,
  buyIngotWithCopper,
  clearPlayerState,
  createInitialState,
  equipDesk,
  equipRelic,
  equipVenue,
  purchaseDesk,
  purchaseRelic,
  purchaseTool,
  purchaseVenue,
  readPlayerState,
  resetRelicProgress,
  toggleEquipTool,
  updateProfile,
  writePlayerState,
} from '../utils/playerStorage.js'
import { getRelicById } from '../data/relics.js'

const PlayerContext = createContext(null)

/**
 * 玩家状态容器。
 *
 * 目前状态保存在浏览器 localStorage（见 utils/playerStorage.js），
 * 接入后端后只需替换该模块的读写实现，本组件与页面都不用改。
 */
export function PlayerProvider({ children }) {
  const [state, setState] = useState(() => readPlayerState())
  const [notice, setNotice] = useState(null)

  // 状态变化即落盘
  useEffect(() => {
    writePlayerState(state)
  }, [state])

  const showNotice = useCallback((text, tone = 'info') => {
    setNotice({ text, tone, at: Date.now() })
  }, [])

  const clearNotice = useCallback(() => setNotice(null), [])

  /** 统一的购买处理：把纯逻辑的结果翻译成提示语 */
  const buy = useCallback(
    (kind, id) => {
      setState((prev) => {
        const fn = kind === 'tool' ? purchaseTool : kind === 'venue' ? purchaseVenue : purchaseDesk
        const { state: next, result } = fn(prev, id)

        switch (result) {
          case PURCHASE_RESULT.OK:
            showNotice('兑换成功，已加入你的工具箱', 'success')
            return next
          case PURCHASE_RESULT.ALREADY_OWNED:
            showNotice('这件道具已经在你的工具箱里了', 'info')
            return prev
          case PURCHASE_RESULT.NOT_ENOUGH_POINTS:
            showNotice(
              kind === 'tool' ? '铜钱不足，先去「知识挑战」答题赚铜钱吧' : '铜钱不足，可在商店用元宝兑换',
              'error',
            )
            return prev
          default:
            showNotice('道具不存在', 'error')
            return prev
        }
      })
    },
    [showNotice],
  )

  const value = useMemo(
    () => ({
      state,
      notice,
      clearNotice,
      showNotice,
      buyTool: (id) => buy('tool', id),
      buyVenue: (id) => buy('venue', id),
      buyDesk: (id) => buy('desk', id),
      /** 购买文物：扣元宝，买下即入馆藏 */
      buyRelic: (id) => {
        setState((prev) => {
          const { state: next, result } = purchaseRelic(prev, id)
          switch (result) {
            case PURCHASE_RESULT.OK:
              showNotice('珍藏成功，已收入馆藏', 'success')
              return next
            case PURCHASE_RESULT.ALREADY_OWNED:
              showNotice('这件文物已在你的馆藏中', 'info')
              return prev
            case PURCHASE_RESULT.NOT_ENOUGH_POINTS:
              showNotice('元宝不足，可在商店用铜钱兑换元宝', 'error')
              return prev
            default:
              showNotice('文物不存在', 'error')
              return prev
          }
        })
      },
      /**
       * 把工具设为使用中。
       * 同类工具是升级关系，装备新的一件会自动换下同类的旧的一件。
       */
      equipTool: (id) => setState((prev) => toggleEquipTool(prev, id)),
      selectVenue: (id) => setState((prev) => equipVenue(prev, id)),
      selectDesk: (id) => setState((prev) => equipDesk(prev, id)),

      /** 把某件已拥有的文物设为「工坊里正在修复的」 */
      equipRelic: (id) => {
        setState((prev) => equipRelic(prev, id))
        const relic = getRelicById(id)
        if (relic) showNotice(`已切换到「${relic.name}」，继续上次的进度`, 'info')
      },
      /** 记录一次成功的修复工序（进度按文物分别保存） */
      advanceStep: (id) => setState((prev) => advanceRelicProgress(prev, id)),
      /** 重置某件文物的修复进度 */
      resetRelic: (id) => {
        setState((prev) => resetRelicProgress(prev, id))
        showNotice('已回到出土状态，可重新修复', 'info')
      },
      /**
       * 货币兑换。
       * kind='ingot'：花 price 铜钱换 amount 元宝
       * kind='copper'：花 price 元宝换 amount 铜钱
       */
      exchange: (kind, amount, price) => {
        setState((prev) => {
          const fn = kind === 'ingot' ? buyIngotWithCopper : buyCopperWithIngot
          const { state: next, result } = fn(prev, amount, price)
          if (result === PURCHASE_RESULT.OK) {
            showNotice(kind === 'ingot' ? `兑换成功，获得 ${amount} 元宝` : `兑换成功，获得 ${amount} 铜钱`, 'success')
            return next
          }
          showNotice(kind === 'ingot' ? '铜钱不足，无法兑换' : '元宝不足，无法兑换', 'error')
          return prev
        })
      },
      saveProfile: (patch) => {
        setState((prev) => updateProfile(prev, patch))
        showNotice('资料已保存', 'success')
      },
      /** 发放货币：答题奖励与演示按钮都走这里 */
      gainCurrency: (key, amount) => {
        setState((prev) => addCurrency(prev, key, amount))
        showNotice(key === 'ingot' ? `获得 ${amount} 元宝` : `获得 ${amount} 铜钱`, 'success')
      },
      resetAll: () => {
        clearPlayerState()
        setState(createInitialState())
        showNotice('已重置为初始状态', 'info')
      },
    }),
    [state, notice, clearNotice, showNotice, buy],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer 必须在 <PlayerProvider> 内部使用')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearPlayerState,
  createInitialState,
  readPlayerState,
  writePlayerState,
} from '../utils/playerStorage.js'
import {
  advancePlayerRestoration,
  exchangePlayerCurrency,
  getPlayerState,
  grantDevelopmentCurrency,
  purchasePlayerItem,
  resetPlayerRestoration,
  resetDevelopmentPlayer,
  updatePlayerLoadout,
  updatePlayerProfile,
} from '../api/playerApi.js'
import { getRelicById } from '../data/relics.js'

const PlayerContext = createContext(null)

function mergeServerState(current, data) {
  return {
    ...current,
    ...(data.profile ? { profile: { ...current.profile, ...data.profile } } : {}),
    copper: data.wallet?.coins ?? current.copper,
    ingot: data.wallet?.ingots ?? current.ingot,
    ownedToolIds: data.ownedToolIds ?? current.ownedToolIds,
    ownedVenueIds: data.ownedVenueIds ?? current.ownedVenueIds,
    ownedDeskIds: data.ownedDeskIds ?? current.ownedDeskIds,
    ownedRelicIds: data.ownedRelicIds ?? current.ownedRelicIds,
    equippedToolIds: data.equippedToolIds ?? current.equippedToolIds,
    equippedVenueId: data.equippedVenueId ?? current.equippedVenueId,
    equippedDeskId: data.equippedDeskId ?? current.equippedDeskId,
    equippedRelicId: data.equippedRelicId === undefined
      ? current.equippedRelicId
      : data.equippedRelicId,
    relicProgress: data.relicProgress ?? current.relicProgress,
  }
}

/**
 * 玩家状态容器。
 *
 * 钱包、商店所有权、个人资料、装备选择与修复进度均由后端保存；
 * localStorage 只作为首次渲染时的临时缓存。
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

  const syncPlayer = useCallback(async () => {
    const result = await getPlayerState()
    if (result.ok && result.data) {
      setState((current) => mergeServerState(current, result.data))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    syncPlayer()
    window.addEventListener('guji-auth-changed', syncPlayer)
    return () => window.removeEventListener('guji-auth-changed', syncPlayer)
  }, [syncPlayer])

  /** 统一的购买处理：把纯逻辑的结果翻译成提示语 */
  const buy = useCallback(
    async (kind, id) => {
      const result = await purchasePlayerItem(kind, id)
      if (result.ok && result.data) {
        setState((current) => mergeServerState(current, result.data))
        await syncPlayer()
        showNotice(kind === 'relic' ? '珍藏成功，已收入馆藏' : '兑换成功，已加入你的工具箱', 'success')
        return true
      }

      if (result.code === 'ALREADY_OWNED') {
        showNotice(kind === 'relic' ? '这件文物已在你的馆藏中' : '这件道具已经在你的工具箱里了', 'info')
      } else if (result.code === 'INSUFFICIENT_COINS') {
        showNotice('铜钱不足，可在商店用元宝兑换', 'error')
      } else if (result.code === 'INSUFFICIENT_INGOTS') {
        showNotice('元宝不足，可在商店用铜钱兑换元宝', 'error')
      } else if (result.status === 401) {
        showNotice('登录状态已失效，请重新登录', 'error')
      } else {
        showNotice(result.message || '购买失败，请稍后重试', 'error')
      }
      return false
    },
    [showNotice, syncPlayer],
  )

  const saveLoadout = useCallback(
    async (kind, itemId) => {
      const result = await updatePlayerLoadout(kind, itemId)
      if (result.ok && result.data) {
        setState((current) => mergeServerState(current, result.data))
        return true
      }
      showNotice(result.message || '装备状态保存失败，请稍后重试', 'error')
      return false
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
      buyRelic: (id) => buy('relic', id),
      /**
       * 把工具设为使用中。
       * 同类工具是升级关系，装备新的一件会自动换下同类的旧的一件。
       */
      equipTool: (id) => saveLoadout('tool', id),
      selectVenue: (id) => saveLoadout('venue', id),
      selectDesk: (id) => saveLoadout('desk', id),

      /** 把某件已拥有的文物设为「工坊里正在修复的」 */
      equipRelic: async (id) => {
        const saved = await saveLoadout('relic', id)
        const relic = getRelicById(id)
        if (saved && relic) showNotice(`已切换到「${relic.name}」，继续上次的进度`, 'info')
      },
      /** 记录一次成功的修复工序（进度按文物分别保存） */
      advanceStep: async (id, toolId) => {
        const result = await advancePlayerRestoration(id, toolId)
        if (!result.ok || !result.data) {
          showNotice(result.message || '修复进度保存失败，请稍后重试', 'error')
          return null
        }
        setState((current) => ({
          ...current,
          relicProgress: {
            ...(current.relicProgress || {}),
            [id]: result.data.completedSteps,
          },
        }))
        return result.data
      },
      /** 重置某件文物的修复进度 */
      resetRelic: async (id) => {
        const result = await resetPlayerRestoration(id)
        if (!result.ok || !result.data) {
          showNotice(result.message || '重置修复进度失败', 'error')
          return
        }
        setState((current) => ({
          ...current,
          relicProgress: { ...(current.relicProgress || {}), [id]: 0 },
        }))
        showNotice('已回到出土状态，可重新修复', 'info')
      },
      /**
       * 货币兑换。
       * kind='ingot'：花 price 铜钱换 amount 元宝
       * kind='copper'：花 price 元宝换 amount 铜钱
       */
      exchange: async (kind, amount) => {
        const result = await exchangePlayerCurrency(kind, amount)
        if (result.ok && result.data?.wallet) {
          setState((current) => ({
            ...current,
            copper: result.data.wallet.coins,
            ingot: result.data.wallet.ingots,
          }))
          showNotice(kind === 'ingot' ? `兑换成功，获得 ${amount} 元宝` : `兑换成功，获得 ${amount} 铜钱`, 'success')
          return
        }
        showNotice(
          result.message || (kind === 'ingot' ? '铜钱不足，无法兑换' : '元宝不足，无法兑换'),
          'error',
        )
      },
      saveProfile: async (patch) => {
        const result = await updatePlayerProfile(patch)
        if (result.ok && result.data) {
          setState((current) => mergeServerState(current, result.data))
          showNotice('资料已保存', 'success')
        } else {
          showNotice(result.message || '资料保存失败，请稍后重试', 'error')
        }
      },
      /** 发放货币：答题奖励与演示按钮都走这里 */
      gainCurrency: async (key, amount) => {
        const result = await grantDevelopmentCurrency(key, amount)
        if (result.ok && result.data?.wallet) {
          setState((current) => ({
            ...current,
            copper: result.data.wallet.coins,
            ingot: result.data.wallet.ingots,
          }))
          showNotice(key === 'ingot' ? `获得 ${amount} 元宝` : `获得 ${amount} 铜钱`, 'success')
        } else {
          showNotice(result.message || '演示货币发放失败', 'error')
        }
      },
      resetAll: async () => {
        const result = await resetDevelopmentPlayer()
        if (result.ok && result.data) {
          clearPlayerState()
          setState(mergeServerState(createInitialState(), result.data))
          showNotice('已重置为初始状态', 'info')
        } else {
          showNotice(result.message || '重置失败，请稍后重试', 'error')
        }
      },
      syncPlayer,
    }),
    [state, notice, clearNotice, showNotice, buy, saveLoadout, syncPlayer],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer 必须在 <PlayerProvider> 内部使用')
  return ctx
}

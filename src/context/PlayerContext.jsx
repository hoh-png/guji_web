import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearPlayerState,
  createInitialState,
  equipDesk,
  equipVenue,
  readPlayerState,
  toggleEquipTool,
  updateProfile,
  writePlayerState,
} from '../utils/playerStorage.js'
import {
  exchangePlayerCurrency,
  getPlayerState,
  grantDevelopmentCurrency,
  purchasePlayerItem,
  resetDevelopmentPlayer,
} from '../api/playerApi.js'

const PlayerContext = createContext(null)

function mergeServerState(current, data) {
  const ownedToolIds = data.ownedToolIds || []
  const ownedVenueIds = data.ownedVenueIds || []
  const ownedDeskIds = data.ownedDeskIds || []

  return {
    ...current,
    copper: data.wallet?.coins ?? current.copper,
    ingot: data.wallet?.ingots ?? current.ingot,
    ownedToolIds,
    ownedVenueIds,
    ownedDeskIds,
    equippedToolIds: current.equippedToolIds.filter((id) => ownedToolIds.includes(id)),
    equippedVenueId: ownedVenueIds.includes(current.equippedVenueId)
      ? current.equippedVenueId
      : ownedVenueIds[0],
    equippedDeskId: ownedDeskIds.includes(current.equippedDeskId)
      ? current.equippedDeskId
      : ownedDeskIds[0],
  }
}

/**
 * 玩家状态容器。
 *
 * 钱包与商店所有权由后端保存；个人资料和装备选择仍保存在浏览器，
 * 因此现有页面组件不需要感知数据来源差异。
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
        showNotice('兑换成功，已加入你的工具箱', 'success')
        return
      }

      if (result.code === 'ALREADY_OWNED') {
        showNotice('这件道具已经在你的工具箱里了', 'info')
      } else if (result.code === 'INSUFFICIENT_COINS') {
        showNotice('铜钱不足，可在商店用元宝兑换', 'error')
      } else if (result.status === 401) {
        showNotice('登录状态已失效，请重新登录', 'error')
      } else {
        showNotice(result.message || '购买失败，请稍后重试', 'error')
      }
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
      /**
       * 把工具设为使用中。
       * 同类工具是升级关系，装备新的一件会自动换下同类的旧的一件。
       */
      equipTool: (id) => setState((prev) => toggleEquipTool(prev, id)),
      selectVenue: (id) => setState((prev) => equipVenue(prev, id)),
      selectDesk: (id) => setState((prev) => equipDesk(prev, id)),
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
      saveProfile: (patch) => {
        setState((prev) => updateProfile(prev, patch))
        showNotice('资料已保存', 'success')
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
    [state, notice, clearNotice, showNotice, buy, syncPlayer],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer 必须在 <PlayerProvider> 内部使用')
  return ctx
}

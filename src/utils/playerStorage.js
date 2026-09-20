/**
 * 玩家偏好与界面状态的本地持久化。
 *
 * 钱包余额和已购道具由后端负责，PlayerContext 会在登录后用服务器数据覆盖这里的缓存；
 * localStorage 继续保存个人资料、装备选择，并作为页面首次渲染时的临时缓存。
 */
import {
  DEFAULT_DESK_ID,
  DEFAULT_VENUE_ID,
  STARTER_DESK_IDS,
  STARTER_TOOL_IDS,
  STARTER_VENUE_IDS,
  getToolById,
  getVenueById,
  getDeskById,
} from '../data/props.js'

const STORAGE_KEY = 'guji-web:player-preferences:v2'
const LEGACY_STORAGE_KEY = 'guji-web:player-state:v1'

/** 头像可选方案（水彩风配色，与页面国风色调一致） */
export const AVATAR_OPTIONS = [
  { id: 'avatar-ink', name: '墨色', color: '#3d2b1f', accent: '#b8924f' },
  { id: 'avatar-brick', name: '朱砂', color: '#a8321f', accent: '#f3e9d2' },
  { id: 'avatar-gold', name: '描金', color: '#b8924f', accent: '#3d2b1f' },
  { id: 'avatar-jade', name: '青瓷', color: '#5c7d6f', accent: '#f3e9d2' },
  { id: 'avatar-clay', name: '陶土', color: '#9c6b4a', accent: '#f3e9d2' },
  { id: 'avatar-indigo', name: '靛蓝', color: '#3f5670', accent: '#f3e9d2' },
]

/** 初始状态：铜钱与元宝从 0 开始，低级工具/场所/工作台默认拥有 */
export function createInitialState() {
  return {
    version: 2,
    profile: {
      nickname: '修复师',
      title: '见习修复师',
      bio: '',
      avatarId: AVATAR_OPTIONS[0].id,
    },
    copper: 0, // 铜钱：购买道具、场所、工作台
    ingot: 0, // 元宝：购买文物，也可与铜钱互相兑换
    ownedToolIds: [...STARTER_TOOL_IDS],
    ownedVenueIds: [...STARTER_VENUE_IDS],
    ownedDeskIds: [...STARTER_DESK_IDS],
    equippedToolIds: [...STARTER_TOOL_IDS],
    equippedVenueId: DEFAULT_VENUE_ID,
    equippedDeskId: DEFAULT_DESK_ID,
    createdAt: new Date().toISOString(),
  }
}

/** 只读取本地偏好；旧 v1 数据仅迁移资料与装备字段，不迁移货币或所有权。 */
export function readPlayerState() {
  if (typeof window === 'undefined' || !window.localStorage) return createInitialState()
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    const legacy = current ? null : window.localStorage.getItem(LEGACY_STORAGE_KEY)
    const raw = current || legacy
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw)
    const state = mergeWithDefaults(parsed)
    if (legacy) window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    return state
  } catch {
    return createInitialState()
  }
}

/** 钱包与所有权绝不写入 localStorage，只保存设备本地偏好。 */
export function writePlayerState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      profile: state.profile,
      equippedToolIds: state.equippedToolIds,
      equippedVenueId: state.equippedVenueId,
      equippedDeskId: state.equippedDeskId,
      createdAt: state.createdAt,
    }))
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* 隐私模式下写入失败时静默忽略，功能仍可在内存中工作 */
  }
}

/** 清空本地存档（个人中心提供「重置演示数据」） */
export function clearPlayerState() {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 用初始状态补齐缺失字段，兼容旧存档 */
function mergeWithDefaults(raw) {
  const base = createInitialState()
  if (!raw || typeof raw !== 'object') return base

  const equippedToolIds = keepOnePerGroup(normalizeIds(raw.equippedToolIds, base.equippedToolIds))
    .filter((id) => getToolById(id))

  return {
    ...base,
    version: 2,
    profile: { ...base.profile, ...(raw.profile || {}) },
    equippedToolIds: equippedToolIds.length ? equippedToolIds : [...base.equippedToolIds],
    equippedVenueId: getVenueById(raw.equippedVenueId) ? raw.equippedVenueId : base.equippedVenueId,
    equippedDeskId: getDeskById(raw.equippedDeskId) ? raw.equippedDeskId : base.equippedDeskId,
    createdAt: raw.createdAt || base.createdAt,
  }
}

function normalizeIds(value, fallback) {
  if (!Array.isArray(value)) return [...fallback]
  return [...new Set(value.filter((v) => typeof v === 'string'))]
}

/** 同类工具只保留最后一件，保证「同类只能有一件使用中」 */
function keepOnePerGroup(ids) {
  const byGroup = new Map()
  for (const id of ids) {
    const group = getToolById(id)?.groupId
    if (group) byGroup.set(group, id)
  }
  return [...byGroup.values()]
}

/**
 * 把工具设为「使用中」。
 *
 * 同类工具（如锤子的低级/中级/高级）是升级关系，不是并列关系，
 * 因此同类只能有一件处于使用中：装备新的一件时，自动把同类的旧的一件换下。
 * 已拥有但未使用的道具不会丢失，也无需重复购买。
 */
export function toggleEquipTool(state, toolId) {
  const tool = getToolById(toolId)
  if (!tool || !state.ownedToolIds.includes(toolId)) return state
  return {
    ...state,
    equippedToolIds: [...state.equippedToolIds.filter((id) => getToolById(id)?.groupId !== tool.groupId), toolId],
  }
}

/** 某类工具当前正在使用的那一件 */
export function getEquippedToolInGroup(state, groupId) {
  return state.equippedToolIds.find((id) => getToolById(id)?.groupId === groupId) || null
}

/** 切换当前场所（仅限已拥有） */
export function equipVenue(state, venueId) {
  if (!state.ownedVenueIds.includes(venueId)) return state
  return { ...state, equippedVenueId: venueId }
}

/** 切换当前工作台（仅限已拥有） */
export function equipDesk(state, deskId) {
  if (!state.ownedDeskIds.includes(deskId)) return state
  return { ...state, equippedDeskId: deskId }
}

/** 更新资料字段 */
export function updateProfile(state, patch) {
  return { ...state, profile: { ...state.profile, ...patch } }
}

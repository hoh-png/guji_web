/**
 * 玩家状态的本地持久化。
 *
 * 说明：当前后端尚未接入，玩家资料、货币、已购道具都保存在浏览器 localStorage 中，
 * 刷新页面不会丢失。接入后端后，把 readPlayerState / writePlayerState 换成接口调用即可，
 * 上层的 usePlayer() 与页面代码无需改动。
 */
import {
  DEFAULT_DESK_ID,
  DEFAULT_VENUE_ID,
  STARTER_DESK_IDS,
  STARTER_TOOL_IDS,
  STARTER_VENUE_IDS,
  SHOP_PRICES,
  VENUE_PRICES,
  getToolById,
  getVenueById,
  getDeskById,
} from '../data/props.js'

const STORAGE_KEY = 'guji-web:player-state:v1'

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
    version: 1,
    profile: {
      nickname: '修复师',
      title: '见习修复师',
      bio: '',
      avatarId: AVATAR_OPTIONS[0].id,
    },
    points: 0, // 旧字段：已由铜钱取代，仅保留以兼容旧存档
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

/** 读取玩家状态；数据损坏或缺失时回退到初始状态 */
export function readPlayerState() {
  if (typeof window === 'undefined' || !window.localStorage) return createInitialState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw)
    return mergeWithDefaults(parsed)
  } catch {
    return createInitialState()
  }
}

/** 写入玩家状态 */
export function writePlayerState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 隐私模式下写入失败时静默忽略，功能仍可在内存中工作 */
  }
}

/** 清空本地存档（个人中心提供「重置演示数据」） */
export function clearPlayerState() {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 用初始状态补齐缺失字段，兼容旧存档 */
function mergeWithDefaults(raw) {
  const base = createInitialState()
  if (!raw || typeof raw !== 'object') return base

  const ownedToolIds = normalizeIds(raw.ownedToolIds, base.ownedToolIds).filter((id) => getToolById(id))
  // 同类只能保留一件使用中：兼容旧存档里同类多件同时装备的情况
  const equippedToolIds = keepOnePerGroup(normalizeIds(raw.equippedToolIds, base.equippedToolIds)).filter((id) =>
    ownedToolIds.includes(id),
  )

  return {
    version: 1,
    profile: { ...base.profile, ...(raw.profile || {}) },
    points: Number.isFinite(raw.points) ? Math.max(0, Math.floor(raw.points)) : 0,
    copper: Number.isFinite(raw.copper) ? Math.max(0, Math.floor(raw.copper)) : 0,
    ingot: Number.isFinite(raw.ingot) ? Math.max(0, Math.floor(raw.ingot)) : 0,
    ownedToolIds,
    ownedVenueIds: normalizeIds(raw.ownedVenueIds, base.ownedVenueIds).filter((id) => getVenueById(id)),
    ownedDeskIds: normalizeIds(raw.ownedDeskIds, base.ownedDeskIds).filter((id) => getDeskById(id)),
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

/* ------------------------------ 纯逻辑（可单测） ------------------------------ */

/** 购买结果类型 */
export const PURCHASE_RESULT = {
  OK: 'ok',
  ALREADY_OWNED: 'already-owned',
  NOT_ENOUGH_POINTS: 'not-enough-points', // 货币不足（铜钱或元宝）
  NOT_FOUND: 'not-found',
}

function priceOfTool(tool) {
  return SHOP_PRICES[tool.tier] ?? 0
}

function priceOfVenue(venue) {
  return VENUE_PRICES[venue.tier] ?? 0
}

/** 购买工具：扣铜钱并登记所有权 */
export function purchaseTool(state, toolId) {
  const tool = getToolById(toolId)
  if (!tool) return { state, result: PURCHASE_RESULT.NOT_FOUND }
  if (state.ownedToolIds.includes(toolId)) return { state, result: PURCHASE_RESULT.ALREADY_OWNED }

  const price = priceOfTool(tool)
  if (state.copper < price) return { state, result: PURCHASE_RESULT.NOT_ENOUGH_POINTS }

  /*
   * 只登记所有权，不自动装备。
   * 同类工具是升级关系，若买完就自动装备，会和旧的同类工具同时处于「使用中」；
   * 装备与否交给玩家点「设为使用」决定，届时会顺带换下同类的旧工具。
   */
  return {
    state: {
      ...state,
      copper: state.copper - price,
      ownedToolIds: [...state.ownedToolIds, toolId],
    },
    result: PURCHASE_RESULT.OK,
  }
}

/** 购买场所：扣铜钱 */
export function purchaseVenue(state, venueId) {
  const venue = getVenueById(venueId)
  if (!venue) return { state, result: PURCHASE_RESULT.NOT_FOUND }
  if (state.ownedVenueIds.includes(venueId)) return { state, result: PURCHASE_RESULT.ALREADY_OWNED }

  const price = priceOfVenue(venue)
  if (state.copper < price) return { state, result: PURCHASE_RESULT.NOT_ENOUGH_POINTS }

  return {
    state: { ...state, copper: state.copper - price, ownedVenueIds: [...state.ownedVenueIds, venueId] },
    result: PURCHASE_RESULT.OK,
  }
}

/** 购买工作台：扣铜钱 */
export function purchaseDesk(state, deskId) {
  const desk = getDeskById(deskId)
  if (!desk) return { state, result: PURCHASE_RESULT.NOT_FOUND }
  if (state.ownedDeskIds.includes(deskId)) return { state, result: PURCHASE_RESULT.ALREADY_OWNED }

  const price = priceOfVenue(desk)
  if (state.copper < price) return { state, result: PURCHASE_RESULT.NOT_ENOUGH_POINTS }

  return {
    state: { ...state, copper: state.copper - price, ownedDeskIds: [...state.ownedDeskIds, deskId] },
    result: PURCHASE_RESULT.OK,
  }
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

/**
 * 增加积分
 * @deprecated 积分制已下线，改为铜钱与元宝。答题奖励请调用 addCurrency(state, 'copper', n)
 */
export function addPoints(state, amount) {
  return addCurrency(state, 'copper', amount)
}

/** 增加铜钱 / 元宝（答题奖励、演示按钮都走这里） */
export function addCurrency(state, key, amount) {
  if (key !== 'copper' && key !== 'ingot') return state
  const delta = Number.isFinite(amount) ? Math.floor(amount) : 0
  if (delta <= 0) return state
  return { ...state, [key]: state[key] + delta }
}

/**
 * 用铜钱买元宝：花 copperPrice 铜钱，换得 ingotAmount 元宝。
 * 商店「元宝」栏目即这项，展示的是「能得到多少元宝」与「要花多少铜钱」。
 */
export function buyIngotWithCopper(state, ingotAmount, copperPrice) {
  const gain = Math.max(0, Math.floor(ingotAmount))
  const cost = Math.max(0, Math.floor(copperPrice))
  if (!gain) return { state, result: PURCHASE_RESULT.NOT_FOUND }
  if (state.copper < cost) return { state, result: PURCHASE_RESULT.NOT_ENOUGH_POINTS }
  return {
    state: { ...state, copper: state.copper - cost, ingot: state.ingot + gain },
    result: PURCHASE_RESULT.OK,
  }
}

/** 用元宝买铜钱：花 ingotPrice 元宝，换得 copperAmount 铜钱 */
export function buyCopperWithIngot(state, copperAmount, ingotPrice) {
  const gain = Math.max(0, Math.floor(copperAmount))
  const cost = Math.max(0, Math.floor(ingotPrice))
  if (!gain) return { state, result: PURCHASE_RESULT.NOT_FOUND }
  if (state.ingot < cost) return { state, result: PURCHASE_RESULT.NOT_ENOUGH_POINTS }
  return {
    state: { ...state, ingot: state.ingot - cost, copper: state.copper + gain },
    result: PURCHASE_RESULT.OK,
  }
}

/*
 * 商店的货币兑换档位（与栏目一一对应）：
 *   元宝栏目：用铜钱换元宝，展示可得元宝数，价格为所需铜钱
 *   铜钱栏目：用元宝换铜钱，展示可得铜钱数，价格为所需元宝
 * 两组价格均为 1000 / 5000 / 10000 / 25000 / 50000。
 */
export const CURRENCY_TIERS = [
  { amount: 1, price: 1000 },
  { amount: 5, price: 5000 },
  { amount: 10, price: 10000 },
  { amount: 25, price: 25000 },
  { amount: 50, price: 50000 },
]

/** 铜钱栏目：以元宝计价的铜钱档位 */
export const COPPER_TIERS = [
  { amount: 1000, price: 1 },
  { amount: 5000, price: 5 },
  { amount: 10000, price: 10 },
  { amount: 25000, price: 25 },
  { amount: 50000, price: 50 },
]

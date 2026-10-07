import {
  DEFAULT_DESK_ID,
  DEFAULT_VENUE_ID,
  STARTER_TOOL_IDS,
  getShopItem,
  getToolGroup,
} from "../constants/shop.js"
import {
  RESTORATION_TOOL_GROUPS,
  TOTAL_RESTORATION_STEPS,
} from "../constants/restoration.js"
import { ApiError } from "../lib/api-error.js"
import { prisma } from "../lib/prisma.js"
import { ensureStarterOwnerships } from "./shop.service.js"
import { ensureWallet } from "./wallet.service.js"

const AVATAR_IDS = new Set([
  "avatar-ink",
  "avatar-brick",
  "avatar-gold",
  "avatar-jade",
  "avatar-clay",
  "avatar-indigo",
])

function titleForRewards(count) {
  if (count >= 5) return "首席修复师"
  if (count >= 3) return "高级修复师"
  if (count >= 2) return "中级修复师"
  if (count >= 1) return "初级修复师"
  return "见习修复师"
}

function ensureProfile(userId, client) {
  return client.playerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

function ensurePreference(userId, client) {
  return client.playerPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      equippedToolIds: STARTER_TOOL_IDS,
      equippedVenueId: DEFAULT_VENUE_ID,
      equippedDeskId: DEFAULT_DESK_ID,
    },
  })
}

function uniqueStrings(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item) => typeof item === "string"))]
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

async function readPlayerState(userId, client) {
  await ensureStarterOwnerships(userId, client)
  const [wallet, profile, preference, ownerships, restorations, rewardCount] = await Promise.all([
    ensureWallet(userId, client),
    ensureProfile(userId, client),
    ensurePreference(userId, client),
    client.shopOwnership.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    client.relicRestoration.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    client.quizReward.count({ where: { userId } }),
  ])

  const ownedToolIds = ownerships.filter((item) => item.itemType === "tool").map((item) => item.itemId)
  const ownedVenueIds = ownerships.filter((item) => item.itemType === "venue").map((item) => item.itemId)
  const ownedDeskIds = ownerships.filter((item) => item.itemType === "desk").map((item) => item.itemId)
  const ownedRelicIds = ownerships.filter((item) => item.itemType === "relic").map((item) => item.itemId)
  const ownedTools = new Set(ownedToolIds)
  const byGroup = new Map()
  for (const toolId of uniqueStrings(preference.equippedToolIds)) {
    const group = getToolGroup(toolId)
    if (group && ownedTools.has(toolId)) byGroup.set(group, toolId)
  }
  const equippedToolIds = byGroup.size
    ? [...byGroup.values()]
    : STARTER_TOOL_IDS.filter((toolId) => ownedTools.has(toolId))
  const equippedVenueId = ownedVenueIds.includes(preference.equippedVenueId)
    ? preference.equippedVenueId
    : ownedVenueIds[0] || DEFAULT_VENUE_ID
  const equippedDeskId = ownedDeskIds.includes(preference.equippedDeskId)
    ? preference.equippedDeskId
    : ownedDeskIds[0] || DEFAULT_DESK_ID
  const equippedRelicId = ownedRelicIds.includes(preference.equippedRelicId)
    ? preference.equippedRelicId
    : null

  if (
    !sameArray(uniqueStrings(preference.equippedToolIds), equippedToolIds)
    || preference.equippedVenueId !== equippedVenueId
    || preference.equippedDeskId !== equippedDeskId
    || preference.equippedRelicId !== equippedRelicId
  ) {
    await client.playerPreference.update({
      where: { userId },
      data: { equippedToolIds, equippedVenueId, equippedDeskId, equippedRelicId },
    })
  }

  const relicProgress = Object.fromEntries(
    restorations
      .filter((item) => ownedRelicIds.includes(item.relicId))
      .map((item) => [item.relicId, item.completedSteps]),
  )

  return {
    wallet: { coins: wallet.coins, ingots: wallet.ingots },
    profile: {
      nickname: profile.nickname,
      bio: profile.bio,
      avatarId: profile.avatarId,
      title: titleForRewards(rewardCount),
    },
    ownedToolIds,
    ownedVenueIds,
    ownedDeskIds,
    ownedRelicIds,
    equippedToolIds,
    equippedVenueId,
    equippedDeskId,
    equippedRelicId,
    relicProgress,
  }
}

export function getPlayerState(userId) {
  return prisma.$transaction((tx) => readPlayerState(userId, tx))
}

export async function updatePlayerProfile(userId, patch = {}) {
  const nickname = typeof patch.nickname === "string" ? patch.nickname.trim() : ""
  const bio = typeof patch.bio === "string" ? patch.bio.trim() : ""
  const avatarId = typeof patch.avatarId === "string" ? patch.avatarId : ""

  if (!nickname || nickname.length > 12) {
    throw new ApiError(400, "INVALID_NICKNAME", "昵称长度必须为 1 到 12 个字符")
  }
  if (bio.length > 60) {
    throw new ApiError(400, "INVALID_BIO", "个人简介不能超过 60 个字符")
  }
  if (!AVATAR_IDS.has(avatarId)) {
    throw new ApiError(400, "INVALID_AVATAR", "头像选项无效")
  }

  await prisma.playerProfile.upsert({
    where: { userId },
    update: { nickname, bio, avatarId },
    create: { userId, nickname, bio, avatarId },
  })
  return getPlayerState(userId)
}

export async function updatePlayerLoadout(userId, kind, itemId) {
  if (!["tool", "venue", "desk", "relic"].includes(kind)) {
    throw new ApiError(400, "INVALID_LOADOUT_KIND", "装备类型无效")
  }
  const item = getShopItem(kind, itemId)
  if (!item) {
    throw new ApiError(404, "SHOP_ITEM_NOT_FOUND", "商品不存在")
  }

  await prisma.$transaction(async (tx) => {
    await ensureStarterOwnerships(userId, tx)
    const [owned, preference] = await Promise.all([
      tx.shopOwnership.findUnique({
        where: { userId_itemType_itemId: { userId, itemType: kind, itemId } },
      }),
      ensurePreference(userId, tx),
    ])
    if (!owned) {
      throw new ApiError(403, "ITEM_NOT_OWNED", "尚未拥有该商品")
    }

    if (kind === "tool") {
      const group = getToolGroup(itemId)
      const equippedToolIds = uniqueStrings(preference.equippedToolIds)
        .filter((id) => getToolGroup(id) !== group)
      equippedToolIds.push(itemId)
      await tx.playerPreference.update({ where: { userId }, data: { equippedToolIds } })
    } else {
      const field = kind === "venue"
        ? "equippedVenueId"
        : kind === "desk"
          ? "equippedDeskId"
          : "equippedRelicId"
      await tx.playerPreference.update({ where: { userId }, data: { [field]: itemId } })
    }
  })

  return getPlayerState(userId)
}

export async function advanceRestoration(userId, relicId, toolId) {
  const tool = getShopItem("tool", toolId)
  if (!tool) {
    throw new ApiError(404, "TOOL_NOT_FOUND", "工具不存在")
  }
  if (!getShopItem("relic", relicId)) {
    throw new ApiError(404, "RELIC_NOT_FOUND", "文物不存在")
  }

  return prisma.$transaction(async (tx) => {
    const preference = await ensurePreference(userId, tx)
    const [ownedRelic, ownedTool] = await Promise.all([
      tx.shopOwnership.findUnique({
        where: { userId_itemType_itemId: { userId, itemType: "relic", itemId: relicId } },
      }),
      tx.shopOwnership.findUnique({
        where: { userId_itemType_itemId: { userId, itemType: "tool", itemId: toolId } },
      }),
    ])
    if (!ownedRelic) throw new ApiError(403, "RELIC_NOT_OWNED", "尚未拥有该文物")
    if (!ownedTool) throw new ApiError(403, "TOOL_NOT_OWNED", "尚未拥有该工具")
    if (preference.equippedRelicId !== relicId) {
      throw new ApiError(400, "RELIC_NOT_EQUIPPED", "请先把该文物设为使用")
    }
    if (!uniqueStrings(preference.equippedToolIds).includes(toolId)) {
      throw new ApiError(400, "TOOL_NOT_EQUIPPED", "请先把该工具设为使用")
    }

    const progress = await tx.relicRestoration.upsert({
      where: { userId_relicId: { userId, relicId } },
      update: {},
      create: { userId, relicId },
    })
    if (progress.completedSteps >= TOTAL_RESTORATION_STEPS) {
      return {
        relicId,
        completedSteps: TOTAL_RESTORATION_STEPS,
        totalSteps: TOTAL_RESTORATION_STEPS,
        completed: true,
        nextToolGroup: null,
      }
    }

    const expectedGroup = RESTORATION_TOOL_GROUPS[progress.completedSteps]
    if (tool.groupId !== expectedGroup) {
      throw new ApiError(400, "WRONG_RESTORATION_TOOL", "当前工序使用的工具不正确")
    }

    const completedSteps = progress.completedSteps + 1
    const update = await tx.relicRestoration.updateMany({
      where: { id: progress.id, completedSteps: progress.completedSteps },
      data: {
        completedSteps: { increment: 1 },
        completedAt: completedSteps === TOTAL_RESTORATION_STEPS ? new Date() : null,
      },
    })
    if (update.count !== 1) {
      throw new ApiError(409, "RESTORATION_CONFLICT", "修复进度已变化，请刷新后重试")
    }

    return {
      relicId,
      completedSteps,
      totalSteps: TOTAL_RESTORATION_STEPS,
      completed: completedSteps === TOTAL_RESTORATION_STEPS,
      nextToolGroup: RESTORATION_TOOL_GROUPS[completedSteps] || null,
    }
  })
}

export async function resetRestoration(userId, relicId) {
  const owned = await prisma.shopOwnership.findUnique({
    where: { userId_itemType_itemId: { userId, itemType: "relic", itemId: relicId } },
  })
  if (!owned) throw new ApiError(403, "RELIC_NOT_OWNED", "尚未拥有该文物")

  await prisma.relicRestoration.upsert({
    where: { userId_relicId: { userId, relicId } },
    update: { completedSteps: 0, completedAt: null },
    create: { userId, relicId },
  })
  return {
    relicId,
    completedSteps: 0,
    totalSteps: TOTAL_RESTORATION_STEPS,
    completed: false,
    nextToolGroup: RESTORATION_TOOL_GROUPS[0],
  }
}

export async function resetDevelopmentPlayer(userId) {
  if (process.env.NODE_ENV !== "development") {
    throw new ApiError(404, "NOT_FOUND", "Not found")
  }

  await prisma.$transaction(async (tx) => {
    await ensureWallet(userId, tx)
    await tx.quizAttempt.deleteMany({ where: { userId } })
    await tx.quizReward.deleteMany({ where: { userId } })
    await tx.relicRestoration.deleteMany({ where: { userId } })
    await tx.shopOwnership.deleteMany({ where: { userId } })
    await ensureStarterOwnerships(userId, tx)
    await tx.wallet.update({ where: { userId }, data: { coins: 0, ingots: 0 } })
    await tx.playerProfile.upsert({
      where: { userId },
      update: { nickname: "修复师", bio: "", avatarId: "avatar-ink" },
      create: { userId },
    })
    await tx.playerPreference.upsert({
      where: { userId },
      update: {
        equippedToolIds: STARTER_TOOL_IDS,
        equippedVenueId: DEFAULT_VENUE_ID,
        equippedDeskId: DEFAULT_DESK_ID,
        equippedRelicId: null,
      },
      create: {
        userId,
        equippedToolIds: STARTER_TOOL_IDS,
        equippedVenueId: DEFAULT_VENUE_ID,
        equippedDeskId: DEFAULT_DESK_ID,
      },
    })
  })

  return getPlayerState(userId)
}

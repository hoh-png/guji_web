import { STARTER_SHOP_ITEMS, getShopItem } from "../constants/shop.js"
import { ApiError } from "../lib/api-error.js"
import { prisma } from "../lib/prisma.js"
import { ensureWallet } from "./wallet.service.js"

export function ensureStarterOwnerships(userId, client = prisma) {
  return client.shopOwnership.createMany({
    data: STARTER_SHOP_ITEMS.map((item) => ({ userId, ...item })),
    skipDuplicates: true,
  })
}

function serializeState(wallet, ownerships) {
  return {
    wallet: {
      ingots: wallet.ingots,
      coins: wallet.coins,
    },
    ownedToolIds: ownerships.filter((item) => item.itemType === "tool").map((item) => item.itemId),
    ownedVenueIds: ownerships.filter((item) => item.itemType === "venue").map((item) => item.itemId),
    ownedDeskIds: ownerships.filter((item) => item.itemType === "desk").map((item) => item.itemId),
  }
}

async function readState(userId, client) {
  const [wallet, ownerships] = await Promise.all([
    ensureWallet(userId, client),
    client.shopOwnership.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    }),
  ])
  return serializeState(wallet, ownerships)
}

export function getShopState(userId) {
  return prisma.$transaction(async (tx) => {
    await ensureStarterOwnerships(userId, tx)
    return readState(userId, tx)
  })
}

export function purchaseShopItem(userId, itemType, itemId) {
  const item = getShopItem(itemType, itemId)
  if (!item) {
    throw new ApiError(404, "SHOP_ITEM_NOT_FOUND", "商品不存在")
  }

  const runPurchase = () => prisma.$transaction(async (tx) => {
    await ensureWallet(userId, tx)

    try {
      await tx.shopOwnership.create({
        data: { userId, itemType, itemId },
      })
    } catch (error) {
      if (error?.code === "P2002") {
        throw new ApiError(409, "ALREADY_OWNED", "已经拥有该商品")
      }
      throw error
    }

    const walletUpdate = await tx.wallet.updateMany({
      where: { userId, coins: { gte: item.priceCoins } },
      data: { coins: { decrement: item.priceCoins } },
    })
    if (walletUpdate.count !== 1) {
      throw new ApiError(400, "INSUFFICIENT_COINS", "铜钱不足")
    }

    return readState(userId, tx)
  })

  return runPurchase().catch(async (error) => {
    if (error?.code === "P2034") {
      const owned = await prisma.shopOwnership.findUnique({
        where: { userId_itemType_itemId: { userId, itemType, itemId } },
      })
      if (owned) {
        throw new ApiError(409, "ALREADY_OWNED", "已经拥有该商品")
      }
      return runPurchase()
    }
    throw error
  })
}

export function resetDevelopmentShopState(userId) {
  if (process.env.NODE_ENV !== "development") {
    throw new ApiError(404, "NOT_FOUND", "Not found")
  }

  return prisma.$transaction(async (tx) => {
    await ensureWallet(userId, tx)
    await tx.wallet.update({
      where: { userId },
      data: { coins: 0, ingots: 0 },
    })
    await tx.shopOwnership.deleteMany({ where: { userId } })
    await ensureStarterOwnerships(userId, tx)
    return readState(userId, tx)
  })
}

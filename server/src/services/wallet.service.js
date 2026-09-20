import { COINS_PER_INGOT } from "../constants/economy.js"
import { ApiError } from "../lib/api-error.js"
import { prisma } from "../lib/prisma.js"

export function ensureWallet(userId, client = prisma) {
  return client.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

export async function exchangeCurrency(userId, kind, amount) {
  return prisma.$transaction(async (tx) => {
    await ensureWallet(userId, tx)

    const receiveCoins = kind === "copper"
    const spentIngots = receiveCoins ? amount / COINS_PER_INGOT : 0
    const spentCoins = receiveCoins ? 0 : amount * COINS_PER_INGOT

    const result = await tx.wallet.updateMany({
      where: {
        userId,
        ...(receiveCoins
          ? { ingots: { gte: spentIngots } }
          : { coins: { gte: spentCoins } }),
      },
      data: {
        ...(receiveCoins
          ? {
              ingots: { decrement: spentIngots },
              coins: { increment: amount },
            }
          : {
              coins: { decrement: spentCoins },
              ingots: { increment: amount },
            }),
      },
    })

    if (result.count !== 1) {
      throw new ApiError(
        400,
        receiveCoins ? "INSUFFICIENT_INGOTS" : "INSUFFICIENT_COINS",
        receiveCoins ? "元宝不足" : "铜钱不足",
      )
    }

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
    return {
      wallet,
      spentIngots,
      spentCoins,
      receivedIngots: receiveCoins ? 0 : amount,
      receivedCoins: receiveCoins ? amount : 0,
    }
  })
}

export async function grantDevelopmentCurrency(userId, kind, amount) {
  if (process.env.NODE_ENV !== "development") {
    throw new ApiError(404, "NOT_FOUND", "Not found")
  }

  await ensureWallet(userId)
  return prisma.wallet.update({
    where: { userId },
    data: kind === "ingot"
      ? { ingots: { increment: amount } }
      : { coins: { increment: amount } },
  })
}

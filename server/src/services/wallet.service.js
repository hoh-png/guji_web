import { INGOT_TO_COIN_RATE } from "../constants/economy.js"
import { ApiError } from "../lib/api-error.js"
import { prisma } from "../lib/prisma.js"

export function ensureWallet(userId, client = prisma) {
  return client.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

export async function exchangeIngots(userId, amount) {
  return prisma.$transaction(async (tx) => {
    await ensureWallet(userId, tx)

    const result = await tx.wallet.updateMany({
      where: {
        userId,
        ingots: { gte: amount },
      },
      data: {
        ingots: { decrement: amount },
        coins: { increment: amount * INGOT_TO_COIN_RATE },
      },
    })

    if (result.count !== 1) {
      throw new ApiError(400, "INSUFFICIENT_INGOTS", "元宝不足")
    }

    return tx.wallet.findUniqueOrThrow({ where: { userId } })
  })
}

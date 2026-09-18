import { INGOT_TO_COIN_RATE } from "../constants/economy.js"
import { exchangeIngots, ensureWallet } from "../services/wallet.service.js"

export async function getWallet(req, res, next) {
  try {
    const wallet = await ensureWallet(req.auth.userId)

    return res.status(200).json({
      success: true,
      data: {
        ingots: wallet.ingots,
        coins: wallet.coins,
        exchangeRate: { ingotToCoin: INGOT_TO_COIN_RATE },
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function exchange(req, res, next) {
  const amount = req.body?.amount

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      code: "INVALID_AMOUNT",
      message: "兑换数量必须为正整数",
    })
  }

  try {
    const wallet = await exchangeIngots(req.auth.userId, amount)

    return res.status(200).json({
      success: true,
      data: {
        spentIngots: amount,
        receivedCoins: amount * INGOT_TO_COIN_RATE,
        wallet: {
          ingots: wallet.ingots,
          coins: wallet.coins,
        },
      },
    })
  } catch (error) {
    return next(error)
  }
}

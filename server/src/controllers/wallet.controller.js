import { COINS_PER_INGOT } from "../constants/economy.js"
import { exchangeCurrency, grantDevelopmentCurrency, ensureWallet } from "../services/wallet.service.js"

export async function getWallet(req, res, next) {
  try {
    const wallet = await ensureWallet(req.auth.userId)

    return res.status(200).json({
      success: true,
      data: {
        ingots: wallet.ingots,
        coins: wallet.coins,
        exchangeRate: {
          ingotToCoin: COINS_PER_INGOT,
          coinToIngot: COINS_PER_INGOT,
        },
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function exchange(req, res, next) {
  const kind = req.body?.kind
  const amount = req.body?.amount

  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER / COINS_PER_INGOT) {
    return res.status(400).json({
      success: false,
      code: "INVALID_AMOUNT",
      message: "兑换数量必须为正整数",
    })
  }

  if (kind !== "copper" && kind !== "ingot") {
    return res.status(400).json({
      success: false,
      code: "INVALID_EXCHANGE_KIND",
      message: "兑换货币类型无效",
    })
  }

  if (kind === "copper" && amount % COINS_PER_INGOT !== 0) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EXCHANGE_AMOUNT",
      message: `铜钱兑换数量必须是 ${COINS_PER_INGOT} 的整数倍`,
    })
  }

  try {
    const result = await exchangeCurrency(req.auth.userId, kind, amount)
    const { wallet } = result

    return res.status(200).json({
      success: true,
      data: {
        spentIngots: result.spentIngots,
        spentCoins: result.spentCoins,
        receivedIngots: result.receivedIngots,
        receivedCoins: result.receivedCoins,
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

export async function grantDevelopment(req, res, next) {
  const kind = req.body?.kind
  const amount = req.body?.amount
  const allowed = (kind === "copper" && [1000, 5000].includes(amount))
    || (kind === "ingot" && amount === 10)

  if (!allowed) {
    return res.status(400).json({
      success: false,
      code: "INVALID_DEVELOPMENT_GRANT",
      message: "演示货币数量无效",
    })
  }

  try {
    const wallet = await grantDevelopmentCurrency(req.auth.userId, kind, amount)
    return res.status(200).json({
      success: true,
      data: {
        wallet: { ingots: wallet.ingots, coins: wallet.coins },
      },
    })
  } catch (error) {
    return next(error)
  }
}

import { getShopState, purchaseShopItem, resetDevelopmentShopState } from "../services/shop.service.js"

export async function getState(req, res, next) {
  try {
    const data = await getShopState(req.auth.userId)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return next(error)
  }
}

export async function purchase(req, res, next) {
  const itemType = typeof req.body?.itemType === "string" ? req.body.itemType : ""
  const itemId = typeof req.body?.itemId === "string" ? req.body.itemId : ""

  try {
    const data = await purchaseShopItem(req.auth.userId, itemType, itemId)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return next(error)
  }
}

export async function resetDevelopmentState(req, res, next) {
  try {
    const data = await resetDevelopmentShopState(req.auth.userId)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return next(error)
  }
}

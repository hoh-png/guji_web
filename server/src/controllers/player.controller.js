import {
  advanceRestoration,
  getPlayerState,
  resetDevelopmentPlayer,
  resetRestoration,
  updatePlayerLoadout,
  updatePlayerProfile,
} from "../services/player.service.js"

export async function state(req, res, next) {
  try {
    return res.status(200).json({ success: true, data: await getPlayerState(req.auth.userId) })
  } catch (error) {
    return next(error)
  }
}

export async function profile(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: await updatePlayerProfile(req.auth.userId, req.body),
    })
  } catch (error) {
    return next(error)
  }
}

export async function loadout(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: await updatePlayerLoadout(req.auth.userId, req.body?.kind, req.body?.itemId),
    })
  } catch (error) {
    return next(error)
  }
}

export async function advance(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: await advanceRestoration(req.auth.userId, req.params.relicId, req.body?.toolId),
    })
  } catch (error) {
    return next(error)
  }
}

export async function resetRelic(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: await resetRestoration(req.auth.userId, req.params.relicId),
    })
  } catch (error) {
    return next(error)
  }
}

export async function resetDevelopment(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: await resetDevelopmentPlayer(req.auth.userId),
    })
  } catch (error) {
    return next(error)
  }
}

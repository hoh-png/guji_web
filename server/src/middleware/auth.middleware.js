import jwt from "jsonwebtoken"

export const AUTH_COOKIE_NAME = "guji_auth"

export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const userId = Number(payload.sub)

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid token subject")
    }

    req.auth = { userId }
    return next()
  } catch {
    return res.status(401).json({ message: "Unauthorized" })
  }
}

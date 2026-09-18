import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js"
import { AUTH_COOKIE_NAME } from "../middleware/auth.middleware.js"

const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const PASSWORD_MIN_LENGTH = 8

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
  }
}

function setAuthCookie(res, userId) {
  const token = jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  )

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: TOKEN_MAX_AGE_MS,
  })
}

function credentialsFrom(body = {}) {
  return {
    username: typeof body.username === "string" ? body.username.trim() : "",
    password: typeof body.password === "string" ? body.password : "",
  }
}

export async function register(req, res, next) {
  const { username, password } = credentialsFrom(req.body)

  if (!username) {
    return res.status(400).json({ message: "Username is required" })
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" })
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { username, passwordHash },
      })

      await tx.wallet.create({
        data: { userId: createdUser.id },
      })

      return createdUser
    })

    setAuthCookie(res, user.id)
    return res.status(201).json({
      message: "Registered successfully",
      user: publicUser(user),
    })
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Username already exists" })
    }
    return next(error)
  }
}

export async function login(req, res, next) {
  const { username, password } = credentialsFrom(req.body)

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" })
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } })
    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    setAuthCookie(res, user.id)
    return res.status(200).json({
      message: "Logged in successfully",
      user: publicUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, username: true },
    })

    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, cookieOptions())
      return res.status(401).json({ message: "Unauthorized" })
    }

    return res.status(200).json({ user })
  } catch (error) {
    return next(error)
  }
}

export function logout(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions())
  return res.status(200).json({ message: "Logged out successfully" })
}

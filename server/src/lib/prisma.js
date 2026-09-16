import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "@prisma/client"

function databaseOptions() {
  const value = process.env.DATABASE_URL

  if (!value) {
    throw new Error("DATABASE_URL is not configured")
  }

  const url = new URL(value)

  if (url.protocol !== "mysql:") {
    throw new Error("DATABASE_URL must use the mysql protocol")
  }

  const database = url.pathname.replace(/^\//, "")
  if (!database) {
    throw new Error("DATABASE_URL must include a database name")
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(database),
    connectionLimit: 5,
  }
}

const globalForPrisma = globalThis

const adapter = new PrismaMariaDb(databaseOptions())

export const prisma =
  globalForPrisma.__gujiPrisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__gujiPrisma = prisma
}

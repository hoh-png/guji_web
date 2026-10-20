import "dotenv/config"
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/prisma.js"

const baseUrl = process.env.FRONTEND_URL
if (!baseUrl?.startsWith("https://")) throw new Error("FRONTEND_URL must be the internal HTTPS URL")
if (new URL(process.env.DATABASE_URL).pathname !== "/guji_web_internal_test") {
  throw new Error("Refusing to create accounts outside guji_web_internal_test")
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const output = path.resolve(scriptDir, "../../ops/internal-test/.runtime/test-accounts.txt")
fs.mkdirSync(path.dirname(output), { recursive: true })
const file = fs.openSync(output, "wx", 0o600)

try {
  fs.writeSync(file, `内部测试账号（仅发给成年测试者，勿上传 Git）\n站点：${baseUrl}\n创建时间：${new Date().toISOString()}\n\n`)
  const batch = randomBytes(3).toString("hex")
  for (let number = 1; number <= 3; number++) {
    const username = `internal_${batch}_${number}`
    const password = randomBytes(18).toString("base64url")
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { username, passwordHash } })
      await tx.wallet.create({ data: { userId: user.id } })
    })
    fs.writeSync(file, `${username}    ${password}\n`)
  }
  console.log("Created three distinct adult internal-test accounts.")
  console.log(`Credentials saved to ignored local file: ${output}`)
} finally {
  fs.closeSync(file)
  await prisma.$disconnect()
}

import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const baseUrl = process.env.TEST_BASE_URL
if (!baseUrl || !baseUrl.startsWith("https://")) {
  throw new Error("TEST_BASE_URL must be the internal HTTPS URL")
}
if (new URL(process.env.DATABASE_URL).pathname !== "/guji_web_internal_test") {
  throw new Error("Smoke test refuses to use a database other than guji_web_internal_test")
}
if (process.env.NODE_ENV !== "production") {
  throw new Error("Smoke test requires NODE_ENV=production")
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const accountFile = path.resolve(scriptDir, "../../ops/internal-test/.runtime/test-accounts.txt")
const accountLine = fs.readFileSync(accountFile, "utf8").split(/\r?\n/).find((line) => line.startsWith("internal_"))
if (!accountLine) throw new Error("Prebuilt internal-test account file is missing or empty")
const [username, password] = accountLine.trim().split(/\s+/)

function check(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options)
}

const health = await request("/api/health")
check(health.status === 200, "health endpoint failed")

const registration = await request("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: `blocked_${Date.now()}`, password }),
})
check(registration.status === 404, "internal self-registration must be disabled")

const loggedIn = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
})
check(loggedIn.status === 200, `prebuilt-account login failed: ${loggedIn.status}`)
const setCookie = loggedIn.headers.get("set-cookie") || ""
check(setCookie.includes("Secure"), "production cookie is missing Secure")
check(setCookie.includes("HttpOnly"), "production cookie is missing HttpOnly")
check(setCookie.includes("SameSite=Lax"), "production cookie is missing SameSite=Lax")
const cookie = setCookie.split(";", 1)[0]
check(cookie, "auth cookie missing")

const player = await request("/api/player", { headers: { cookie } })
check(player.status === 200, "authenticated player endpoint failed")

for (const endpoint of ["/api/wallet/dev/grant", "/api/shop/dev/reset", "/api/player/dev/reset"]) {
  const response = await request(endpoint, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ kind: "copper", amount: 1000 }),
  })
  check(response.status === 404, `development endpoint remained active: ${endpoint}`)
}

console.log("HTTPS, disabled registration, auth cookie, player API, and disabled development endpoints passed.")

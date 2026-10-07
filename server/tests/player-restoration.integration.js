import { prisma } from "../src/lib/prisma.js"

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000"
const username = `player_restoration_test_${Date.now()}`
const password = "IntegrationTest123!"
let userId
let cookie

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, { method = "GET", body, authenticated = true } = {}) {
  const headers = {}
  if (body !== undefined) headers["content-type"] = "application/json"
  if (authenticated && cookie) headers.cookie = cookie
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json()
  return { response, payload }
}

async function main() {
  const registered = await request("/api/auth/register", {
    method: "POST",
    authenticated: false,
    body: { username, password },
  })
  assert(registered.response.status === 201, "test user registration failed")
  userId = registered.payload.user.id
  cookie = registered.response.headers.get("set-cookie")?.split(";", 1)[0]
  assert(cookie, "registration did not set auth cookie")

  const initial = await request("/api/player")
  assert(initial.response.status === 200, "player state read failed")
  assert(initial.payload.data.profile.title === "见习修复师", "initial title is wrong")
  assert(initial.payload.data.ownedRelicIds.length === 0, "new user unexpectedly owns relics")
  assert(initial.payload.data.equippedToolIds.includes("hammer-1"), "starter tool loadout is missing")

  await prisma.wallet.update({ where: { userId }, data: { ingots: 10 } })
  const purchased = await request("/api/shop/purchase", {
    method: "POST",
    body: { itemType: "relic", itemId: "hubei-1" },
  })
  assert(purchased.response.status === 200, "relic purchase failed")
  assert(purchased.payload.data.ownedRelicIds.includes("hubei-1"), "relic ownership was not saved")

  const duplicate = await request("/api/shop/purchase", {
    method: "POST",
    body: { itemType: "relic", itemId: "hubei-1" },
  })
  assert(duplicate.response.status === 409, "duplicate relic purchase was accepted")

  const equipped = await request("/api/player/loadout", {
    method: "PATCH",
    body: { kind: "relic", itemId: "hubei-1" },
  })
  assert(equipped.response.status === 200, "equipping relic failed")
  assert(equipped.payload.data.equippedRelicId === "hubei-1", "equipped relic was not persisted")

  const profile = await request("/api/player/profile", {
    method: "PATCH",
    body: {
      nickname: "测试修复师",
      bio: "后端持久化测试",
      avatarId: "avatar-jade",
      title: "首席修复师",
    },
  })
  assert(profile.response.status === 200, "profile update failed")
  assert(profile.payload.data.profile.nickname === "测试修复师", "nickname was not persisted")
  assert(profile.payload.data.profile.title === "见习修复师", "client was able to forge title")

  const wrongTool = await request("/api/player/relics/hubei-1/advance", {
    method: "POST",
    body: { toolId: "tweezers-1" },
  })
  assert(wrongTool.response.status === 400, "wrong restoration tool was accepted")
  assert(wrongTool.payload.code === "WRONG_RESTORATION_TOOL", "wrong-tool error code is missing")

  const toolIds = [
    "hammer-1",
    "heat-gun-1",
    "tweezers-1",
    "dropper-1",
    "scalpel-1",
    "needle-awl-1",
    "soldering-iron-1",
  ]
  for (let index = 0; index < toolIds.length; index += 1) {
    const advanced = await request("/api/player/relics/hubei-1/advance", {
      method: "POST",
      body: { toolId: toolIds[index] },
    })
    assert(advanced.response.status === 200, `restoration step ${index + 1} failed`)
    assert(
      advanced.payload.data.completedSteps === index + 1,
      `restoration step ${index + 1} was not persisted`,
    )
  }

  const restored = await request("/api/player")
  assert(restored.payload.data.relicProgress["hubei-1"] === 7, "completed restoration was not restored")

  const resetRelic = await request("/api/player/relics/hubei-1/reset", { method: "POST" })
  assert(resetRelic.response.status === 200, "relic reset failed")
  assert(resetRelic.payload.data.completedSteps === 0, "relic progress was not reset")

  const resetAll = await request("/api/player/dev/reset", { method: "POST" })
  assert(resetAll.response.status === 200, "full development reset failed")
  assert(resetAll.payload.data.ownedRelicIds.length === 0, "full reset kept relic ownership")
  assert(resetAll.payload.data.equippedRelicId === null, "full reset kept equipped relic")
  assert(Object.keys(resetAll.payload.data.relicProgress).length === 0, "full reset kept restoration progress")
  assert(resetAll.payload.data.profile.nickname === "修复师", "full reset kept profile changes")

  console.log(JSON.stringify({
    playerState: "passed",
    relicPurchase: "passed",
    profile: "passed",
    restoration: "passed",
    fullReset: "passed",
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId, username } })
    await prisma.$disconnect()
  })

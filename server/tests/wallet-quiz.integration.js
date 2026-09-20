import { prisma } from "../src/lib/prisma.js"

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000"
const username = `wallet_quiz_test_${Date.now()}`
const password = "IntegrationTest123!"
let userId
let cookie

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function request(path, { method = "GET", body, authenticated = true } = {}) {
  const headers = {}
  if (body !== undefined) {
    headers["content-type"] = "application/json"
  }
  if (authenticated && cookie) {
    headers.cookie = cookie
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json()
  return { response, payload }
}

async function main() {
  const results = {}

  const unauthorized = await request("/api/wallet", { authenticated: false })
  assert(unauthorized.response.status === 401, "wallet should require login")
  assert(unauthorized.payload.code === "UNAUTHORIZED", "missing UNAUTHORIZED code")

  const registered = await request("/api/auth/register", {
    method: "POST",
    authenticated: false,
    body: { username, password },
  })
  assert(registered.response.status === 201, "test user registration failed")
  userId = registered.payload.user.id
  assert(
    (await prisma.wallet.count({ where: { userId } })) === 1,
    "registration did not create wallet transactionally",
  )

  await prisma.wallet.delete({ where: { userId } })

  const loggedIn = await request("/api/auth/login", {
    method: "POST",
    authenticated: false,
    body: { username, password },
  })
  assert(loggedIn.response.status === 200, "existing login failed")
  cookie = loggedIn.response.headers.get("set-cookie")?.split(";", 1)[0]
  assert(cookie, "login did not set auth cookie")
  results.login = "passed"

  const wallet = await request("/api/wallet")
  assert(wallet.response.status === 200, "wallet read failed")
  assert(wallet.payload.data.ingots === 0 && wallet.payload.data.coins === 0, "wallet defaults are wrong")
  assert(wallet.payload.data.exchangeRate.ingotToCoin === 1000, "exchange rate is wrong")
  assert(wallet.payload.data.exchangeRate.coinToIngot === 1000, "reverse exchange rate is wrong")
  assert((await prisma.wallet.count({ where: { userId } })) === 1, "legacy wallet was not created")
  results.walletReadAndLegacyBackfill = "passed"

  const questions = await request("/api/quiz/questions")
  assert(questions.response.status === 200, "question list failed")
  assert(questions.payload.data.length >= 5, "seeded question count is below five")
  assert(!JSON.stringify(questions.payload).includes("correctAnswer"), "question list leaked correctAnswer")

  const firstQuestion = await prisma.question.findFirst({
    where: { question: "青铜器主要由哪两类金属组成？" },
  })
  const secondQuestion = await prisma.question.findFirst({
    where: { question: "被誉为中国“瓷都”的城市是哪里？" },
  })
  assert(firstQuestion && secondQuestion, "seed questions were not found")

  const singleQuestion = await request(`/api/quiz/questions/${firstQuestion.id}`)
  assert(singleQuestion.response.status === 200, "single question read failed")
  assert(!JSON.stringify(singleQuestion.payload).includes("correctAnswer"), "single question leaked correctAnswer")
  results.questionRedaction = "passed"

  const wrongAnswer = firstQuestion.correctAnswer === "A" ? "B" : "A"
  const beforeWrong = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  const wrong = await request("/api/quiz/answer", {
    method: "POST",
    body: {
      questionId: firstQuestion.id,
      answer: wrongAnswer.toLowerCase(),
      isCorrect: true,
      correctAnswer: wrongAnswer,
      reward: { coins: 999999, ingots: 999999 },
      coins: 999999,
      ingots: 999999,
      userId: -1,
    },
  })
  assert(wrong.response.status === 200 && wrong.payload.data.correct === false, "wrong answer was not rejected")
  assert(wrong.payload.data.reward.coins === 0 && wrong.payload.data.reward.ingots === 0, "wrong answer got reward")
  const afterWrong = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  assert(afterWrong.coins === beforeWrong.coins && afterWrong.ingots === beforeWrong.ingots, "spoofed fields changed wallet")
  results.wrongAnswer = "passed"

  const correct = await request("/api/quiz/answer", {
    method: "POST",
    body: { questionId: firstQuestion.id, answer: firstQuestion.correctAnswer },
  })
  assert(correct.response.status === 200 && correct.payload.data.correct === true, "correct answer failed")
  assert(correct.payload.data.alreadyRewarded === false, "first reward marked as already received")
  assert(correct.payload.data.reward.coins === firstQuestion.rewardCoins, "coin reward mismatch")
  assert(correct.payload.data.reward.ingots === firstQuestion.rewardIngots, "ingot reward mismatch")
  results.correctAnswerReward = "passed"

  const beforeRepeat = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  const repeated = await request("/api/quiz/answer", {
    method: "POST",
    body: { questionId: firstQuestion.id, answer: firstQuestion.correctAnswer },
  })
  const afterRepeat = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  assert(repeated.payload.data.alreadyRewarded === true, "repeat answer did not report prior reward")
  assert(repeated.payload.data.reward.coins === 0 && repeated.payload.data.reward.ingots === 0, "repeat answer got reward")
  assert(afterRepeat.coins === beforeRepeat.coins && afterRepeat.ingots === beforeRepeat.ingots, "repeat answer changed wallet")
  results.repeatRewardProtection = "passed"

  const beforeConcurrent = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () => request("/api/quiz/answer", {
      method: "POST",
      body: { questionId: secondQuestion.id, answer: secondQuestion.correctAnswer },
    })),
  )
  assert(concurrent.every(({ response }) => response.status === 200), "a concurrent answer request failed")
  const grantedCount = concurrent.filter(({ payload }) =>
    payload.data.reward.coins === secondQuestion.rewardCoins
      && payload.data.reward.ingots === secondQuestion.rewardIngots
      && payload.data.alreadyRewarded === false,
  ).length
  assert(grantedCount === 1, `concurrent requests granted ${grantedCount} rewards`)
  const afterConcurrent = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  assert(afterConcurrent.coins - beforeConcurrent.coins === secondQuestion.rewardCoins, "concurrent coin delta is wrong")
  assert(afterConcurrent.ingots - beforeConcurrent.ingots === secondQuestion.rewardIngots, "concurrent ingot delta is wrong")
  assert(
    (await prisma.quizReward.count({ where: { userId, questionId: secondQuestion.id } })) === 1,
    "concurrent requests created duplicate QuizReward rows",
  )
  results.concurrentRewardProtection = "passed"

  const history = await request("/api/quiz/history")
  assert(history.response.status === 200 && history.payload.data.length >= 13, "quiz history is incomplete")
  for (let index = 1; index < history.payload.data.length; index += 1) {
    assert(
      new Date(history.payload.data[index - 1].createdAt) >= new Date(history.payload.data[index].createdAt),
      "quiz history is not sorted descending",
    )
  }
  results.history = "passed"

  const shop = await request("/api/shop")
  assert(shop.response.status === 200, "shop state read failed")
  assert(shop.payload.data.ownedToolIds.includes("hammer-1"), "starter tool was not created")
  assert(shop.payload.data.ownedVenueIds.includes("venue-1"), "starter venue was not created")
  assert(shop.payload.data.ownedDeskIds.includes("desk-1"), "starter desk was not created")

  const purchased = await request("/api/shop/purchase", {
    method: "POST",
    body: { itemType: "tool", itemId: "hammer-2", priceCoins: 999999, userId: -1 },
  })
  assert(purchased.response.status === 200, "shop purchase failed")
  assert(purchased.payload.data.ownedToolIds.includes("hammer-2"), "purchased tool was not persisted")
  const duplicatePurchase = await request("/api/shop/purchase", {
    method: "POST",
    body: { itemType: "tool", itemId: "hammer-2" },
  })
  assert(duplicatePurchase.response.status === 409, "duplicate purchase was accepted")

  const concurrentPurchases = await Promise.all(
    Array.from({ length: 8 }, () => request("/api/shop/purchase", {
      method: "POST",
      body: { itemType: "tool", itemId: "hammer-3" },
    })),
  )
  assert(
    concurrentPurchases.filter(({ response }) => response.status === 200).length === 1,
    "concurrent purchases did not produce exactly one success",
  )
  assert(
    concurrentPurchases.every(({ response }) => [200, 409].includes(response.status)),
    "concurrent purchase returned an unexpected server error",
  )
  assert(
    (await prisma.shopOwnership.count({ where: { userId, itemType: "tool", itemId: "hammer-3" } })) === 1,
    "concurrent purchases created duplicate ownership rows",
  )
  results.shopOwnership = "passed"

  await prisma.wallet.update({ where: { userId }, data: { ingots: 5, coins: 10 } })
  const exchanged = await request("/api/wallet/exchange", {
    method: "POST",
    body: { kind: "copper", amount: 2000, exchangeRate: 999999, userId: -1 },
  })
  assert(exchanged.response.status === 200, "exchange failed")
  assert(exchanged.payload.data.wallet.ingots === 3 && exchanged.payload.data.wallet.coins === 2010, "ingot-to-coin balance is wrong")
  assert(exchanged.payload.data.receivedCoins === 2000, "client influenced exchange rate")

  const reversed = await request("/api/wallet/exchange", {
    method: "POST",
    body: { kind: "ingot", amount: 1 },
  })
  assert(reversed.response.status === 200, "reverse exchange failed")
  assert(reversed.payload.data.wallet.ingots === 4 && reversed.payload.data.wallet.coins === 1010, "coin-to-ingot balance is wrong")
  assert(reversed.payload.data.spentCoins === 1000, "reverse exchange used the wrong rate")
  results.bidirectionalExchange = "passed"

  const insufficient = await request("/api/wallet/exchange", {
    method: "POST",
    body: { kind: "copper", amount: 100000 },
  })
  const afterInsufficient = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
  assert(insufficient.response.status === 400, "insufficient exchange did not return 400")
  assert(insufficient.payload.code === "INSUFFICIENT_INGOTS", "insufficient exchange code is wrong")
  assert(afterInsufficient.ingots === 4 && afterInsufficient.coins === 1010, "insufficient exchange changed wallet")
  results.insufficientIngots = "passed"

  for (const amount of [-1, 1.5, "abc"]) {
    const invalid = await request("/api/wallet/exchange", {
      method: "POST",
      body: { kind: "ingot", amount },
    })
    assert(invalid.response.status === 400 && invalid.payload.code === "INVALID_AMOUNT", `invalid amount accepted: ${amount}`)
  }
  const invalidMultiple = await request("/api/wallet/exchange", {
    method: "POST",
    body: { kind: "copper", amount: 999 },
  })
  assert(invalidMultiple.response.status === 400 && invalidMultiple.payload.code === "INVALID_EXCHANGE_AMOUNT", "invalid copper multiple was accepted")
  results.invalidAmounts = "passed"

  let nonnegativeConstraintBlocked = false
  try {
    await prisma.wallet.update({ where: { userId }, data: { ingots: -1 } })
  } catch {
    nonnegativeConstraintBlocked = true
  }
  assert(nonnegativeConstraintBlocked, "database allowed a negative wallet balance")
  results.databaseNonnegativeConstraint = "passed"

  console.log(JSON.stringify(results, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId, username } })
    }
    await prisma.$disconnect()
  })

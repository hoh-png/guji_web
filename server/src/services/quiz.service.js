import { ApiError } from "../lib/api-error.js"
import { prisma } from "../lib/prisma.js"
import { ensureWallet } from "./wallet.service.js"

const publicQuestionSelect = {
  id: true,
  question: true,
  optionA: true,
  optionB: true,
  optionC: true,
  optionD: true,
  rewardCoins: true,
  rewardIngots: true,
}

function publicQuestion(question) {
  return {
    id: question.id,
    question: question.question,
    options: {
      A: question.optionA,
      B: question.optionB,
      C: question.optionC,
      D: question.optionD,
    },
    reward: {
      coins: question.rewardCoins,
      ingots: question.rewardIngots,
    },
  }
}

async function activeQuestion(tx, questionId) {
  const question = await tx.question.findUnique({ where: { id: questionId } })

  if (!question) {
    throw new ApiError(404, "QUESTION_NOT_FOUND", "题目不存在")
  }

  if (!question.isActive) {
    throw new ApiError(400, "QUESTION_INACTIVE", "题目已停用")
  }

  return question
}

function answerResult(question, answer, correct, alreadyRewarded, reward, wallet) {
  const result = {
    questionId: question.id,
    selectedAnswer: answer,
    correct,
    correctAnswer: question.correctAnswer,
    alreadyRewarded,
    reward,
  }

  if (wallet) {
    result.wallet = {
      coins: wallet.coins,
      ingots: wallet.ingots,
    }
  }

  return result
}

async function recordWithoutReward(tx, userId, question, answer) {
  const correct = answer === question.correctAnswer
  const priorReward = await tx.quizReward.findUnique({
    where: {
      userId_questionId: { userId, questionId: question.id },
    },
    select: { id: true },
  })

  await tx.quizAttempt.create({
    data: {
      userId,
      questionId: question.id,
      selectedAnswer: answer,
      isCorrect: correct,
      rewardGranted: false,
    },
  })

  return answerResult(
    question,
    answer,
    correct,
    Boolean(priorReward),
    { coins: 0, ingots: 0 },
  )
}

export async function listQuestions() {
  const questions = await prisma.question.findMany({
    where: { isActive: true },
    select: publicQuestionSelect,
    orderBy: { id: "asc" },
  })

  return questions.map(publicQuestion)
}

export async function getQuestion(questionId) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, isActive: true },
    select: publicQuestionSelect,
  })

  if (!question) {
    throw new ApiError(404, "QUESTION_NOT_FOUND", "题目不存在")
  }

  return publicQuestion(question)
}

export async function submitAnswer(userId, questionId, answer) {
  try {
    return await prisma.$transaction(async (tx) => {
      const question = await activeQuestion(tx, questionId)
      const correct = answer === question.correctAnswer

      if (!correct) {
        return recordWithoutReward(tx, userId, question, answer)
      }

      const priorReward = await tx.quizReward.findUnique({
        where: {
          userId_questionId: { userId, questionId },
        },
        select: { id: true },
      })

      if (priorReward) {
        return recordWithoutReward(tx, userId, question, answer)
      }

      await ensureWallet(userId, tx)
      await tx.quizReward.create({ data: { userId, questionId } })

      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          coins: { increment: question.rewardCoins },
          ingots: { increment: question.rewardIngots },
        },
      })

      await tx.quizAttempt.create({
        data: {
          userId,
          questionId,
          selectedAnswer: answer,
          isCorrect: true,
          rewardGranted: true,
        },
      })

      return answerResult(
        question,
        answer,
        true,
        false,
        { coins: question.rewardCoins, ingots: question.rewardIngots },
        wallet,
      )
    })
  } catch (error) {
    if (error?.code !== "P2002") {
      throw error
    }

    return prisma.$transaction(async (tx) => {
      const question = await activeQuestion(tx, questionId)
      return recordWithoutReward(tx, userId, question, answer)
    })
  }
}

export async function getHistory(userId) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    select: {
      questionId: true,
      selectedAnswer: true,
      isCorrect: true,
      rewardGranted: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return attempts.map((attempt) => ({
    questionId: attempt.questionId,
    selectedAnswer: attempt.selectedAnswer,
    correct: attempt.isCorrect,
    rewardGranted: attempt.rewardGranted,
    createdAt: attempt.createdAt,
  }))
}

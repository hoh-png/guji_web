import {
  getHistory,
  getQuestion,
  listQuestions,
  submitAnswer,
} from "../services/quiz.service.js"

const VALID_ANSWERS = new Set(["A", "B", "C", "D"])

function parseQuestionId(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null
  }

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export async function questions(_req, res, next) {
  try {
    return res.status(200).json({ success: true, data: await listQuestions() })
  } catch (error) {
    return next(error)
  }
}

export async function question(req, res, next) {
  const questionId = parseQuestionId(req.params.id)
  if (!questionId) {
    return res.status(400).json({
      success: false,
      code: "INVALID_QUESTION_ID",
      message: "题目 ID 必须为正整数",
    })
  }

  try {
    return res.status(200).json({
      success: true,
      data: await getQuestion(questionId),
    })
  } catch (error) {
    return next(error)
  }
}

export async function answer(req, res, next) {
  const questionId = parseQuestionId(req.body?.questionId)
  if (!questionId) {
    return res.status(400).json({
      success: false,
      code: "INVALID_QUESTION_ID",
      message: "题目 ID 必须为正整数",
    })
  }

  const selectedAnswer =
    typeof req.body?.answer === "string"
      ? req.body.answer.trim().toUpperCase()
      : ""

  if (!VALID_ANSWERS.has(selectedAnswer)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_ANSWER",
      message: "答案必须是 A、B、C 或 D",
    })
  }

  try {
    return res.status(200).json({
      success: true,
      data: await submitAnswer(req.auth.userId, questionId, selectedAnswer),
    })
  } catch (error) {
    return next(error)
  }
}

export async function history(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: await getHistory(req.auth.userId),
    })
  } catch (error) {
    return next(error)
  }
}

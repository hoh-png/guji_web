import { Router } from "express"
import {
  answer,
  history,
  progress,
  question,
  questions,
} from "../controllers/quiz.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.use(requireAuth)
router.get("/questions", questions)
router.get("/questions/:id", question)
router.post("/answer", answer)
router.get("/progress", progress)
router.get("/history", history)

export default router

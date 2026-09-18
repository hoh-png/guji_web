import { Router } from "express"
import {
  answer,
  history,
  question,
  questions,
} from "../controllers/quiz.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.use(requireAuth)
router.get("/questions", questions)
router.get("/questions/:id", question)
router.post("/answer", answer)
router.get("/history", history)

export default router

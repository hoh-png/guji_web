import { Router } from "express"
import {
  login,
  logout,
  me,
  register,
} from "../controllers/auth.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.post("/register", register)
router.post("/login", login)
router.get("/me", requireAuth, me)
router.post("/logout", logout)

export default router

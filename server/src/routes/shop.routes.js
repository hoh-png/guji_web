import { Router } from "express"
import { getState, purchase, resetDevelopmentState } from "../controllers/shop.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.use(requireAuth)
router.get("/", getState)
router.post("/purchase", purchase)
router.post("/dev/reset", resetDevelopmentState)

export default router

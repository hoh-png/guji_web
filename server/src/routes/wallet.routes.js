import { Router } from "express"
import { exchange, getWallet } from "../controllers/wallet.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.use(requireAuth)
router.get("/", getWallet)
router.post("/exchange", exchange)

export default router

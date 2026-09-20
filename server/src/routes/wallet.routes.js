import { Router } from "express"
import { exchange, getWallet, grantDevelopment } from "../controllers/wallet.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.use(requireAuth)
router.get("/", getWallet)
router.post("/exchange", exchange)
router.post("/dev/grant", grantDevelopment)

export default router

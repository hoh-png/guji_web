import { Router } from "express"
import {
  advance,
  loadout,
  profile,
  resetDevelopment,
  resetRelic,
  state,
} from "../controllers/player.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

router.use(requireAuth)
router.get("/", state)
router.patch("/profile", profile)
router.patch("/loadout", loadout)
router.post("/relics/:relicId/advance", advance)
router.post("/relics/:relicId/reset", resetRelic)
router.post("/dev/reset", resetDevelopment)

export default router

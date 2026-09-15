import SubPageLayout from '../../components/SubPageLayout/SubPageLayout.jsx'
import { gameContent } from '../../data/gameContent.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'

/** 修复游戏（对应原 pages/game.html） */
export default function GamePage() {
  usePageTitle('修复游戏 · 古迹修复系统')

  return (
    <SubPageLayout
      heading={gameContent.heading}
      cards={gameContent.cards}
      backTo={ROUTES.HOME}
    />
  )
}

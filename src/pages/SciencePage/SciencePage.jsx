import SubPageLayout from '../../components/SubPageLayout/SubPageLayout.jsx'
import { scienceContent } from '../../data/scienceContent.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'

/** 智慧科普（对应原 pages/science.html） */
export default function SciencePage() {
  usePageTitle('智慧科普 · 古迹修复系统')

  return (
    <SubPageLayout
      heading={scienceContent.heading}
      cards={scienceContent.cards}
      backTo={ROUTES.HOME}
    />
  )
}

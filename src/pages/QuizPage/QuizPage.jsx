import SubPageLayout from '../../components/SubPageLayout/SubPageLayout.jsx'
import { quizContent } from '../../data/quizContent.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'

/** 知识挑战（对应原 pages/quiz.html） */
export default function QuizPage() {
  usePageTitle('知识挑战 · 古迹修复系统')

  return (
    <SubPageLayout
      heading={quizContent.heading}
      cards={quizContent.cards}
      backTo={ROUTES.HOME}
    />
  )
}

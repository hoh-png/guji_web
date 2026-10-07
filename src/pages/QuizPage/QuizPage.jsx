import SubPageLayout from '../../components/SubPageLayout/SubPageLayout.jsx'
import { quizContent } from '../../data/quizContent.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'

/** 知识挑战（对应原 pages/quiz.html）：规则与示例题目，并提供进入关卡页的入口 */
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

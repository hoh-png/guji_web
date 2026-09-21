/**
 * 知识挑战 · 解析卡。
 *
 * 已经答对的关卡，再点开时只看解析：显示题干、正确选项与解析文字，
 * 不再出题、也不给重新作答。
 * 样式沿用设计稿的 .quiz-q / .quiz-opt / .quiz-why。
 */
export default function SolutionCard({ question }) {
  return (
    <>
      <div className="quiz-q">{question.q}</div>

      {/* 正确选项：静态展示，不可点 */}
      <div className="quiz-opt correct quiz-opt--static">
        {String.fromCharCode(65 + question.answer)}. {question.opts[question.answer]}
      </div>

      <p className="quiz-why">解析：{question.why}</p>
    </>
  )
}

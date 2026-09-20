/**
 * 知识挑战 · 测验卡片。
 *
 * 对应挑战页设计里的 quiz 部分：
 *   题号与得分（.quiz-meta）→ 题干（.quiz-q）→ 选项（.quiz-opt）
 *   → 解析 → 结算（.quiz-result）
 * 样式见 src/styles/quiz.css，与原设计一致。
 */
export default function QuizCard({
  question,
  index,
  total,
  score,
  picked,
  answered,
  onPick,
  result,
  onRetry,
}) {
  /* 结算视图：全部答完时替换掉题目区 */
  if (result) {
    return (
      <div className="card quiz-result">
        <h3>挑战结束</h3>
        <div className="score">{score}</div>
        <p className="quiz-comment">{result.comment}</p>
        <button type="button" className="btn-main" onClick={onRetry}>
          再来一局
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="quiz-meta">
        <span>
          第 {index + 1} / {total} 题
        </span>
        <span>当前得分：{score}</span>
      </div>

      <div className="quiz-q">{question.q}</div>

      <div>
        {question.opts.map((opt, i) => {
          let cls = 'quiz-opt'
          if (answered && i === question.answer) cls += ' correct'
          if (answered && i === picked && i !== question.answer) cls += ' wrong'
          return (
            <button
              type="button"
              className={cls}
              key={opt}
              disabled={answered}
              onClick={() => onPick(i)}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          )
        })}
      </div>

      {/*
        作答后只标出对错，不显示解析 ——
        解析只在答对之后、重新点开该关卡时给出（见 SolutionCard）。
      */}
      {answered ? (
        <p className="quiz-why">
          {picked === question.answer ? '回答正确。' : '回答有误。'}
        </p>
      ) : null}
    </div>
  )
}

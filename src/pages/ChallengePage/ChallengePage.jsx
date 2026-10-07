import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuizProgress, getQuizQuestions, submitQuizAnswer } from '../../api/quizApi.js'
import StageBoard from '../../components/Challenge/StageBoard.jsx'
import QuizCard from '../../components/Challenge/QuizCard.jsx'
import SolutionCard from '../../components/Challenge/SolutionCard.jsx'
import RelicCard from '../../components/Challenge/RelicCard.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { getStage } from '../../data/stages.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import '../../styles/quiz.css'
import './ChallengePage.css'

/**
 * 知识挑战 · 关卡页。
 *
 * 页面由三块组成：
 *   1. 修复台（StageBoard）—— 左侧文物完整体，右侧关卡路线与五块碎片
 *   2. 测验卡片（QuizCard）—— 一关一题，答对即把该关碎片放回圆环
 *   3. 文物详情（RelicCard）—— 文物名称与修复进度
 *
 * 关关对应：路线上的每个圆环就是一关，题目与关卡一一对应
 * （题目与通关进度来自后端，关卡布局见 data/stages.js）。
 *
 * 版面用「固定场景 + 整体缩放」：场景按 1750×1080 写死坐标，
 * 外层只算一次缩放系数，因此任何窗口尺寸下相对位置都不变。
 */

/** 场景基准尺寸，与设计样例一致 */
const SCENE = { width: 1750, height: 1080 }

/** 文物完整体在场景中的位置与宽度 */
const RELIC_BOX = { x: 60, y: 210, width: 460 }

/** 路线图在场景中的位置与宽度 */
const ROUTE_BOX = { x: 860, y: 230, width: 750 }

/** 碎片显示宽度：略大于环内孔，压住环沿，看起来是「嵌进去」 */
const PIECE_WIDTH = 150

/** 每题分值 */
const POINT_PER_QUESTION = 20

/** 通关祝贺弹窗的停留时长（毫秒），到时自动消失 */
const CONGRATS_DURATION = 2000

/** 答对后解析的停留时长（毫秒），到时自动收起关卡弹窗 */
const CORRECT_REVIEW_DURATION = 1600

const OPTION_KEYS = ['A', 'B', 'C', 'D']

function toPageQuestion(question, index) {
  return {
    id: question.id,
    stageId: index + 1,
    q: question.question,
    opts: OPTION_KEYS.map((key) => question.options?.[key] || ''),
    reward: question.reward || { coins: 0, ingots: 0 },
  }
}

export default function ChallengePage() {
  usePageTitle('知识挑战 · 古迹修复系统')

  const { syncPlayer } = usePlayer()
  const stage = getStage(0)

  const [scale, setScale] = useState(1)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  /** 当前打开的关卡号；null 表示没开测验浮层 */
  const [activeId, setActiveId] = useState(null)
  /** 已归位的碎片编号 */
  const [solvedIds, setSolvedIds] = useState([])
  /** 每关选中的选项下标 */
  const [picked, setPicked] = useState({})
  /** 刚作答、正在显示对错的关卡号 */
  const [reviewingId, setReviewingId] = useState(null)
  /** 后端返回的判题结果与解析，按关卡号保存 */
  const [reviews, setReviews] = useState({})
  /** 祝贺弹窗是否已自动消失 */
  const [congratsClosed, setCongratsClosed] = useState(false)

  const loadQuiz = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    const [questionsResult, progressResult] = await Promise.all([
      getQuizQuestions(),
      getQuizProgress(),
    ])

    if (!questionsResult.ok) {
      setLoadError(
        questionsResult.status === 401
          ? '请先登录后参与知识挑战'
          : questionsResult.message || '题目加载失败，请稍后重试',
      )
      setLoading(false)
      return
    }

    if (!progressResult.ok) {
      setLoadError(
        progressResult.status === 401
          ? '请先登录后参与知识挑战'
          : progressResult.message || '通关进度加载失败，请稍后重试',
      )
      setLoading(false)
      return
    }

    const nextQuestions = (questionsResult.data || []).slice(0, stage?.pieces.length || 0).map(toPageQuestion)
    const progressByQuestion = new Map(
      (progressResult.data || []).map((item) => [item.questionId, item]),
    )
    const nextSolvedIds = []
    const nextReviews = {}

    for (const question of nextQuestions) {
      const progress = progressByQuestion.get(question.id)
      if (!progress) continue
      const answer = OPTION_KEYS.indexOf(progress.correctAnswer)
      nextSolvedIds.push(question.stageId)
      nextReviews[question.stageId] = {
        correct: true,
        answer,
        explanation: progress.explanation || '',
      }
    }

    setQuestions(nextQuestions)
    setSolvedIds(nextSolvedIds)
    setReviews(nextReviews)
    setLoading(false)
  }, [stage])

  useEffect(() => {
    loadQuiz()
  }, [loadQuiz])

  /* 等比缩放到刚好放下整个场景，不重排内部元素 */
  useEffect(() => {
    const fit = () => {
      setScale(Math.min(window.innerWidth / SCENE.width, window.innerHeight / SCENE.height))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const total = stage ? stage.pieces.length : 0
  const solvedCount = solvedIds.length
  const allSolved = solvedCount >= total && total > 0
  const score = solvedCount * POINT_PER_QUESTION

  const activeQuestion = useMemo(
    () => (activeId ? questions.find((q) => q.stageId === activeId) || null : null),
    [activeId, questions],
  )
  const activeReview = activeId === null ? null : reviews[activeId] || null
  const displayQuestion = activeQuestion && activeReview
    ? { ...activeQuestion, answer: activeReview.answer, why: activeReview.explanation }
    : activeQuestion
  const answered = activeId !== null && reviewingId === activeId
  /*
   * 已答对的关卡，再点开时只看解析，不再出题；
   * 答错的关卡视为未通过，再点开重新作答，且不给解析。
   */
  const isSolvedStage = activeId !== null && solvedIds.includes(activeId)

  if (!stage) return null

  const openStage = (id) => {
    setActiveId(id)
    setReviewingId(null)
    setFeedback('')
  }

  const closeStage = () => {
    setActiveId(null)
    setReviewingId(null)
    setFeedback('')
  }

  /*
   * 答对后，题目弹窗先就地显示「回答正确 + 解析」，停留一会自动收起，
   * 之后这个关卡再点开就只显示解析（见 SolutionCard）。
   * 答错则不自动收起，也不给解析，由玩家点「返回路线」自己关。
   */
  useEffect(() => {
    if (reviewingId === null) return undefined
    const review = reviews[reviewingId]
    if (!review?.correct) return undefined

    const timer = setTimeout(closeStage, CORRECT_REVIEW_DURATION)
    return () => clearTimeout(timer)
    // closeStage 只是置空两个状态，无需进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewingId, reviews])

  const pickOption = async (index) => {
    if (!activeQuestion || answered || submitting) return

    setSubmitting(true)
    setFeedback('')
    const result = await submitQuizAnswer(activeQuestion.id, OPTION_KEYS[index])

    if (!result.ok || !result.data) {
      setFeedback(
        result.status === 401
          ? '登录状态已失效，请重新登录'
          : result.message || '答案提交失败，请稍后重试',
      )
      setSubmitting(false)
      return
    }

    const answer = OPTION_KEYS.indexOf(result.data.correctAnswer)
    setPicked((prev) => ({ ...prev, [activeId]: index }))
    setReviews((prev) => ({
      ...prev,
      [activeId]: {
        correct: result.data.correct,
        answer,
        explanation: result.data.explanation || '',
      },
    }))
    setReviewingId(activeId)

    if (result.data.correct) {
      setSolvedIds((prev) => (prev.includes(activeId) ? prev : [...prev, activeId]))
      const coins = result.data.reward?.coins || 0
      setFeedback(coins > 0 ? `回答正确，获得 ${coins} 铜钱` : '回答正确，本关进度已保存')
      if (result.data.wallet) await syncPlayer()
    } else {
      setFeedback('回答有误，本题不计入通关进度')
    }

    setSubmitting(false)
  }

  /*
   * 五关全部完成：先把题目弹窗收掉，再弹祝贺。
   * 两个弹窗不能并存 —— 否则祝贺会盖在还开着的题目弹窗上，两层遮罩叠着。
   * 收起与弹出放在同一个 effect 里，保证「祝贺出现时题目弹窗已经消失」。
   */
  useEffect(() => {
    if (!allSolved) return undefined
    setActiveId(null)
    setReviewingId(null)
    const timer = setTimeout(() => setCongratsClosed(true), CONGRATS_DURATION)
    return () => clearTimeout(timer)
  }, [allSolved])

  const result = allSolved && !congratsClosed ? { stage } : null

  return (
    <div className="challenge-scene">
      <div
        className="challenge-canvas"
        style={{
          width: SCENE.width,
          height: SCENE.height,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <img className="challenge-bg" src="/images/quiz/bg.png" alt="" draggable="false" />

        <Link className="challenge-back" to={ROUTES.QUIZ}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M19 6 9 16l10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>返回</span>
        </Link>

        {loading || loadError ? (
          <div className="quiz-overlay" role="status" aria-live="polite">
            <div className="quiz-panel">
              <div className="quiz-q">{loading ? '正在加载题目与通关进度…' : loadError}</div>
              {!loading && loadError ? (
                <button type="button" className="quiz-next" onClick={loadQuiz}>
                  重新加载
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 1. 修复台 */}
        <StageBoard
          stage={stage}
          relicBox={RELIC_BOX}
          routeBox={ROUTE_BOX}
          solvedIds={solvedIds}
          pieceWidth={PIECE_WIDTH}
          onSelect={openStage}
        />

        {/* 3. 文物详情（左下的信息卡） */}
        <div className="challenge-relic-card">
          <RelicCard stage={stage} solved={solvedCount} />
        </div>

        {/* 2. 测验浮层：一关一题 */}
        {displayQuestion && !loading && !loadError ? (
          <div className="quiz-overlay" role="dialog" aria-modal="true">
            <div className="quiz-panel">
              <div className="quiz-panel-head">
                <span className="quiz-panel-title">
                  第 {activeId} 关 · {stage.name}
                </span>
                <button type="button" className="quiz-panel-close" onClick={closeStage}>
                  关闭
                </button>
              </div>

              {isSolvedStage ? (
                /* 已答对：只看解析，不再出题 */
                <SolutionCard question={displayQuestion} />
              ) : (
                <>
                  <QuizCard
                    question={displayQuestion}
                    index={activeId - 1}
                    total={total}
                    score={score}
                    picked={picked[activeId]}
                    answered={answered}
                    disabled={submitting}
                    onPick={pickOption}
                  />

                  {/* 只标出对错，不给解析；给一个手动返回的出口 */}
                  {answered ? (
                    <>
                      <p className="quiz-why">
                        {activeReview?.correct
                          ? '回答正确，碎片已归位。'
                          : '回答有误，本题不计入修复——关闭后可重新作答。'}
                      </p>
                      <button type="button" className="quiz-next" onClick={closeStage}>
                        返回路线 →
                      </button>
                    </>
                  ) : null}
                </>
              )}

              {feedback ? <p className="quiz-why">{feedback}</p> : null}
            </div>
          </div>
        ) : null}

        {/* 全部通关：只作祝贺提示，不带任何按钮，2 秒后自动消失 */}
        {result ? (
          <div className="quiz-overlay" role="status" aria-live="polite">
            <div className="quiz-panel congrats-panel">
              <div className="congrats-title">修复完成</div>
              <div className="congrats-stage">{stage.name}</div>
              <p className="congrats-text">
                五块碎片已全部归位，{stage.name}重现原貌。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

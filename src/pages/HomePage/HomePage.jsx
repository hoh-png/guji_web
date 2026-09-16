import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../api/loginApi.js'
import ModuleCard from '../../components/ModuleCard/ModuleCard.jsx'
import { HOME_MODULES } from '../../constants/homeModules.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import './HomePage.css'

/**
 * 功能主页（对应原 index.html）
 *
 * 结构：
 *   顶部标题栏 → 返回登录 → 三个可点击模块
 * 背景图与模块热区位置由 HomePage.css 控制（沿用原 css/style.css 的主页区块）。
 */
export default function HomePage() {
  usePageTitle('古迹修复系统 · 功能主页')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    getCurrentUser().then((result) => {
      if (!cancelled && !result.ok) navigate(ROUTES.LOGIN, { replace: true })
    })

    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleLogout(event) {
    event.preventDefault()
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="page home-page">
      {/* 顶部标题栏 */}
      <div className="home-head">
        <h1>古迹修复系统</h1>
        <p>—— 数字化文脉传承 · 沉浸式科普体验 ——</p>
      </div>

      {/* 返回登录 */}
      <Link className="back-link" to={ROUTES.LOGIN} onClick={handleLogout}>
        ← 返回登录
      </Link>

      {/* 三个功能模块 */}
      {HOME_MODULES.map((module) => (
        <ModuleCard
          key={module.id}
          id={module.id}
          tag={module.tag}
          hint={module.hint}
          title={module.title}
          to={module.to}
        />
      ))}
    </div>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage/LoginPage.jsx'
import HomePage from './pages/HomePage/HomePage.jsx'
import SciencePage from './pages/SciencePage/SciencePage.jsx'
import GamePage from './pages/GamePage/GamePage.jsx'
import QuizPage from './pages/QuizPage/QuizPage.jsx'
import { ROUTES } from './constants/routes.js'

/**
 * 应用路由表（页面跳转关系的唯一出处）。
 *
 * 路由路径刻意与原版静态站点保持一致，这样：
 *  - 页面之间的跳转关系（登录 → 主页 → 三个子页面）与原版完全等价；
 *  - 进入子页面后，浏览器地址栏显示 /pages/science.html，
 *    和原版 pages/science.html 的观感一致。
 *
 * 注意：这些路径是「根路径绝对地址」，因此应用必须部署在站点根目录下
 * （或由 Nginx 的 try_files 之类的规则把 /pages/* 回退到 index.html）。
 */
export default function App() {
  return (
    <Routes>
      {/* 登录页（原 login.html） */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />

      {/* 功能主页（原 index.html） */}
      <Route path={ROUTES.HOME} element={<HomePage />} />

      {/* 三个子页面（原 pages/*.html） */}
      <Route path={ROUTES.SCIENCE} element={<SciencePage />} />
      <Route path={ROUTES.GAME} element={<GamePage />} />
      <Route path={ROUTES.QUIZ} element={<QuizPage />} />

      {/* 未匹配到的地址一律回到登录页，避免出现空白页 */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  )
}

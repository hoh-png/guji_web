import { Navigate, Route, Routes } from 'react-router-dom'
import AppPreloader from './components/AppPreloader/AppPreloader.jsx'
import LoginPage from './pages/LoginPage/LoginPage.jsx'
import HomePage from './pages/HomePage/HomePage.jsx'
import SciencePage from './pages/SciencePage/SciencePage.jsx'
import GamePage from './pages/GamePage/GamePage.jsx'
import QuizPage from './pages/QuizPage/QuizPage.jsx'
import ShopPage from './pages/ShopPage/ShopPage.jsx'
import WorkshopPage from './pages/WorkshopPage/WorkshopPage.jsx'
import ProfilePage from './pages/ProfilePage/ProfilePage.jsx'
import { ROUTES } from './constants/routes.js'

/**
 * 应用路由表（页面跳转关系的唯一出处）。
 *
 * 路由路径统一采用「*.html」风格，与站点的静态页面地址习惯一致，
 * 各级页面之间的跳转关系一目了然。
 *
 * 注意：这些路径是「根路径绝对地址」，因此应用必须部署在站点根目录下
 * （或由 Nginx 的 try_files 之类的规则把 /pages/* 回退到 index.html）。
 */
export default function App() {
  return (
    <>
      {/* 图片预加载：切换场景时图片已在缓存里，不会闪 */}
      <AppPreloader />

      <Routes>
      {/* 登录页 */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />

      {/* 功能主页 */}
      <Route path={ROUTES.HOME} element={<HomePage />} />

      {/* 科普与知识挑战 */}
      <Route path={ROUTES.SCIENCE} element={<SciencePage />} />
      <Route path={ROUTES.QUIZ} element={<QuizPage />} />

      {/* 修复玩法：玩法介绍页 + 修复工坊 */}
      <Route path={ROUTES.GAME} element={<GamePage />} />
      <Route path={ROUTES.WORKSHOP} element={<WorkshopPage />} />

      {/* 道具商店与个人中心 */}
      <Route path={ROUTES.SHOP} element={<ShopPage />} />
      <Route path={ROUTES.PROFILE} element={<ProfilePage />} />

      {/* 未匹配到的地址一律回到登录页，避免出现空白页 */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </>
  )
}

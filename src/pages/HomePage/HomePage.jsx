import { Link } from 'react-router-dom'
import ModuleCard from '../../components/ModuleCard/ModuleCard.jsx'
import CurrencyChip from '../../components/museum/CurrencyChip.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { HOME_MODULES } from '../../constants/homeModules.js'
import { ROUTES } from '../../constants/routes.js'
import { HOME_BACKGROUND } from '../../data/images.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import useImagePreload from '../../hooks/useImagePreload.js'
import './HomePage.css'

/** 常用功能：用紧凑入口承载，避免与三个大模块热区争夺背景画面 */
const UTILITIES = [
  { id: 'util-shop', label: '道具商店', to: ROUTES.SHOP },
  { id: 'util-profile', label: '个人中心', to: ROUTES.PROFILE },
]

/**
 * 功能主页
 *
 * 结构：顶部标题栏 → 返回登录 → 三个模块热区 → 右下角常用功能入口
 * 背景图与模块热区位置由 HomePage.css 控制。
 */
export default function HomePage() {
  usePageTitle('古迹修复系统 · 功能主页')

  const { state } = usePlayer()

  /*
   * 主页背景是整屏铺满的大图，等空闲再预热会看到一块空白，
   * 所以这里进入主页就立即预热（并预解码），绘制时直接命中。
   */
  useImagePreload([HOME_BACKGROUND], { immediate: true })

  return (
    <div className="page home-page">
      {/* 顶部标题栏 */}
      <div className="home-head">
        <h1>古迹修复系统</h1>
        <p>—— 数字化文脉传承 · 沉浸式科普体验 ——</p>
      </div>

      {/* 返回登录 */}
      <Link className="back-link" to={ROUTES.LOGIN}>
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

      {/* 常用功能：道具商店 / 个人中心 */}
      <div className="home-utils" id="home-utils">
        <span className="utils-label">
          常用功能 ·
          <CurrencyChip kind="copper" value={state.copper} size="sm" />
          <CurrencyChip kind="ingot" value={state.ingot} size="sm" />
        </span>
        <div className="utils-row">
          {UTILITIES.map((item) => (
            /* state.from 让商店的返回按钮知道该回到主页 */
            <Link className="util-item" id={item.id} key={item.id} to={item.to} state={{ from: ROUTES.HOME }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

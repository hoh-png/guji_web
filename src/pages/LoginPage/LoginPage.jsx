import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InlineLink from '../../components/InlineLink/InlineLink.jsx'
import Toast from '../../components/Toast/Toast.jsx'
import {
  FORGOT_PASSWORD_TIP,
  getCurrentUser,
  submitLogin,
  submitRegister,
} from '../../api/loginApi.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import './LoginPage.css'

/**
 * 登录页（对应原 login.html）
 *
 * 保留原登录卡片布局，在卡片内切换登录和注册模式。
 * 成功后由后端设置 HttpOnly Cookie，再跳转到功能主页。
 */
export default function LoginPage() {
  usePageTitle('古迹修复系统 · 登录')

  const navigate = useNavigate()
  const toastRef = useRef(null)
  const redirectTimerRef = useRef(null)

  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [mode, setMode] = useState('login')
  const isRegister = mode === 'register'

  // 组件卸载时清掉待执行的跳转定时器，避免离开登录页后仍触发跳转
  useEffect(() => {
    let cancelled = false

    getCurrentUser().then((result) => {
      if (!cancelled && result.ok) navigate(ROUTES.HOME, { replace: true })
    })

    return () => {
      cancelled = true
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    const submit = isRegister ? submitRegister : submitLogin
    const result = await submit({
      account: account.trim(),
      password,
    })

    toastRef.current?.show(result.tip)

    if (result.ok) {
      redirectTimerRef.current = setTimeout(() => navigate(ROUTES.HOME), result.redirectDelay)
    }
  }

  return (
    <div className="page login-page">
      {/* 登录卡片 */}
      <div className="login-card">
        <div className="login-title">古迹修复系统</div>
        <div className="login-sub">传承千年文脉，修复历史印记</div>

        <form id="loginForm" noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="account">修复师账号</label>
            <input
              type="text"
              id="account"
              placeholder="请输入您的工作账号"
              autoComplete="username"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">登录密码</label>
            <input
              type="password"
              id="password"
              placeholder="请输入您的登录密码"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="row-opt">
            <label>
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{' '}
              记住本次登录状态
            </label>
            <InlineLink onClick={() => toastRef.current?.show(FORGOT_PASSWORD_TIP)}>
              忘记密码?
            </InlineLink>
          </div>

          <button type="submit" className="btn-login">
            {isRegister ? '注册并登录' : '登录系统'}
          </button>
        </form>

        <div className="apply-link">
          {isRegister ? '已经有账号？' : '还没有账号？'}
          <InlineLink
            onClick={() => {
              setMode(isRegister ? 'login' : 'register')
              toastRef.current?.show(
                isRegister ? '已切换到登录' : '请输入账号和至少 8 位密码完成注册',
              )
            }}
          >
            {isRegister ? '返回登录' : '立即注册修复师账号'}
          </InlineLink>
        </div>
      </div>

      <div className="copy">©2026 古迹修复数字化平台 文化遗产保护中心</div>

      {/* 提示浮层 */}
      <Toast ref={toastRef} />
    </div>
  )
}

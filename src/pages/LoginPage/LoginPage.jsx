import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InlineLink from '../../components/InlineLink/InlineLink.jsx'
import Toast from '../../components/Toast/Toast.jsx'
import {
  APPLY_ACCOUNT_TIP,
  FORGOT_PASSWORD_TIP,
  submitLogin,
} from '../../api/loginApi.js'
import { ROUTES } from '../../constants/routes.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import './LoginPage.css'

/**
 * 登录页（对应原 login.html）
 *
 * 行为与原版 js/main.js 完全一致：
 *  1. 提交时先校验「账号 / 密码」是否填写，为空则提示并中断；
 *  2. 校验通过 → 提示「登录成功，正在进入系统…」，600ms 后跳转主页；
 *  3. 「忘记密码」「立即申请修复师权限」为提示型链接，不跳转。
 */
export default function LoginPage() {
  usePageTitle('古迹修复系统 · 登录')

  const navigate = useNavigate()
  const toastRef = useRef(null)
  const redirectTimerRef = useRef(null)

  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  // 组件卸载时清掉待执行的跳转定时器，避免离开登录页后仍触发跳转
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()

    const result = await submitLogin({
      account: account.trim(),
      password: password.trim(),
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
              autoComplete="current-password"
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
            登录系统
          </button>
        </form>

        <div className="apply-link">
          还没有账号？
          <InlineLink onClick={() => toastRef.current?.show(APPLY_ACCOUNT_TIP)}>
            立即申请修复师权限
          </InlineLink>
        </div>
      </div>

      <div className="copy">©2026 古迹修复数字化平台 文化遗产保护中心</div>

      {/* 提示浮层 */}
      <Toast ref={toastRef} />
    </div>
  )
}

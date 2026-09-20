/** 登录与注册请求集中在此处，页面组件不直接拼接接口地址。 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function notifyAuthChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('guji-auth-changed'))
}

/** 登录成功提示语 */
export const LOGIN_SUCCESS_TIP = '登录成功，正在进入系统…'

/** 跳转主页前的停留时间（毫秒），与原版 setTimeout 600 一致 */
export const LOGIN_REDIRECT_DELAY = 600

/** 忘记密码提示语 */
export const FORGOT_PASSWORD_TIP = '请联系管理员重置密码'

/** 申请权限提示语 */
export const REGISTER_SUCCESS_TIP = '注册成功，正在进入系统…'

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json().catch(() => ({}))
    return {
      ok: response.ok,
      status: response.status,
      ...data,
    }
  } catch {
    return {
      ok: false,
      status: 0,
      message: '无法连接服务器，请确认后端已启动',
    }
  }
}

/**
 * 校验登录表单，返回第一条错误提示；校验通过返回空字符串。
 * @param {{ account: string, password: string }} values
 */
export function validateLoginForm({ account, password }) {
  if (!account) return '请先输入修复师账号'
  if (!password) return '请先输入登录密码'
  return ''
}

/**
 * 提交登录，后端通过 HttpOnly Cookie 保存登录状态。
 * @param {{ account: string, password: string }} values
 * @returns {Promise<{ ok: boolean, tip: string, redirectDelay: number }>}
 */
export async function submitLogin(values) {
  const tip = validateLoginForm(values)
  if (tip) {
    return { ok: false, tip, redirectDelay: 0 }
  }

  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: values.account,
      password: values.password,
    }),
  })

  if (result.ok) notifyAuthChanged()

  return {
    ...result,
    tip: result.ok ? LOGIN_SUCCESS_TIP : result.message || '登录失败，请稍后重试',
    redirectDelay: result.ok ? LOGIN_REDIRECT_DELAY : 0,
  }
}

export function validateRegisterForm({ account, password }) {
  const loginTip = validateLoginForm({ account, password })
  if (loginTip) return loginTip
  if (password.length < 8) return '登录密码至少需要 8 位'
  return ''
}

export async function submitRegister(values) {
  const tip = validateRegisterForm(values)
  if (tip) return { ok: false, tip, redirectDelay: 0 }

  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: values.account,
      password: values.password,
    }),
  })

  if (result.ok) notifyAuthChanged()

  return {
    ...result,
    tip: result.ok ? REGISTER_SUCCESS_TIP : result.message || '注册失败，请稍后重试',
    redirectDelay: result.ok ? LOGIN_REDIRECT_DELAY : 0,
  }
}

export function getCurrentUser() {
  return request('/auth/me')
}

export async function logout() {
  const result = await request('/auth/logout', { method: 'POST' })
  if (result.ok) notifyAuthChanged()
  return result
}

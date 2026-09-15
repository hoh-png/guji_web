/**
 * 登录相关的模拟接口与常量。
 *
 * 原版 js/main.js 中的登录逻辑是「演示模式」：只要账号和密码都不为空，
 * 就提示登录成功并跳转主页（演示账号 admin / 123456 亦走同一路径）。
 * 这里保持完全一致的行为，并把将来接真实后端时该改的位置集中到一处。
 */

/** 登录成功提示语 */
export const LOGIN_SUCCESS_TIP = '登录成功，正在进入系统…'

/** 跳转主页前的停留时间（毫秒），与原版 setTimeout 600 一致 */
export const LOGIN_REDIRECT_DELAY = 600

/** 忘记密码提示语 */
export const FORGOT_PASSWORD_TIP = '请联系管理员重置密码'

/** 申请权限提示语 */
export const APPLY_ACCOUNT_TIP = '申请通道即将开放，请留意平台通知'

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
 * 提交登录。当前为演示实现：校验通过即视为登录成功。
 * @param {{ account: string, password: string }} values
 * @returns {Promise<{ ok: boolean, tip: string, redirectDelay: number }>}
 */
export function submitLogin(values) {
  const tip = validateLoginForm(values)
  if (tip) {
    return Promise.resolve({ ok: false, tip, redirectDelay: 0 })
  }
  return Promise.resolve({
    ok: true,
    tip: LOGIN_SUCCESS_TIP,
    redirectDelay: LOGIN_REDIRECT_DELAY,
  })
}

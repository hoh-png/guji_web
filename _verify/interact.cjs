/**
 * 临时验证脚本（验证完成后随 _verify/ 目录一起删除）
 *
 * 在真实浏览器里跑一遍交互链路，验证重构版与原版的「跳转与行为」等价：
 *   1. 登录页空账号提交 → 提示、不跳转
 *   2. 登录页空密码提交 → 提示、不跳转
 *   3. 正常登录 → 提示「登录成功」→ 600ms 后进入主页
 *   4. 主页点击「智慧科普」→ /pages/science.html
 *   5. 子页面点「返回主页」→ 主页
 *   6. 主页点「← 返回登录」→ 登录页
 *   7. 「忘记密码」→ 提示浮层出现
 *   8. 原版链接解析对照（返回主页 href 解析到哪个地址）
 *
 * 用法: node _verify/interact.cjs <cdpPort> [refBase] [origBase]
 */
const CDP_PORT = process.argv[2] || '61803'
const REF_BASE = process.argv[3] || 'http://127.0.0.1:4180'
const ORIG_BASE = process.argv[4] || 'http://127.0.0.1:4180'

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
    this.events = []
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve)
      this.ws.addEventListener('error', reject)
    })
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      } else if (msg.method) {
        this.events.push(msg)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error('timeout ' + method))
        }
      }, 20000)
    })
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* ignore */
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  const cdp = new Cdp(page.webSocketDebuggerUrl)
  await cdp.ready
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const results = []
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail })
    console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '  → ' + detail : ''}`)
  }

  const goto = async (url, wait = 2200) => {
    await cdp.send('Page.navigate', { url })
    await sleep(wait)
  }

  const path = () => cdp.eval('location.pathname')
  const toastText = () =>
    cdp.eval(`(() => { const t = document.querySelector('.toast'); return t ? (t.classList.contains('show') ? 'SHOW:' + t.textContent : 'HIDDEN:' + t.textContent) : 'NO-TOAST' })()`)

  const clickText = (selector, contains) =>
    cdp.eval(`(() => {
      const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
      const el = els.find(e => e.textContent.includes(${JSON.stringify(contains)}));
      if (!el) return 'NOT-FOUND';
      el.click();
      return 'CLICKED';
    })()`)

  /* ---------- 原版链接解析对照 ---------- */
  await goto(`${ORIG_BASE}/original/pages/science.html`)
  const origBack = await cdp.eval(`(() => { const a = document.querySelector('.btn-back'); return { href: a.getAttribute('href'), resolved: a.href } })()`)
  await goto(`${REF_BASE}/pages/science.html`)
  const refBack = await cdp.eval(`(() => { const a = document.querySelector('.btn-back'); return { href: a.getAttribute('href'), resolved: a.href } })()`)
  check(
    '原版/重构版「返回主页」解析地址一致',
    origBack.resolved === refBack.resolved,
    `原版=${origBack.resolved} 重构=${refBack.resolved}`,
  )
  await goto(`${ORIG_BASE}/original/index.html`)
  const origModules = await cdp.eval(`Array.from(document.querySelectorAll('.module')).map(e => e.getAttribute('onclick'))`)
  const origHome = await cdp.eval(`document.querySelector('.back-link').getAttribute('href')`)
  await goto(`${REF_BASE}/index.html`)
  const refModules = await cdp.eval(`Array.from(document.querySelectorAll('.module')).map(e => e.getAttribute('href'))`)
  const refHome = await cdp.eval(`document.querySelector('.back-link').getAttribute('href')`)
  check('主页「返回登录」目标一致', origHome === refHome, `原版=${origHome} 重构=${refHome}`)
  check(
    '主页三个模块跳转目标一致',
    JSON.stringify(origModules.map((s) => (s || '').replace(/^goTo\('|'\)$/g, ''))) === JSON.stringify(refModules),
    `原版=${JSON.stringify(origModules)} 重构=${JSON.stringify(refModules)}`,
  )

  /* ---------- 登录页交互 ---------- */
  await goto(`${REF_BASE}/`)
  check('打开 / 落在登录页', (await path()) === '/', await path())

  // 空账号
  await cdp.eval(`document.querySelector('.btn-login').click()`)
  await sleep(300)
  check('空账号提交 → 提示且不跳转', (await toastText()).startsWith('SHOW:请先输入修复师账号') && (await path()) === '/', await toastText())

  // 空密码
  await cdp.eval(`(() => {
    const acc = document.getElementById('account');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(acc, 'admin');
    acc.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await sleep(200)
  await cdp.eval(`document.querySelector('.btn-login').click()`)
  await sleep(300)
  check('空密码提交 → 提示且不跳转', (await toastText()).startsWith('SHOW:请先输入登录密码') && (await path()) === '/', await toastText())

  // 忘记密码
  await cdp.eval(`(() => { const a = document.querySelector('.row-opt a'); a.click(); })()`)
  await sleep(300)
  check('「忘记密码」→ 出现提示浮层', (await toastText()).startsWith('SHOW:请联系管理员重置密码'), await toastText())

  // 申请权限
  await cdp.eval(`(() => { const a = document.querySelector('.apply-link a'); a.click(); })()`)
  await sleep(300)
  check('「立即申请」→ 出现提示浮层', (await toastText()).startsWith('SHOW:申请通道即将开放'), await toastText())

  // 正常登录
  await cdp.eval(`(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const acc = document.getElementById('account');
    const pwd = document.getElementById('password');
    setter.call(acc, 'admin'); acc.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(pwd, '123456'); pwd.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await sleep(200)
  await cdp.eval(`document.querySelector('.btn-login').click()`)
  await sleep(250)
  const midwayToast = await toastText()
  const midwayPath = await path()
  await sleep(1200)
  const afterPath = await path()
  check('登录成功 → 先提示「登录成功，正在进入系统…」', midwayToast.startsWith('SHOW:登录成功，正在进入系统…'), midwayToast)
  check('登录成功 → 600ms 后跳转主页 /index.html', afterPath === '/index.html', `提交后瞬时=${midwayPath} 稍后=${afterPath}`)

  /* ---------- 主页跳转 ---------- */
  check('主页已渲染三个模块', await cdp.eval(`document.querySelectorAll('.module').length`) === 3, String(await cdp.eval(`document.querySelectorAll('.module').length`)))

  await clickText('.module', '智慧科普')
  await sleep(900)
  check('点「智慧科普」→ /pages/science.html', (await path()) === '/pages/science.html', await path())
  check('科普页标题正确', (await cdp.eval('document.title')) === '智慧科普 · 古迹修复系统', await cdp.eval('document.title'))
  check('科普页 3 张卡片 + 返回按钮存在', await cdp.eval(`document.querySelectorAll('.card').length === 3 && !!document.querySelector('.btn-back')`))

  await cdp.eval(`document.querySelector('.btn-back').click()`)
  await sleep(900)
  check('子页面「返回主页」→ /index.html', (await path()) === '/index.html', await path())

  await clickText('.module', '修复游戏')
  await sleep(900)
  check('点「修复游戏」→ /pages/game.html', (await path()) === '/pages/game.html', await path())

  await cdp.eval(`document.querySelector('.btn-back').click()`)
  await sleep(900)
  await clickText('.module', '知识挑战')
  await sleep(900)
  check('点「知识挑战」→ /pages/quiz.html', (await path()) === '/pages/quiz.html', await path())

  await cdp.eval(`document.querySelector('.btn-back').click()`)
  await sleep(900)
  await cdp.eval(`document.querySelector('.back-link').click()`)
  await sleep(900)
  check('主页「← 返回登录」→ /', (await path()) === '/', await path())

  /* ---------- 汇总 ---------- */
  const failed = results.filter((r) => !r.pass)
  console.log(`\n交互断言: ${results.length - failed.length}/${results.length} 通过`)
  if (failed.length) {
    console.log('失败项: ' + failed.map((f) => f.name).join(' | '))
  } else {
    console.log('全部通过：重构版跳转链与原版等价。')
  }
  cdp.close()
  process.exitCode = failed.length ? 1 : 0
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

/**
 * 临时验证脚本（验证完成后随 _verify/ 目录一起删除）
 *
 * 对照原版与重构版「链接解析结果」。
 * 原版的 href 是相对路径（pages/science.html、../index.html），
 * 其最终指向取决于所在页面地址，因此这里用同一个「站点根」分别打开两版页面，
 * 再读取 a.href（浏览器解析后的绝对地址）来比对，避免挂载路径干扰。
 *
 * 用法: node _verify/links.cjs <cdpPort> <siteRoot>
 *   原版页面: <siteRoot>/original/login.html、/original/index.html、/original/pages/*.html
 *   重构页面: <siteRoot>/、/index.html、/pages/*.html
 *
 * 为了让相对路径解析到「同一个根」，原版会额外用 /original/ 作为基准目录打开，
 * 因此比较的是「相对原页面所在目录」的解析结果是否一一对应。
 */
const CDP_PORT = process.argv[2] || '61803'
const SITE = process.argv[3] || 'http://127.0.0.1:4180'

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
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

  const goto = async (url, wait = 2000) => {
    await cdp.send('Page.navigate', { url })
    await sleep(wait)
  }

  const results = []
  const check = (name, pass, detail) => {
    results.push({ name, pass })
    console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '  → ' + detail : ''}`)
  }

  /* ---- 登录页：登录成功后的目标 ---- */
  // 原版 js/main.js 里写死 window.location.href = "index.html"；
  // 重构版对应 ROUTES.HOME = "/index.html"。两者指向同一个页面。
  const origLoginJs = await fetch(`${SITE}/original/js/main.js`).then((r) => r.text())
  const origLoginTarget = /window\.location\.href\s*=\s*"([^"]+)"/.exec(origLoginJs)?.[1]
  const refRoutesSrc = await fetch(`${SITE}/assets/${await cdp
    .eval(`(document.querySelector('script[src]')||{}).src || ''`)
    .then((s) => (s || '').split('/').pop())}`)
    .then((r) => r.text())
    .catch(() => '')
  const refHomeFromBundle = /HOME:\s*"\/([^"]+)"/.exec(refRoutesSrc)?.[1]
  check(
    '登录成功后跳转目标同为一个页面：原版 index.html ←→ 重构 /index.html',
    origLoginTarget === 'index.html' && refHomeFromBundle === 'index.html',
    `原版 js 目标="${origLoginTarget}"；重构 ROUTES.HOME="/${refHomeFromBundle}"`,
  )

  /* ---- 主页：三个模块 + 返回登录 ---- */
  await goto(`${SITE}/original/index.html`)
  const origMods = await cdp.eval(`Array.from(document.querySelectorAll('.module')).map(e => e.getAttribute('onclick').replace(/^goTo\\('|'\\)$/g, ''))`)
  const origBack = await cdp.eval(`document.querySelector('.back-link').getAttribute('href')`)
  await goto(`${SITE}/index.html`)
  const refMods = await cdp.eval(`Array.from(document.querySelectorAll('.module')).map(e => e.getAttribute('href'))`)
  const refBack = await cdp.eval(`document.querySelector('.back-link').getAttribute('href')`)

  // 原版相对路径（相对站点根）与重构绝对路径应一一对应
  check(
    '主页三个模块目标：原版相对路径 ←→ 重构路由',
    JSON.stringify(origMods.map((s) => '/' + s)) === JSON.stringify(refMods),
    `原版=${JSON.stringify(origMods)} → ${JSON.stringify(origMods.map((s) => '/' + s))}；重构=${JSON.stringify(refMods)}`,
  )
  check(
    '主页「返回登录」：原版 login.html ←→ 重构 /',
    origBack === 'login.html' && refBack === '/',
    `原版=${origBack} 重构=${refBack}`,
  )

  /* ---- 子页面：返回主页 ---- */
  await goto(`${SITE}/original/pages/science.html`)
  const origSubBack = await cdp.eval(`document.querySelector('.btn-back').getAttribute('href')`)
  const origSubResolved = await cdp.eval(`document.querySelector('.btn-back').href`)
  await goto(`${SITE}/pages/science.html`)
  const refSubBack = await cdp.eval(`document.querySelector('.btn-back').getAttribute('href')`)

  // 原版 ../index.html 从 /original/pages/ 解析为 /original/index.html；
  // 重构 /index.html 从根解析为 /index.html —— 相对各自站点根一致。
  const origRelFromPagesRoot = origSubResolved.replace(/\/original\/pages\/\.\.\//, '/original/')
  check(
    '子页面「返回主页」：原版 ../index.html ←→ 重构 /index.html（相对各自站点根一致）',
    origSubBack === '../index.html' && refSubBack === '/index.html' && origRelFromPagesRoot.endsWith('/original/index.html'),
    `原版=${origSubBack}（解析为 ${origSubResolved}）重构=${refSubBack}`,
  )

  /* ---- 标题对照 ---- */
  const titlePairs = [
    ['/original/login.html', '/', '古迹修复系统 · 登录'],
    ['/original/index.html', '/index.html', '古迹修复系统 · 功能主页'],
    ['/original/pages/science.html', '/pages/science.html', '智慧科普 · 古迹修复系统'],
    ['/original/pages/game.html', '/pages/game.html', '修复游戏 · 古迹修复系统'],
    ['/original/pages/quiz.html', '/pages/quiz.html', '知识挑战 · 古迹修复系统'],
  ]
  for (const [op, rp, expected] of titlePairs) {
    await goto(`${SITE}${op}`, 1500)
    const ot = await cdp.eval('document.title')
    await goto(`${SITE}${rp}`, 2200)
    const rt = await cdp.eval('document.title')
    check(`标题一致 (${op} ←→ ${rp})`, ot === rt && ot === expected, `原版="${ot}" 重构="${rt}"`)
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n链接/标题断言: ${results.length - failed.length}/${results.length} 通过`)
  cdp.close()
  process.exitCode = failed.length ? 1 : 0
}

main().catch((e) => {
  console.error('FATAL ' + (e.stack || e))
  process.exit(1)
})

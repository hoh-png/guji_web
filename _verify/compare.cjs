/**
 * 临时验证脚本（验证完成后随 _verify/ 目录一起删除）
 *
 * 通过 CDP 依次打开「原版静态站点」与「React 重构版」的对应页面，
 * 测量关键元素的几何位置与计算样式，做逐项数值比对。
 *  - 几何：getBoundingClientRect（渲染后的真实位置）
 *  - 样式：getComputedStyle（级联后的真实值）
 *
 * 两类已知的「非差异」会被归一化后忽略：
 *  1. 背景图 URL 的路径前缀不同（/original/images/... vs /images/...），只比较文件名；
 *  2. HTML 源码里的空白文本节点（换行缩进）——原版有、JSX 里没有。
 *     这类差异不影响渲染，单独统计为「空白差异」。
 */
const fs = require('fs')
const path = require('path')

const CDP_PORT = process.argv[2] || '61803'
const OUT_DIR = __dirname
const BASE = 'http://127.0.0.1:4180'

/* ------------------------------ CDP 客户端 ------------------------------ */
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
    this.events = []
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve())
      this.ws.addEventListener('error', (e) => reject(new Error('ws error: ' + (e.message || 'unknown'))))
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
          reject(new Error(`timeout: ${method}`))
        }
      }, 30000)
    })
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) {
      throw new Error('eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    }
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

async function getPageTarget() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target found')
  return page
}

/* --------------------------- 页面内测量脚本 --------------------------- */
const MEASURE_FN = `(() => {
  const round = (n) => Math.round(n * 100) / 100;
  const pick = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const own = {};
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      own[prop] = el.style.getPropertyValue(prop);
    }
    return {
      rect: { x: round(r.x + window.scrollX), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
      style: {
        position: cs.position, left: cs.left, top: cs.top, right: cs.right, bottom: cs.bottom,
        width: cs.width, height: cs.height, padding: cs.padding, margin: cs.margin,
        backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage,
        backgroundSize: cs.backgroundSize, backgroundPosition: cs.backgroundPosition,
        backgroundRepeat: cs.backgroundRepeat, borderRadius: cs.borderRadius,
        borderTop: cs.borderTop, borderRight: cs.borderRight, borderBottom: cs.borderBottom, borderLeft: cs.borderLeft,
        borderColor: cs.borderColor, borderStyle: cs.borderStyle, borderWidth: cs.borderWidth,
        boxShadow: cs.boxShadow, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing, color: cs.color, textAlign: cs.textAlign, textIndent: cs.textIndent,
        textDecorationLine: cs.textDecorationLine, lineHeight: cs.lineHeight, opacity: cs.opacity,
        display: cs.display, flexDirection: cs.flexDirection, alignItems: cs.alignItems, justifyContent: cs.justifyContent,
        transform: cs.transform, cursor: cs.cursor, overflow: cs.overflow, zIndex: cs.zIndex, visibility: cs.visibility,
        textShadow: cs.textShadow, backdropFilter: cs.backdropFilter, gap: cs.gap, listStyleType: cs.listStyleType,
      },
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim(),
      textSquashed: (el.textContent || '').replace(/\\s+/g, ''),
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: typeof el.className === 'string' ? el.className : (el.getAttribute('class') || ''),
      inlineStyle: own,
      childCount: el.children.length,
    };
  };
  const out = { title: document.title, selectors: {} };
  for (const sel of SELECTORS) out.selectors[sel] = pick(document.querySelector(sel));
  out.bodyOverflow = getComputedStyle(document.body).overflow;
  out.htmlOverflow = getComputedStyle(document.documentElement).overflow;
  out.bodyFont = getComputedStyle(document.body).fontFamily;
  out.bodyColor = getComputedStyle(document.body).color;
  out.docHeight = document.documentElement.scrollHeight;
  out.docWidth = document.documentElement.scrollWidth;
  return out;
})()`

/* -------------------------------- 比对逻辑 -------------------------------- */
// 这些属性的差异算「几何/排版级」差异，用像素容差
const PIXEL_TOLERANT = new Set(['width', 'height', 'padding', 'margin', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderColor', 'borderStyle', 'borderWidth', 'fontSize', 'letterSpacing', 'lineHeight', 'borderRadius', 'gap', 'fontFamily', 'fontWeight', 'listStyleType'])

/** 归一化背景图里的绝对 URL，只比较文件名（部署位置不同造成的差异不算差异） */
function normalizeUrl(value) {
  if (typeof value !== 'string') return value
  return value.replace(/url\((["']?)(https?:\/\/[^)"']*\/)([^)"']*)\1\)/g, 'url($1$3$1)')
}

function compare(orig, ref, tolerance) {
  const diffs = []
  if (!orig && !ref) return diffs
  if (!orig || !ref) {
    diffs.push({ field: 'existence', orig: orig ? 'present' : 'MISSING', ref: ref ? 'present' : 'MISSING' })
    return diffs
  }

  for (const k of ['x', 'y', 'w', 'h']) {
    const delta = Math.abs(orig.rect[k] - ref.rect[k])
    if (delta > tolerance) {
      diffs.push({ field: `rect.${k}`, orig: orig.rect[k], ref: ref.rect[k], delta: Math.round(delta * 100) / 100 })
    }
  }

  for (const key of Object.keys(orig.style)) {
    let a = orig.style[key]
    let b = ref.style[key]
    if (key === 'backgroundImage') {
      a = normalizeUrl(a)
      b = normalizeUrl(b)
    }
    if (a === b) continue
    // transform 矩阵允许极小数值误差
    if (key === 'transform') {
      const nums = (s) => (String(s).match(/-?\\d+(\\.\\d+)?/g) || []).map(Number)
      const na = nums(a)
      const nb = nums(b)
      if (na.length === nb.length && na.every((v, i) => Math.abs(v - nb[i]) < 0.01)) continue
    }
    diffs.push({ field: `style.${key}`, orig: a, ref: b, pixelTolerant: PIXEL_TOLERANT.has(key) })
  }

  if (orig.tag !== ref.tag) diffs.push({ field: 'tag', orig: orig.tag, ref: ref.tag })
  if (orig.text !== ref.text) {
    // 仅空白差异：渲染结果不受影响
    diffs.push({
      field: 'text.whitespaceOnly',
      orig: orig.text,
      ref: ref.text,
      whitespaceOnly: orig.textSquashed === ref.textSquashed,
    })
  }
  return diffs
}

/* --------------------------------- 页面清单 --------------------------------- */
const PAGES = [
  {
    name: '登录页',
    orig: `${BASE}/original/login.html`,
    ref: `${BASE}/`,
    selectors: ['.page', '.login-card', '.login-title', '.login-sub', 'form', '.field', '.field label', '.field input', '.row-opt', '.row-opt label', '.row-opt input[type="checkbox"]', '.row-opt a', '.btn-login', '.apply-link', '.apply-link a', '.copy', '.toast'],
  },
  {
    name: '主页',
    orig: `${BASE}/original/index.html`,
    ref: `${BASE}/index.html`,
    selectors: ['.page', '.home-head', '.home-head h1', '.home-head p', '.back-link', '#mod-science', '#mod-science .tag', '#mod-science .hint', '#mod-game', '#mod-game .tag', '#mod-game .hint', '#mod-quiz', '#mod-quiz .tag', '#mod-quiz .hint'],
  },
  {
    name: '智慧科普',
    orig: `${BASE}/original/pages/science.html`,
    ref: `${BASE}/pages/science.html`,
    selectors: ['.sub-page', '.wrap', '.wrap h1', '.card', '.card h2', '.card p', '.card ul', '.card ul li', '.card ul li strong', '.btn-back'],
  },
  {
    name: '修复游戏',
    orig: `${BASE}/original/pages/game.html`,
    ref: `${BASE}/pages/game.html`,
    selectors: ['.sub-page', '.wrap', '.wrap h1', '.card', '.card h2', '.card p', '.card ul', '.card ul li', '.btn-back'],
  },
  {
    name: '知识挑战',
    orig: `${BASE}/original/pages/quiz.html`,
    ref: `${BASE}/pages/quiz.html`,
    selectors: ['.sub-page', '.wrap', '.wrap h1', '.card', '.card h2', '.card p', '.card ul', '.card ul li', '.btn-back'],
  },
]

/* --------------------------------- 主流程 --------------------------------- */
async function main() {
  const target = await getPageTarget()
  const cdp = new Cdp(target.webSocketDebuggerUrl)
  await cdp.ready
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const report = { generatedAt: new Date().toISOString(), pages: [] }

  for (const page of PAGES) {
    const run = async (url) => {
      cdp.events.length = 0
      await cdp.send('Page.navigate', { url })
      await sleep(2000)
      const data = await cdp.eval(`const SELECTORS = ${JSON.stringify(page.selectors)}; ${MEASURE_FN}`)
      const errors = []
      for (const msg of cdp.events) {
        if (msg.method === 'Runtime.exceptionThrown') {
          errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text)
        }
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
        }
      }
      data.errors = errors
      return data
    }

    const origData = await run(page.orig)
    const refData = await run(page.ref)

    const diffs = []
    for (const sel of page.selectors) {
      for (const item of compare(origData.selectors[sel], refData.selectors[sel], 1.5)) {
        diffs.push({ selector: sel, ...item })
      }
    }
    if (origData.title !== refData.title) {
      diffs.push({ selector: '(document)', field: 'title', orig: origData.title, ref: refData.title })
    }

    report.pages.push({
      name: page.name,
      orig: page.orig,
      ref: page.ref,
      origData,
      refData,
      diffs,
      refErrors: refData.errors,
      origErrors: origData.errors,
    })

    const real = diffs.filter((d) => !d.whitespaceOnly)
    const ws = diffs.length - real.length
    console.log(`[${page.name}] 差异=${real.length}（其中仅空白差异 ${ws} 项）ref报错=${refData.errors.length}`)
  }

  fs.writeFileSync(path.join(OUT_DIR, 'compare-report.json'), JSON.stringify(report, null, 2), 'utf8')

  let total = 0
  for (const page of report.pages) {
    const real = page.diffs.filter((d) => !d.whitespaceOnly)
    const wsOnly = page.diffs.filter((d) => d.whitespaceOnly)
    console.log(`\n===== ${page.name} =====`)
    console.log(`  标题: 原版="${page.origData.title}"  重构="${page.refData.title}"`)
    if (page.refErrors.length) console.log('  重构版控制台报错: ' + JSON.stringify(page.refErrors, null, 2))
    if (!real.length) console.log('  ✓ 几何与样式测量项全部一致')
    for (const d of real) {
      total++
      console.log(`  ✗ ${d.selector} → ${d.field}\n      原版: ${JSON.stringify(d.orig)}\n      重构: ${JSON.stringify(d.ref)}`)
    }
    if (wsOnly.length) {
      console.log(`  · 仅空白差异 ${wsOnly.length} 项（DOM 源码缩进，渲染无影响）: ${wsOnly.map((d) => d.selector).join(', ')}`)
    }
  }
  console.log(`\n实质性差异总数: ${total}`)
  cdp.close()
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error('FATAL: ' + (error && error.stack ? error.stack : error))
    process.exit(1)
  },
)

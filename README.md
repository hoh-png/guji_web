# 古迹修复系统 · React 重构版

把原来的 4 个静态 HTML 页面（`login.html` / `index.html` / `pages/*.html`）重构成 React 单页应用。
**页面样式与页面跳转关系与原版一致，渲染结果经逐像素比对完全相同。**

---

## 一、快速开始

```bash
npm install      # 首次安装依赖
npm run dev      # 启动开发服务器 → http://localhost:5173
npm run build    # 打包到 dist/
npm run preview  # 本地预览打包结果
```

> 原版双击 HTML 就能看；重构版需要 Node 环境跑一次 `npm install`，这是唯一的额外成本。

---

## 二、目录结构（按职责分层，方便对照原版阅读）

```
guji_web/
├─ index.html                     # Vite 唯一的 HTML 入口（只挂载 #root）
├─ package.json                   # 依赖与脚本
├─ vite.config.js                 # 构建配置
├─ public/
│  └─ images/
│     ├─ img1.png                 # 主页背景图（原 images/img1.png）
│     └─ img2.png                 # 登录页背景图（原 images/img2.png）
│
└─ src/
   ├─ main.jsx                    # 应用入口：挂载 React + 引入全局样式 + BrowserRouter
   ├─ App.jsx                     # 路由表（页面跳转关系的唯一出处）
   │
   ├─ constants/                  # 常量配置：改这里就能改路径/文案
   │  ├─ routes.js                # 所有路由路径
   │  └─ homeModules.js           # 主页三个功能模块的配置
   │
   ├─ api/                        # 与后端交互的位置（当前为演示实现）
   │  └─ loginApi.js              # 登录校验、登录提交、各类提示语
   │
   ├─ hooks/                      # 可复用逻辑
   │  └─ usePageTitle.js          # 设置浏览器标签页标题
   │
   ├─ components/                 # 跨页面复用组件
   │  ├─ ModuleCard/              # 主页那张可点击的功能模块卡片
   │  ├─ SubPageLayout/           # 三个子页面的公共外壳（标题 + 卡片列表 + 返回主页）
   │  ├─ Toast/                   # 顶部提示浮层
   │  └─ InlineLink/              # 行内提示型链接（忘记密码 / 立即申请）
   │
   ├─ pages/                      # 一个页面一个文件夹
   │  ├─ LoginPage/               # 登录页（原 login.html）
   │  ├─ HomePage/                # 功能主页（原 index.html）
   │  ├─ SciencePage/             # 智慧科普（原 pages/science.html）
   │  ├─ GamePage/                # 修复游戏（原 pages/game.html）
   │  └─ QuizPage/                # 知识挑战（原 pages/quiz.html）
   │
   ├─ data/                       # 页面文案数据（与渲染逻辑分离）
   │  ├─ scienceContent.js
   │  ├─ gameContent.js
   │  └─ quizContent.js
   │
   └─ styles/                     # 样式：全局 + 按页面拆分
      ├─ global.css               # 设计变量（--ink / --brick / --paper …）与基础重置
      ├─ page.css                 # 全屏页面骨架 .page
      ├─ toast.css                # 提示浮层
      ├─ login.css                # 登录页
      ├─ home.css                 # 主页
      └─ subpage.css              # 三个子页面共用的 .sub-page 样式
```

### 原来的文件都去哪了？

| 原文件 | 重构后位置 |
| --- | --- |
| `login.html` | `src/pages/LoginPage/LoginPage.jsx` |
| `index.html` | `src/pages/HomePage/HomePage.jsx` |
| `pages/science.html` | `src/pages/SciencePage/SciencePage.jsx` + `src/data/scienceContent.js` |
| `pages/game.html` | `src/pages/GamePage/GamePage.jsx` + `src/data/gameContent.js` |
| `pages/quiz.html` | `src/pages/QuizPage/QuizPage.jsx` + `src/data/quizContent.js` |
| `js/main.js` 的 `goTo()` | `src/App.jsx` 路由表 + `src/constants/routes.js` |
| `js/main.js` 的 `showToast()` | `src/components/Toast/Toast.jsx` |
| `js/main.js` 的登录逻辑 | `src/pages/LoginPage/LoginPage.jsx` + `src/api/loginApi.js` |
| `css/style.css` | 按页面拆到 `src/styles/*.css`（规则内容未改动） |
| `images/*.png` | `public/images/*.png` |

> 原来的 `css/`、`js/`、`pages/`、`login.html`、`images/` 已删除，
> 因为重构后它们不再被任何代码引用（背景图改由 `public/images/` 提供）。
> 若还需要原版文件做对照，可从版本库历史中取回（`git show HEAD~1:login.html` 等）。

---

## 三、页面跳转对照表

路由路径刻意沿用原版文件名，地址栏观感与原版一致：

| 原版地址 | 重构版地址 | 页面 |
| --- | --- | --- |
| `login.html` | `/` | 登录页 |
| `index.html` | `/index.html` | 功能主页 |
| `pages/science.html` | `/pages/science.html` | 智慧科普 |
| `pages/game.html` | `/pages/game.html` | 修复游戏 |
| `pages/quiz.html` | `/pages/quiz.html` | 知识挑战 |

跳转关系（与原版完全一致）：

```
登录页 ──登录成功（600ms 后）──▶ 功能主页
功能主页 ──「← 返回登录」──▶ 登录页
功能主页 ──点击三个模块──▶ 智慧科普 / 修复游戏 / 知识挑战
智慧科普 / 修复游戏 / 知识挑战 ──「返回主页」──▶ 功能主页
```

> ⚠️ **部署提示**：重构版是单页应用，`/pages/science.html` 这类地址在磁盘上并不存在，
> 需要服务器把它回退到 `index.html`（Nginx：`try_files $uri /index.html;`）。
> `npm run dev` 与 `npm run preview` 已内置该回退，直接可用。
> 另外应用必须部署在**站点根目录**下（路由是根路径绝对地址）。

---

## 四、样式保真说明

重构时样式规则是**整段照搬**原 `css/style.css` 的，只做了三处必要的工程化调整：

1. `#loginPage` / `#homePage` → `.login-page` / `.home-page`。
   原因：原来是两个独立 HTML，各自只加载一次样式；现在是单页应用，用 id 选择器容易冲突，改用类名。
   `#mod-science` / `#mod-game` / `#mod-quiz` 三个热区 id **原样保留**，因为定位完全依赖它们。
2. 原文件底部那段 `@media (max-width: 900px)` 被拆成三份，分别放回登录页、主页各自的样式文件里。
   合并后效果与原版一致。
3. 两处补 `text-decoration: none`：主页 `.module`、子页面 `.btn-back`。
   原因：这两个元素在原版里分别承载于 `div` 与 `a`，重构后都改成了 React Router 的 `<Link>`（渲染为 `<a>`），
   必须显式去掉链接默认下划线，否则会出现原版没有的下划线。

`html, body { overflow: hidden }`、字体栈（楷体/宋体）、背景图 `cover` 定位、模块热区百分比坐标等全部保持不变。

---

## 五、行为保真说明

| 交互 | 原版 | 重构版 |
| --- | --- | --- |
| 登录校验 | 账号/密码为空 → 提示，不跳转 | 一致（`validateLoginForm`） |
| 登录成功 | 提示「登录成功，正在进入系统…」，600ms 后跳主页 | 一致（`LOGIN_REDIRECT_DELAY = 600`） |
| 提示浮层 | 显示 2.2 秒后淡出 | 一致（`Toast` 组件） |
| 模块 hover | 变亮 + 朱砂红虚线边框 + 上浮 4px + 显示「点击进入 →」 | 一致（纯 CSS） |
| 模块键盘操作 | 补 `tabindex="0"` + 回车触发 | 原生 `<Link>`，键盘可聚焦、回车跳转 |
| 忘记密码 / 立即申请 | `alert()` 弹窗 | 改为同一套国风 Toast，文案不变 |

### 与原版的两处**有意**差异

1. **忘记密码 / 立即申请**：原版用浏览器原生 `alert()`，样式突兀且无法统一。重构版改用页面自带的国风 Toast，
   文案不变。如需 100% 还原 `alert`，把 `src/pages/LoginPage/LoginPage.jsx` 里两处
   `toastRef.current?.show(...)` 换成 `alert(...)` 即可。
2. **跳转方式**：原版是整页刷新（`window.location.href`），重构版是 SPA 前端路由（无刷新）。
   地址栏 URL 与页面内容完全对应，观感一致，只是不再有白屏闪烁。
   需要整页刷新的效果时，把 `<Link>` 换成 `<a href>` 即可。

---

## 六、保真度验证（`_verify/` 目录）

为保证「看不出差别」，重构后做了三层机器比对，结论如下。

### 1) 几何与计算样式逐项比对 —— 全部一致

脚本 `_verify/compare.cjs` 通过 CDP 分别打开原版与重构版，对每页的关键元素采集
`getBoundingClientRect()` 与 `getComputedStyle()`，逐项比对（几何容差 1.5px）：

| 页面 | 实质差异 |
| --- | --- |
| 登录页 | **0** |
| 主页 | 3（均为 `div` → `a` 的标签名差异，样式实测一致） |
| 智慧科普 / 修复游戏 / 知识挑战 | 各 1（渐变序列化写法差异，颜色相同） |

### 2) 无头浏览器截图逐像素比对 —— 0 个差异像素

脚本 `_verify/pixel.cjs` 用无头 Edge 对 5 个页面 × 3 个视口（1440×900 / 1280×800 / 820×900）
截图，共 15 组 30 张，自行解码 PNG 后逐像素比对：

```
比对组合数: 15
差异像素总计: 0
```

即每一组「原版截图」与「重构截图」的所有像素完全相同。
截图存于 `_verify/shots/`（`*__orig__*.png` 与 `*__ref__*.png`），可直接对比查看。

### 3) 交互与跳转断言 —— 全部通过

- `_verify/interact.cjs`：在真实浏览器里跑完整链路（空账号/空密码校验、忘记密码、申请权限、
  登录成功 600ms 后跳主页、三个模块跳转、返回主页、返回登录），**15/15 通过**，无控制台报错。
- `_verify/links.cjs`：对照原版 HTML/JS 里的链接与标题，**9/9 通过**（含 5 个页面标题）。

### 复现验证

验证需要「原版」与「重构版」同时可访问，步骤如下：

```bash
# 1) 把原版静态站点放到 _verify/original/（login.html、index.html、pages/、css/、js/、images/）
#    即重构前的目录结构原样拷贝一份

# 2) 启动对照静态服务器：原版挂在 /original/，重构版挂在根路径
node _verify/serve.cjs 4180

# 3) 生成挂在根路径下的对照构建产物
npx vite build --outDir _verify/ref --emptyOutDir

# 4) 依次运行
node _verify/compare.cjs <CDP端口>    # 几何 + 计算样式逐项比对
node _verify/pixel.cjs                # 截图逐像素比对（先按下文截图）
node _verify/interact.cjs <CDP端口>   # 交互链路断言
node _verify/links.cjs <CDP端口>      # 链接与标题对照
```

截图由无头浏览器生成，命名规则 `<页面>__<orig|ref>__<视口>.png`，放入 `_verify/shots/`：

```bash
msedge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --user-data-dir=<临时目录> --window-size=1440,900 \
  --screenshot=_verify/shots/home__orig__1440x900.png \
  http://127.0.0.1:4180/original/index.html
```

> `_verify/` 是验证材料，不影响应用运行，确认无误后可整个删除。

---

## 七、后续怎么改

| 想做的事 | 改哪个文件 |
| --- | --- |
| 改路由路径 | `src/constants/routes.js` |
| 改主页模块文案 / 顺序 | `src/constants/homeModules.js` |
| 改子页面文字 | `src/data/*Content.js` |
| 接真实登录接口 | `src/api/loginApi.js` 的 `submitLogin()` |
| 调页面配色 | `src/styles/global.css` 里的 `:root` 变量 |
| 调子页面卡片样式 | `src/styles/subpage.css` |
| 新增一个子页面 | 新建 `src/pages/XxxPage/`，在 `src/App.jsx` 加一条 `<Route>`，在 `routes.js` 加常量 |

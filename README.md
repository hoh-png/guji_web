# 古迹修复系统

数字化文脉传承 · 沉浸式科普体验。一个面向公众的文物修复科普平台，包含登录、功能主页，
以及智慧科普、修复游戏、知识挑战三个功能模块。

前端为 React 单页应用，视觉风格为宣纸米色 + 朱砂红的国风配色。

---

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 |
| 路由 | React Router 6（BrowserRouter） |
| 构建 | Vite 5 |
| 样式 | 原生 CSS + CSS 变量（未引入 UI 框架与预处理器） |
| 语言 | JavaScript（未启用 TypeScript） |

---

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 → http://localhost:5173
npm run build    # 打包到 dist/
npm run preview  # 本地预览打包结果
```

Node 版本要求 ≥ 18（开发环境使用 Node 24）。

---

## 站点地图

```
登录页  /
  └─ 登录成功
功能主页  /index.html
  ├─ 智慧科普  /pages/science.html
  ├─ 修复游戏  /pages/game.html
  └─ 知识挑战  /pages/quiz.html
```

各页面之间可自由返回：主页可「← 返回登录」，三个子页面均可「返回主页」。

| 地址 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 登录页 | 账号密码登录，含记住登录状态、忘记密码、申请权限入口 |
| `/index.html` | 功能主页 | 三个功能模块入口，背景为手绘古迹长卷 |
| `/pages/science.html` | 智慧科普 | 文物修复概念、数字化修复技术介绍 |
| `/pages/game.html` | 修复游戏 | 玩法与工序说明（关卡功能开发中） |
| `/pages/quiz.html` | 知识挑战 | 挑战规则与示例题目（答题功能开发中） |

> 地址沿用 `*.html` 形式，与静态站点的 URL 习惯一致。
>
> 当前未做登录态校验：三个子页面与主页均可通过地址直接访问，未匹配的地址才会回到登录页。
> 接入后端鉴权后需补路由守卫（见「开发进度 · 待开发」）。

---

## 目录结构

```
guji_web/
├─ index.html                     # 应用入口 HTML（挂载 #root）
├─ package.json
├─ vite.config.js
├─ public/
│  └─ images/                     # 背景图等静态资源（构建时原样拷贝）
│
└─ src/
   ├─ main.jsx                    # 入口：挂载 React、引入全局样式、装配路由
   ├─ App.jsx                     # 路由表
   │
   ├─ constants/                  # 全局常量
   │  ├─ routes.js                # 路由路径
   │  └─ homeModules.js           # 主页功能模块配置
   │
   ├─ api/                        # 接口层
   │  └─ loginApi.js              # 登录相关接口与提示语
   │
   ├─ hooks/                      # 可复用逻辑
   │  └─ usePageTitle.js          # 设置浏览器标签页标题
   │
   ├─ components/                 # 跨页面复用组件
   │  ├─ ModuleCard/              # 主页功能模块卡片
   │  ├─ SubPageLayout/           # 子页面外壳（标题 + 卡片列表 + 返回主页）
   │  ├─ Toast/                   # 顶部提示浮层
   │  └─ InlineLink/              # 行内提示型链接
   │
   ├─ pages/                      # 页面，一个页面一个文件夹
   │  ├─ LoginPage/
   │  ├─ HomePage/
   │  ├─ SciencePage/
   │  ├─ GamePage/
   │  └─ QuizPage/
   │
   ├─ data/                       # 页面内容数据（与渲染逻辑分离）
   │  ├─ scienceContent.js
   │  ├─ gameContent.js
   │  └─ quizContent.js
   │
   └─ styles/                     # 样式
      ├─ global.css               # 设计变量与基础重置
      ├─ page.css                 # 全屏页面骨架
      ├─ toast.css                # 提示浮层
      ├─ login.css                # 登录页
      ├─ home.css                 # 主页
      └─ subpage.css              # 子页面通用样式
```

分层约定：

- **页面**只负责组合，业务文案下沉到 `data/`，接口调用下沉到 `api/`。
- **组件**保持无业务耦合，通过 props 接收数据。
- **样式**按页面拆分，`global.css` 只放变量与重置；页面样式在自己目录下的 `.css` 中
  `@import` 对应文件，由 Vite 打包去重。

---

## 接口层

### 现状

**后端尚未接入。** 当前 `src/api/loginApi.js` 中的登录为演示实现：只要账号和密码都不为空即视为登录成功，
不校验真实账号，也不发送任何网络请求。接口形状已按真实后端的调用方式设计好，
后续替换函数体即可，页面代码无需改动。

### `submitLogin(values)`

提交登录。

| 项 | 内容 |
| --- | --- |
| 入参 | `{ account: string, password: string }` |
| 返回 | `Promise<{ ok: boolean, tip: string, redirectDelay: number }>` |

返回字段：

- `ok` — 是否登录成功，决定是否跳转
- `tip` — 提示文案，由页面显示为 Toast
- `redirectDelay` — 跳转前停留毫秒数（成功 600，失败 0）

### `validateLoginForm(values)`

表单校验，返回第一条错误提示，通过时返回空字符串。

| 规则 | 提示语 |
| --- | --- |
| 账号为空 | 请先输入修复师账号 |
| 密码为空 | 请先输入登录密码 |

### 提示语常量

`LOGIN_SUCCESS_TIP`、`LOGIN_REDIRECT_DELAY`、`FORGOT_PASSWORD_TIP`、`APPLY_ACCOUNT_TIP`

### 待实现的接口

| 接口 | 用途 | 备注 |
| --- | --- | --- |
| `POST /api/login` | 真实登录鉴权 | 替换 `submitLogin` 实现 |
| `POST /api/register` | 申请修复师权限 | 登录页入口已就绪，当前为提示 |
| `POST /api/password/reset` | 忘记密码 | 登录页入口已就绪，当前为提示 |
| `GET /api/science/articles` | 科普内容列表 | 智慧科普页当前为静态文案 |
| `GET /api/quiz/questions` | 抽取题目 | 知识挑战页当前为示例题目 |
| `POST /api/quiz/submit` | 提交答卷并计分 | 需配合「修复师等级」 |
| `GET /api/game/levels` | 游戏关卡数据 | 修复游戏页当前为玩法说明 |
| `GET /api/ranking` | 积分排行 | 首页/游戏页预留 |

---

## 样式规范

设计变量集中定义在 `src/styles/global.css` 的 `:root` 中，改配色只需动这里：

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--ink` | `#3d2b1f` | 墨色深棕，正文主色 |
| `--ink-2` | `#5a3e2b` | 次级文字 |
| `--brick` | `#a8321f` | 朱砂红，主强调色 |
| `--brick-dark` | `#7e2417` | 朱砂红加深，用于渐变按钮 |
| `--paper` | `#f3e9d2` | 宣纸米色 |
| `--gold` | `#b8924f` | 描金，用于边框 |
| `--white-soft` | `rgba(255,252,244,.78)` | 半透明卡片底 |

字体栈为楷体/宋体（`STKaiti` / `KaiTi` / `楷体` / `SimSun` / `宋体`）。

响应式：`max-width: 900px` 断点下，登录卡片居中并撑满 92vw，主页模块热区改为百分比定位，
子页面本就在 960px 容器内自然收缩。

---

## 开发进度

### 已完成

- [x] 登录页（表单校验、提示浮层、记住登录状态、忘记密码/申请入口）
- [x] 功能主页（三个模块热区、hover 反馈、键盘可操作）
- [x] 智慧科普页（概念介绍 + 数字化技术说明）
- [x] 子页面通用外壳与返回导航
- [x] 响应式适配（900px 断点）
- [x] 路由与 404 兜底（未匹配地址回到登录页）

### 待开发

- [ ] 后端接口接入（见「待实现的接口」）
- [ ] 登录态持久化与路由守卫（当前直接访问 `/pages/*` 不拦截，且刷新后无登录态）
- [ ] 「记住本次登录状态」的实际存储行为（当前仅保留勾选状态，未落盘）
- [ ] 修复游戏：关卡、操作交互、得分
- [ ] 知识挑战：题库、答题流程、修复师等级
- [ ] 积分排行与修复成就系统
- [ ] 科普内容改为接口驱动（当前为本地静态数据）
- [ ] 表单校验增强（长度、格式、错误态样式）
- [ ] 单元测试与端到端测试
- [ ] 无障碍细化（焦点样式、语义化标签审查）

---

## 部署

```bash
npm run build     # 产物在 dist/
```

产物为纯静态文件，可放到任意静态服务器。注意两点：

1. **需要配置单页应用回退**。`/pages/science.html` 这类地址在磁盘上并不存在，
   需由服务器回退到 `index.html`：

   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

2. **需部署在站点根目录**。路由是根路径绝对地址（如 `/pages/science.html`），
   因此 `vite.config.js` 中的 `base` 必须保持为 `'/'`；
   若部署到子目录，需同步修改 `base` 与 `constants/routes.js`。

`npm run dev` 与 `npm run preview` 已内置回退规则，无需额外配置。

---

## 质量验证

`_verify/` 目录保存了一套页面渲染校验材料，用于确认几何、计算样式与像素渲染符合预期：

| 文件 | 用途 |
| --- | --- |
| `serve.cjs` | 对照用静态服务器（含单页应用回退） |
| `compare.cjs` | 采集 `getBoundingClientRect` / `getComputedStyle` 并逐项比对 |
| `pixel.cjs` | 解码 PNG 后逐像素比对（仅依赖 Node 内置 zlib） |
| `interact.cjs` | 交互链路断言（表单校验、登录跳转、模块跳转、返回导航） |
| `links.cjs` | 链接目标与页面标题对照 |
| `shots/` | 5 个页面 × 3 个视口的基准截图与实测截图 |
| `*-report.json` | 比对明细，可复查 |

已记录的结论：5 个页面 × 3 个视口（1440×900 / 1280×800 / 820×900）共 15 组截图，
逐像素差异为 0；交互断言全部通过，无控制台报错。

> 其中 `compare.cjs`、`links.cjs` 需要把基准站点放在 `_verify/original/` 下才能运行，
> 该基线快照未随仓库提供，需自行放置；`interact.cjs` 与 `pixel.cjs` 可直接对现有截图与页面运行。
> `_verify/` 不影响应用运行，可按需删除。

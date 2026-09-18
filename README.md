# 古迹修复系统

数字化文脉传承 · 沉浸式科普体验。

这是一个面向中小学生的文物学习与修复网站。项目采用前后端分离架构：前端提供国风视觉的登录、科普、修复游戏和知识挑战页面；后端负责用户认证、钱包、元宝/铜币兑换、题库、判题、答题奖励与历史记录。

> 当前主要开发分支：`backend-auth`
>
> 钱包和知识问答的后端已经完成，但对应前端交互仍待接入。商店、修复工具、文物修复记录和 3D 模型解锁尚未实现。

## 当前进度

| 模块 | 后端 | 前端 | 说明 |
| --- | --- | --- | --- |
| 用户注册与登录 | 已完成 | 已接入 | JWT 保存在 HttpOnly Cookie 中 |
| 登录状态检查与退出 | 已完成 | 已接入 | 主页会检查登录状态 |
| 用户钱包 | 已完成 | 待接入 | 老用户首次访问钱包时自动创建 |
| 元宝兑换铜币 | 已完成 | 待接入 | 固定比例：1 元宝 = 10 铜币 |
| 知识题库与单题查询 | 已完成 | 待接入 | 读取题目时不会泄露正确答案 |
| 后端判题与答题奖励 | 已完成 | 待接入 | 同一用户同一道题最多奖励一次 |
| 答题历史 | 已完成 | 待接入 | 保存每一次回答并按时间倒序返回 |
| 智慧科普 | 暂无接口 | 静态页面已完成 | 当前使用本地静态内容 |
| 修复游戏 | 未实现 | 说明页面 | 关卡和交互仍在开发中 |
| 商店与修复工具 | 未实现 | 未实现 | 暂无商品、购买和用户库存接口 |
| 文物修复记录与 3D 解锁 | 未实现 | 未实现 | 后续阶段开发 |

## 技术栈

### 前端

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 |
| 路由 | React Router 6（BrowserRouter） |
| 构建工具 | Vite 5 |
| 样式 | 原生 CSS + CSS 变量 |
| 语言 | JavaScript（ES Module） |

### 后端

| 类别 | 选型 |
| --- | --- |
| Web 框架 | Node.js + Express 5 |
| 数据库 | MySQL / MariaDB |
| ORM | Prisma 7 + MariaDB Adapter |
| 身份认证 | JWT + HttpOnly Cookie |
| 密码哈希 | bcryptjs |
| 语言 | JavaScript（ES Module） |

## 系统结构

```text
React + Vite（localhost:5173）
        │
        │  credentials: include
        ▼
Express API（localhost:3000/api）
        │
        ▼
Prisma ORM
        │
        ▼
MySQL / MariaDB（guji_web）
```

登录成功后，后端将 JWT 写入名为 `guji_auth` 的 HttpOnly Cookie。钱包和问答接口只从认证中间件读取当前用户 ID，不接受前端传入的 `userId`。

## 环境要求

- Node.js：`^20.19`、`^22.12` 或 `>=24.0`
- npm
- MySQL 或 MariaDB

当前开发环境使用 Node.js 24 和 MariaDB。

## 快速开始

### 1. 获取代码

```bash
git clone -b backend-auth https://github.com/yusu255/guji_web.git
cd guji_web
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 安装后端依赖

```bash
cd server
npm install
```

### 4. 配置后端环境变量

复制 `server/.env.example` 为 `server/.env`，并填写真实配置：

```env
DATABASE_URL="mysql://root:YOUR_URL_ENCODED_PASSWORD@localhost:3306/guji_web"
PORT=3000
JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

注意：

- `JWT_SECRET` 至少需要 32 个字符。
- 数据库密码中的特殊字符需要进行 URL 编码。
- 默认 CORS 来源是 `http://localhost:5173`，开发时建议使用 `localhost` 打开前端，不要混用 `127.0.0.1`。
- 前端默认请求 `http://localhost:3000/api`；需要修改时可设置 `VITE_API_URL`。

### 5. 初始化数据库

先创建空数据库 `guji_web`，然后在 `server/` 目录执行：

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

Seed 会幂等写入 5 道中国文物、陶瓷和青铜器测试题。

开发新数据库结构时使用：

```bash
npx prisma migrate dev --name your_migration_name
```

不要对包含用户数据的数据库执行 `prisma migrate reset`。

### 6. 启动后端

在 `server/` 目录运行：

```bash
npm run dev
```

后端默认地址：<http://localhost:3000>

健康检查：<http://localhost:3000/api/health>

### 7. 启动前端

打开另一个终端，在项目根目录运行：

```bash
npm run dev
```

前端默认地址：<http://localhost:5173>

## 前端页面

| 地址 | 页面 | 当前状态 |
| --- | --- | --- |
| `/` | 登录/注册页 | 已连接真实认证接口 |
| `/index.html` | 功能主页 | 已完成，会检查登录状态 |
| `/pages/science.html` | 智慧科普 | 静态内容 |
| `/pages/game.html` | 修复游戏 | 玩法说明，关卡未实现 |
| `/pages/quiz.html` | 知识挑战 | 静态说明，尚未连接题库 API |

页面路径沿用原静态站点的 `*.html` 形式。除主页外，子页面目前没有统一路由守卫；正式部署前应补充受保护路由。

## 后端 API

API 根地址：`http://localhost:3000/api`

除注册和登录外，钱包及问答接口都要求携带登录 Cookie。前端请求需要设置：

```js
fetch(url, {
  credentials: 'include',
})
```

### 认证

| 方法 | 地址 | 用途 | 认证 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | 注册用户并在同一事务中创建钱包 | 否 |
| `POST` | `/api/auth/login` | 登录并写入 JWT Cookie | 否 |
| `GET` | `/api/auth/me` | 获取当前登录用户 | 是 |
| `POST` | `/api/auth/logout` | 清除登录 Cookie | 否 |

注册和登录请求：

```json
{
  "username": "student01",
  "password": "password123"
}
```

密码至少需要 8 个字符。

### 钱包

| 方法 | 地址 | 用途 |
| --- | --- | --- |
| `GET` | `/api/wallet` | 获取当前用户钱包；老用户缺少钱包时自动创建 |
| `POST` | `/api/wallet/exchange` | 将元宝兑换为铜币 |

获取钱包响应示例：

```json
{
  "success": true,
  "data": {
    "ingots": 3,
    "coins": 25,
    "exchangeRate": {
      "ingotToCoin": 10
    }
  }
}
```

兑换请求：

```json
{
  "amount": 2
}
```

`amount` 必须是正整数。兑换比例完全由后端常量决定，前端不能指定比例或修改余额。余额扣减采用带条件的数据库原子更新，避免并发请求导致负数余额。

### 知识问答

| 方法 | 地址 | 用途 |
| --- | --- | --- |
| `GET` | `/api/quiz/questions` | 获取所有启用题目 |
| `GET` | `/api/quiz/questions/:id` | 获取一条启用题目 |
| `POST` | `/api/quiz/answer` | 提交答案，由后端判题并发放奖励 |
| `GET` | `/api/quiz/history` | 获取当前用户的答题历史 |

题目列表和单题接口不会返回 `correctAnswer`、解析或其他可直接推断答案的内部字段。

提交答案请求：

```json
{
  "questionId": 1,
  "answer": "B"
}
```

后端只读取 `questionId`、`answer` 和登录 Cookie。即使前端传入 `userId`、`isCorrect`、`reward`、`coins` 或 `ingots`，这些字段也会被忽略。

首次答对响应示例：

```json
{
  "success": true,
  "data": {
    "questionId": 1,
    "selectedAnswer": "B",
    "correct": true,
    "correctAnswer": "B",
    "alreadyRewarded": false,
    "reward": {
      "coins": 10,
      "ingots": 0
    },
    "wallet": {
      "coins": 10,
      "ingots": 0
    }
  }
}
```

提交答案后可以返回正确答案，供前端展示答题结果；再次答对同一道题不会重复增加钱包。

### 错误格式

新增接口统一使用以下错误结构：

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "错误信息"
}
```

常见错误码：

- `UNAUTHORIZED`
- `INVALID_AMOUNT`
- `INSUFFICIENT_INGOTS`
- `QUESTION_NOT_FOUND`
- `QUESTION_INACTIVE`
- `INVALID_ANSWER`
- `INVALID_QUESTION_ID`
- `INTERNAL_SERVER_ERROR`

## 数据库模型

```text
User
 ├── Wallet?
 ├── QuizAttempt[]
 └── QuizReward[]

Question
 ├── QuizAttempt[]
 └── QuizReward[]
```

- `Wallet.userId` 为唯一键，一名用户最多拥有一个钱包。
- `AnswerOption` 数据库枚举将答案限制为 `A`、`B`、`C`、`D`。
- `QuizAttempt` 保存每一次回答，因此用户可以答错后重新回答。
- `QuizReward` 使用 `@@unique([userId, questionId])`，从数据库层保证一名用户一道题最多领奖一次。
- 首次答对时，奖励记录、钱包增量和答题历史在同一个 Prisma transaction 中提交。
- 钱包余额及题目奖励带有数据库非负数约束。

## 项目结构

```text
guji_web/
├─ public/                         # 图片等前端静态资源
├─ src/                            # React 前端
│  ├─ api/loginApi.js              # 注册、登录、登录状态与退出请求
│  ├─ components/                  # 通用组件
│  ├─ constants/                   # 路由与主页模块配置
│  ├─ data/                        # 当前静态页面内容
│  ├─ pages/                       # 登录、主页、科普、游戏、问答页面
│  └─ styles/                      # 全局和页面样式
├─ server/
│  ├─ prisma/
│  │  ├─ migrations/               # 数据库迁移
│  │  ├─ schema.prisma             # User、Wallet、Question 等模型
│  │  └─ seed.js                   # 测试题 Seed
│  ├─ src/
│  │  ├─ constants/                # 游戏经济常量
│  │  ├─ controllers/              # 认证、钱包、问答控制器
│  │  ├─ middleware/               # JWT Cookie 认证中间件
│  │  ├─ routes/                   # API 路由
│  │  ├─ services/                 # 钱包与问答事务逻辑
│  │  ├─ lib/                      # Prisma 和错误类型
│  │  ├─ app.js                    # Express 应用
│  │  └─ server.js                 # 服务入口与优雅关闭
│  └─ tests/                       # 钱包与问答集成测试
├─ index.html
├─ package.json                    # 前端依赖与脚本
└─ vite.config.js
```

## 测试与校验

### Prisma

在 `server/` 目录运行：

```bash
npx prisma format
npx prisma validate
npx prisma migrate status
```

### 钱包与问答集成测试

先启动后端，再在 `server/` 目录运行：

```bash
npm run test:wallet-quiz
```

测试脚本会创建临时用户并在结束时清理，覆盖：

- 登录与钱包自动创建
- 题目接口不泄露正确答案
- 错误答案不发奖励
- 正确答案发放奖励
- 重复答对不重复奖励
- 10 个并发请求只能领取一次奖励
- 答题历史排序
- 元宝兑换、余额不足与非法参数
- 前端伪造奖励、用户 ID、余额和兑换比例无效
- 数据库非负数约束

### 前端

```bash
npm run build
```

`_verify/` 保存原 React 页面重构时使用的布局、像素和交互校验材料。

## 安全设计

- 密码使用 bcrypt 进行哈希，不保存明文密码。
- JWT 通过 HttpOnly Cookie 保存，前端 JavaScript 无法直接读取。
- 钱包和问答接口的用户身份只来自认证中间件。
- 兑换比例、题目答案、奖励金额和钱包修改均由后端决定。
- 题目读取接口不返回正确答案。
- 兑换使用原子条件更新，防止并发超额消费。
- `QuizReward` 唯一约束与 Prisma transaction 共同防止并发刷奖励。
- 钱包余额和题目奖励在数据库层禁止负数。

## 开发计划

### 已完成

- [x] React 登录、注册和主页
- [x] Express + Prisma + MySQL/MariaDB 后端
- [x] 用户注册、登录、退出和登录状态检查
- [x] 新用户事务创建钱包、老用户钱包自动补建
- [x] 元宝和铜币钱包及单向兑换
- [x] 题库、后端判题、答题奖励与历史
- [x] 数据库级防重复奖励和非负数约束
- [x] 5 道测试题 Seed
- [x] 钱包与问答集成测试、并发防刷测试

### 待开发

- [ ] 钱包余额和兑换前端
- [ ] 知识挑战完整答题前端及历史页面
- [ ] 子页面统一登录路由守卫
- [ ] “记住登录状态”的差异化行为
- [ ] 忘记密码/密码重置
- [ ] 商店、商品、修复工具和用户库存
- [ ] 文物修复记录
- [ ] 修复游戏关卡和交互
- [ ] 3D 模型解锁
- [ ] 科普内容接口化
- [ ] 排行、成就与修复师等级

## 部署说明

前端构建：

```bash
npm run build
```

产物位于 `dist/`。由于前端使用 BrowserRouter 且保留 `/pages/*.html` 路径，静态服务器需要配置单页应用回退，例如 Nginx：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

生产环境还需要：

- 将 `NODE_ENV` 设置为 `production`，使认证 Cookie 启用 `secure`。
- 使用 HTTPS。
- 将 `FRONTEND_URL` 设置为实际前端来源。
- 将前端 `VITE_API_URL` 设置为实际 API 地址。
- 使用足够长且不可公开的 `JWT_SECRET`。
- 在发布前执行 `npx prisma migrate deploy`。

## 当前范围说明

本分支提供的是认证、钱包和知识问答基础能力，并不包含完整商店系统。前端可以使用钱包接口显示余额和完成元宝兑换，但在后端新增商品、购买与用户库存模型和接口前，不应实现真实购买流程。

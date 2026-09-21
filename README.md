# 古迹修复系统

数字化文脉传承 · 沉浸式科普体验。

这是一个面向中小学生的文物学习与修复网站。项目采用前后端分离架构：前端提供国风视觉的登录、科普、修复游戏、知识挑战、道具商店和个人中心；后端负责用户认证、钱包、双向货币兑换、商品购买与所有权、题库、判题、答题奖励和历史记录。

> 当前唯一集成分支：`main`
>
> 认证、钱包、双向兑换、商店所有权和知识挑战均已完成前后端对接。知识挑战使用数据库题库，按账号保存选择与通关进度，每道题首次答对奖励 `100 铜钱`。

## 当前进度

| 模块 | 后端 | 前端 | 说明 |
| --- | --- | --- | --- |
| 用户注册与登录 | 已完成 | 已接入 | JWT 保存在 HttpOnly Cookie 中 |
| 登录状态检查与退出 | 已完成 | 已接入 | 主页会检查登录状态 |
| 用户钱包 | 已完成 | 已接入 | 数据库存储；老用户首次访问时自动创建 |
| 元宝/铜钱双向兑换 | 已完成 | 已接入 | 固定比例：1 元宝 = 1000 铜钱 |
| 知识题库与单题查询 | 已完成 | 已接入 | 当前启用 5 道题，读取时不会泄露答案 |
| 后端判题与答题奖励 | 已完成 | 已接入 | 每题首次答对奖励 100 铜钱，重复答对不重复发奖 |
| 知识挑战通关进度 | 已完成 | 已接入 | 按登录账号保存，刷新或重新登录后恢复 |
| 答题历史 | 已完成 | 暂无页面 | 后端保留接口，当前前端只使用通关进度 |
| 智慧科普 | 暂无接口 | 静态页面已完成 | 当前使用本地静态内容 |
| 修复游戏 | 未实现 | 说明页面 | 关卡和交互仍在开发中 |
| 商店与修复工具 | 已完成 | 已接入 | 商品购买和所有权落库；装备选择保存在本机偏好中 |
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

登录成功后，后端将 JWT 写入名为 `guji_auth` 的 HttpOnly Cookie。钱包、商店和问答接口只从认证中间件读取当前用户 ID，不接受前端传入的 `userId`。

## 环境要求

- Node.js：`^20.19`、`^22.12` 或 `>=24.0`
- npm
- MySQL 或 MariaDB

当前开发环境使用 Node.js 24 和 MariaDB。

## 快速开始

### 1. 获取代码

```bash
git clone https://github.com/yusu255/guji_web.git
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

迁移会停用旧题目并写入知识挑战使用的 5 道题，每题首次答对奖励 100 铜钱。Seed 可幂等更新这 5 道题，不会删除与旧题目关联的历史数据。

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
| `/pages/quiz.html` | 知识挑战说明 | 规则说明与关卡入口 |
| `/pages/challenge.html` | 知识挑战关卡 | 已连接题库、后端判题、通关进度和钱包奖励 |
| `/pages/shop.html` | 道具商店 | 已连接钱包、双向兑换和购买接口 |
| `/pages/workshop.html` | 修复工坊 | 使用已拥有和已装备的工具 |
| `/pages/profile.html` | 个人中心 | 展示钱包和本地个人偏好；开发环境提供测试货币工具 |

页面路径沿用原静态站点的 `*.html` 形式。除主页外，子页面目前没有统一路由守卫；正式部署前应补充受保护路由。

## 后端 API

API 根地址：`http://localhost:3000/api`

除注册和登录外，钱包、商店及问答接口都要求携带登录 Cookie。前端请求需要设置：

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
| `POST` | `/api/wallet/exchange` | 元宝与铜钱双向兑换 |
| `POST` | `/api/wallet/dev/grant` | 开发环境发放测试货币；生产环境不可用 |

获取钱包响应示例：

```json
{
  "success": true,
  "data": {
    "ingots": 3,
    "coins": 2500,
    "exchangeRate": {
      "ingotToCoin": 1000,
      "coinToIngot": 1000
    }
  }
}
```

兑换请求中的 `kind` 表示希望获得的货币。用 1 元宝兑换 1000 铜钱：

```json
{
  "kind": "copper",
  "amount": 1000
}
```

用 1000 铜钱兑换 1 元宝：

```json
{
  "kind": "ingot",
  "amount": 1
}
```

`amount` 必须是正整数；获得铜钱时还必须是 1000 的整数倍。兑换比例完全由后端常量决定，前端不能指定比例或修改余额。余额扣减和增加在同一数据库事务中完成，并使用带条件的原子更新避免出现负数余额。

`/api/wallet/dev/grant` 仅用于本地开发页面中的“开发测试工具”，只接受预设的测试金额；当 `NODE_ENV=production` 时接口返回 404，生产构建也不会显示相关按钮。

### 商店与用户库存

| 方法 | 地址 | 用途 |
| --- | --- | --- |
| `GET` | `/api/shop` | 获取钱包、已拥有工具、场所和工作台；自动补齐初始物品 |
| `POST` | `/api/shop/purchase` | 购买商品并写入用户所有权 |
| `POST` | `/api/shop/dev/reset` | 开发环境重置测试钱包与库存；生产环境不可用 |

购买请求：

```json
{
  "itemType": "tool",
  "itemId": "hammer-2"
}
```

`itemType` 可为 `tool`、`venue` 或 `desk`。商品是否存在、价格、余额是否充足和是否已经拥有均由后端判断；客户端传入的价格或用户 ID 不会影响购买结果。购买在数据库事务中完成，`ShopOwnership` 的复合唯一约束和事务冲突处理可以防止快速重复点击产生重复所有权或重复扣款。

当前工具、场所和工作台价格暂为 0，后续定价应同时更新后端商品目录和前端展示配置。钱包余额与商品所有权只以数据库为准；`localStorage` 仅保存昵称、头像、简介和装备选择等设备本地偏好。

### 知识问答

| 方法 | 地址 | 用途 |
| --- | --- | --- |
| `GET` | `/api/quiz/questions` | 获取所有启用题目 |
| `GET` | `/api/quiz/questions/:id` | 获取一条启用题目 |
| `POST` | `/api/quiz/answer` | 提交答案，由后端判题并发放奖励 |
| `GET` | `/api/quiz/progress` | 获取当前用户已完成的题目与解析，用于恢复通关进度 |
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
`questionId` 必须使用题目接口返回的实际 ID。

首次答对响应示例：

```json
{
  "success": true,
  "data": {
    "questionId": 1,
    "selectedAnswer": "B",
    "correct": true,
    "correctAnswer": "B",
    "explanation": "木构架榫卯体系承担全部荷载，墙体只分隔空间、不承重。",
    "alreadyRewarded": false,
    "reward": {
      "coins": 100,
      "ingots": 0
    },
    "wallet": {
      "coins": 100,
      "ingots": 0
    }
  }
}
```

提交答案后返回正确答案和解析，供前端展示答题结果；首次答对会在同一事务中保存通关状态并增加 100 铜钱，再次答对同一道题不会重复增加钱包。

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
- `INVALID_EXCHANGE_KIND`
- `INVALID_EXCHANGE_AMOUNT`
- `INSUFFICIENT_INGOTS`
- `INSUFFICIENT_COINS`
- `SHOP_ITEM_NOT_FOUND`
- `ALREADY_OWNED`
- `QUESTION_NOT_FOUND`
- `QUESTION_INACTIVE`
- `INVALID_ANSWER`
- `INVALID_QUESTION_ID`
- `INTERNAL_SERVER_ERROR`

## 数据库模型

```text
User
 ├── Wallet?
 ├── ShopOwnership[]
 ├── QuizAttempt[]
 └── QuizReward[]

Question
 ├── QuizAttempt[]
 └── QuizReward[]
```

- `Wallet.userId` 为唯一键，一名用户最多拥有一个钱包。
- `ShopOwnership` 保存用户拥有的工具、场所和工作台，并使用 `@@unique([userId, itemType, itemId])` 防止重复拥有。
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
│  ├─ api/playerApi.js             # 钱包、兑换、商店与测试工具请求
│  ├─ api/quizApi.js               # 题目、判题与通关进度请求
│  ├─ components/                  # 通用组件
│  ├─ context/PlayerContext.jsx    # 汇总服务器钱包/库存与本机偏好
│  ├─ constants/                   # 路由与主页模块配置
│  ├─ data/                        # 当前静态页面内容
│  ├─ pages/                       # 登录、主页、科普、游戏、问答页面
│  └─ styles/                      # 全局和页面样式
├─ server/
│  ├─ prisma/
│  │  ├─ migrations/               # 数据库迁移
│  │  ├─ schema.prisma             # User、Wallet、ShopOwnership、Question 等模型
│  │  └─ seed.js                   # 知识挑战题库 Seed
│  ├─ src/
│  │  ├─ constants/                # 游戏经济常量
│  │  ├─ controllers/              # 认证、钱包、商店、问答控制器
│  │  ├─ middleware/               # JWT Cookie 认证中间件
│  │  ├─ routes/                   # API 路由
│  │  ├─ services/                 # 钱包、商店与问答事务逻辑
│  │  ├─ lib/                      # Prisma 和错误类型
│  │  ├─ app.js                    # Express 应用
│  │  └─ server.js                 # 服务入口与优雅关闭
│  └─ tests/                       # 钱包、商店与问答集成测试
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

### 钱包、商店与问答集成测试

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
- 通关进度按用户保存并可恢复
- 10 个并发请求只能领取一次奖励
- 答题历史排序
- `1 元宝 = 1000 铜钱` 双向兑换、余额不足与非法参数
- 初始库存、商品购买、重复购买和并发购买保护
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
- 钱包、商店和问答接口的用户身份只来自认证中间件。
- 兑换比例、题目答案、奖励金额和钱包修改均由后端决定。
- 题目读取接口不返回正确答案。
- 兑换使用原子条件更新，防止并发超额消费。
- 商品价格与所有权由后端决定，唯一约束和事务处理防止重复购买。
- 钱包和库存不写入 `localStorage`，浏览器本地值不能作为资产依据。
- `QuizReward` 唯一约束与 Prisma transaction 共同防止并发刷奖励。
- 钱包余额和题目奖励在数据库层禁止负数。

## 开发计划

### 已完成

- [x] React 登录、注册和主页
- [x] Express + Prisma + MySQL/MariaDB 后端
- [x] 用户注册、登录、退出和登录状态检查
- [x] 新用户事务创建钱包、老用户钱包自动补建
- [x] 元宝和铜钱钱包及 `1:1000` 双向兑换
- [x] 钱包余额与兑换前端对接
- [x] 商店购买、用户库存和前端对接
- [x] 数据库题库、后端判题、答题奖励与历史
- [x] 知识挑战前端接入、账号通关进度恢复和每题 100 铜钱奖励
- [x] 数据库级防重复奖励和非负数约束
- [x] 5 道知识挑战题库 Seed
- [x] 钱包、商店与问答集成测试及并发保护

### 待开发

- [ ] 答题历史展示页面
- [ ] 子页面统一登录路由守卫
- [ ] “记住登录状态”的差异化行为
- [ ] 忘记密码/密码重置
- [ ] 商店正式定价和文物商品
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

`main` 分支提供认证、数据库钱包、`1 元宝 = 1000 铜钱` 双向兑换、工具/场所/工作台购买与所有权，以及完整的知识挑战前后端链路。商店当前商品价格均为 0；答题历史页面、文物修复记录、正式修复关卡和 3D 模型解锁属于后续范围。

# 古迹修复系统

数字化文脉传承 · 沉浸式科普体验。

这是一个面向中小学生的文物学习与修复网站。项目采用前后端分离架构：前端提供国风视觉的登录、科普、知识挑战、道具商店、文物修复工坊和个人中心；后端负责用户认证、玩家资料、钱包、双向货币兑换、商品所有权、装备方案、题库判题、答题奖励和文物修复进度。

> 当前代码已打通认证、钱包、商店、知识挑战、玩家资料、装备方案和文物修复进度。知识挑战每道题首次答对奖励 `100 铜钱`；修复工坊已接入 14 件文物，每件包含 7 道修复工序。

## 当前进度

| 模块 | 后端 | 前端 | 说明 |
| --- | --- | --- | --- |
| 用户注册与登录 | 已完成 | 已接入 | JWT 保存在 HttpOnly Cookie 中 |
| 登录状态检查与退出 | 已完成 | 已接入 | 除登录页外的业务页面统一由路由守卫保护 |
| 玩家资料与装备方案 | 已完成 | 已接入 | 昵称、简介、头像、工具、场所、工作台和当前文物均保存到数据库 |
| 用户钱包 | 已完成 | 已接入 | 数据库存储；老用户首次访问时自动创建 |
| 元宝/铜钱双向兑换 | 已完成 | 已接入 | 固定比例：1 元宝 = 1000 铜钱 |
| 知识题库与单题查询 | 已完成 | 已接入 | 当前启用 5 道题，读取时不会泄露答案 |
| 后端判题与答题奖励 | 已完成 | 已接入 | 每题首次答对奖励 100 铜钱，重复答对不重复发奖 |
| 知识挑战通关进度 | 已完成 | 已接入 | 按登录账号保存，刷新或重新登录后恢复 |
| 答题历史 | 已完成 | 暂无页面 | 后端保留接口，当前前端只使用通关进度 |
| 智慧科普 | 暂无接口 | 静态页面已完成 | 当前使用本地静态内容 |
| 商店与用户库存 | 已完成 | 已接入 | 工具、场所、工作台和 14 件文物均可购买、拥有和装备 |
| 文物修复工坊 | 已完成 | 已接入 | 七道工序、工具顺序校验及按文物保存进度均已接入后端 |
| 修复记录展示与完成奖励 | 进度已落库 | 未实现 | 当前只保存进度和完成时间，尚无记录页面及奖励 |
| 3D 模型解锁 | 未实现 | 未实现 | 后续阶段开发 |

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
| `/index.html` | 功能主页 | 已完成，由统一登录守卫保护 |
| `/pages/science.html` | 智慧科普 | 静态内容 |
| `/pages/game.html` | 修复游戏 | 玩法说明与修复工坊入口 |
| `/pages/quiz.html` | 知识挑战说明 | 规则说明与关卡入口 |
| `/pages/challenge.html` | 知识挑战关卡 | 已连接题库、后端判题、通关进度和钱包奖励 |
| `/pages/shop.html` | 道具商店 | 钱包兑换、商品购买、库存及装备切换 |
| `/pages/workshop.html` | 修复工坊 | 14 件文物、七道工序和账号进度持久化 |
| `/pages/profile.html` | 个人中心 | 玩家资料、钱包、修复师等级；开发环境提供测试货币工具 |

页面路径沿用原静态站点的 `*.html` 形式。除登录页 `/` 外，所有业务页面均由 `AuthGuard` 统一校验登录 Cookie；未登录访问子页面会回到登录页，成功登录后再返回原目标地址。

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
| `GET` | `/api/shop` | 获取钱包及已拥有的工具、场所、工作台和文物；自动补齐初始物品 |
| `POST` | `/api/shop/purchase` | 购买商品并写入用户所有权 |
| `POST` | `/api/shop/dev/reset` | 开发环境重置测试钱包与库存；生产环境不可用 |

购买请求：

```json
{
  "itemType": "tool",
  "itemId": "hammer-2"
}
```

`itemType` 可为 `tool`、`venue`、`desk` 或 `relic`。商品是否存在、价格、余额是否充足和是否已经拥有均由后端判断；客户端传入的价格或用户 ID 不会影响购买结果。购买在数据库事务中完成，`ShopOwnership` 的复合唯一约束和事务冲突处理可以防止快速重复点击产生重复所有权或重复扣款。

当前工具、场所、工作台和文物价格均暂定为 0，后续定价应同时更新后端商品目录和前端展示配置。钱包、所有权、玩家资料、装备方案和修复进度均以数据库为准；`localStorage` 只作为首次渲染前的临时缓存。

### 玩家状态与文物修复

| 方法 | 地址 | 用途 |
| --- | --- | --- |
| `GET` | `/api/player` | 获取钱包、玩家资料、库存、当前装备和各文物修复进度 |
| `PATCH` | `/api/player/profile` | 更新昵称、简介和头像配色 |
| `PATCH` | `/api/player/loadout` | 装备工具、场所、工作台或当前修复文物 |
| `POST` | `/api/player/relics/:relicId/advance` | 使用指定工具推进一道修复工序 |
| `POST` | `/api/player/relics/:relicId/reset` | 重置某件已拥有文物的修复进度 |
| `POST` | `/api/player/dev/reset` | 开发环境重置玩家资料、库存、钱包、问答与修复进度 |

修复工坊当前包含 14 件文物，每件依次完成七道工序：

```text
锤子 → 热风枪 → 镊子 → 滴管 → 手术刀 → 针锥 → 电烙铁
```

服务端会校验用户是否拥有并已装备对应文物与工具，同时使用条件更新防止并发推进同一步骤。每件文物分别记录 `completedSteps` 和 `completedAt`，切换文物或重新登录后可继续上次进度。

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
- `ITEM_NOT_OWNED`
- `INVALID_LOADOUT_KIND`
- `RELIC_NOT_FOUND`
- `RELIC_NOT_OWNED`
- `RELIC_NOT_EQUIPPED`
- `TOOL_NOT_FOUND`
- `TOOL_NOT_OWNED`
- `TOOL_NOT_EQUIPPED`
- `WRONG_RESTORATION_TOOL`
- `RESTORATION_CONFLICT`
- `QUESTION_NOT_FOUND`
- `QUESTION_INACTIVE`
- `INVALID_ANSWER`
- `INVALID_QUESTION_ID`
- `INTERNAL_SERVER_ERROR`

## 数据库模型

```text
User
 ├── Wallet?
 ├── PlayerProfile?
 ├── PlayerPreference?
 ├── ShopOwnership[]
 ├── RelicRestoration[]
 ├── QuizAttempt[]
 └── QuizReward[]

Question
 ├── QuizAttempt[]
 └── QuizReward[]
```

- `Wallet.userId` 为唯一键，一名用户最多拥有一个钱包。
- `PlayerProfile` 保存昵称、简介和头像配色；修复师称号根据知识挑战首次通关数量实时计算。
- `PlayerPreference` 保存已装备工具、场所、工作台和当前文物。
- `ShopOwnership` 保存用户拥有的工具、场所、工作台和文物，并使用 `@@unique([userId, itemType, itemId])` 防止重复拥有。
- `RelicRestoration` 按用户和文物保存完成工序数及完成时间，并使用 `@@unique([userId, relicId])` 保证一件文物只有一条进度。
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
│  ├─ api/playerApi.js             # 玩家状态、资料、装备、修复、钱包与商店请求
│  ├─ api/quizApi.js               # 题目、判题与通关进度请求
│  ├─ components/AuthGuard/        # 统一登录路由守卫
│  ├─ components/                  # 其他通用组件
│  ├─ context/PlayerContext.jsx    # 汇总服务器玩家状态及页面操作
│  ├─ constants/                   # 路由与主页模块配置
│  ├─ data/                        # 科普、商品、文物和修复步骤等静态配置
│  ├─ pages/                       # 登录、主页、科普、问答、商店、工坊与个人中心
│  └─ styles/                      # 全局和页面样式
├─ server/
│  ├─ prisma/
│  │  ├─ migrations/               # 数据库迁移
│  │  ├─ schema.prisma             # 用户、玩家状态、修复进度、钱包与问答模型
│  │  └─ seed.js                   # 知识挑战题库 Seed
│  ├─ src/
│  │  ├─ constants/                # 游戏经济、商店和修复步骤常量
│  │  ├─ controllers/              # 认证、玩家、钱包、商店、问答控制器
│  │  ├─ middleware/               # JWT Cookie 认证中间件
│  │  ├─ routes/                   # API 路由
│  │  ├─ services/                 # 玩家、修复、钱包、商店与问答事务逻辑
│  │  ├─ lib/                      # Prisma 和错误类型
│  │  ├─ app.js                    # Express 应用
│  │  └─ server.js                 # 服务入口与优雅关闭
│  └─ tests/                       # 钱包问答与玩家修复两套集成测试
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

### 后端集成测试

先启动后端，再在 `server/` 目录运行：

```bash
npm run test:wallet-quiz
npm run test:player
```

两套测试脚本都会创建临时用户并在结束时清理。`test:wallet-quiz` 覆盖：

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

`test:player` 覆盖：

- 玩家状态初始化、资料持久化和客户端伪造称号保护
- 文物购买、重复购买和当前文物装备
- 错误工具拒绝与七道修复工序持久化
- 修复进度读取、单件文物重置和开发环境全量重置

### 前端

```bash
npm run build
```

`_verify/` 保存原 React 页面重构时使用的布局、像素和交互校验材料。

## 安全设计

- 密码使用 bcrypt 进行哈希，不保存明文密码。
- JWT 通过 HttpOnly Cookie 保存，前端 JavaScript 无法直接读取。
- 除登录页外的前端页面统一经过 `AuthGuard`；真正的数据授权仍由后端认证中间件完成。
- 钱包、商店和问答接口的用户身份只来自认证中间件。
- 玩家资料、装备和修复接口只操作认证 Cookie 对应的当前用户。
- 兑换比例、题目答案、奖励金额和钱包修改均由后端决定。
- 题目读取接口不返回正确答案。
- 兑换使用原子条件更新，防止并发超额消费。
- 商品价格与所有权由后端决定，唯一约束和事务处理防止重复购买。
- 钱包和库存不写入 `localStorage`，浏览器本地值不能作为资产依据。
- 工具、文物所有权和当前装备均由后端校验，客户端不能越权推进修复进度。
- `QuizReward` 唯一约束与 Prisma transaction 共同防止并发刷奖励。
- 钱包余额和题目奖励在数据库层禁止负数。

## 开发计划

### 已完成

- [x] React 登录、注册、主页及统一登录路由守卫
- [x] Express + Prisma + MySQL/MariaDB 后端
- [x] 用户注册、登录、退出和登录状态检查
- [x] 新用户事务创建钱包、老用户钱包自动补建
- [x] 元宝和铜钱钱包及 `1:1000` 双向兑换
- [x] 钱包余额与兑换前端对接
- [x] 商店购买、用户库存和前端对接
- [x] 玩家昵称、简介、头像和修复师称号持久化
- [x] 工具、场所、工作台和当前文物装备方案持久化
- [x] 14 件文物商店、所有权与工坊接入
- [x] 七道修复工序、工具顺序校验和按文物保存进度
- [x] 数据库题库、后端判题、答题奖励与历史
- [x] 知识挑战前端接入、账号通关进度恢复和每题 100 铜钱奖励
- [x] 数据库级防重复奖励和非负数约束
- [x] 5 道知识挑战题库 Seed
- [x] 钱包、商店、问答、玩家资料和修复进度集成测试

### 待开发

- [ ] 答题历史展示页面
- [ ] “记住登录状态”的差异化行为
- [ ] 忘记密码/密码重置
- [ ] 商店正式定价、修复完成奖励和经济平衡
- [ ] 修复历史、已修复文物图鉴和修复报告
- [ ] 3D 模型解锁
- [ ] 科普内容接口化
- [ ] 排行、成就与完整修复师等级体系
- [ ] 题库、商品、科普内容和用户管理后台
- [ ] 前端自动化测试、CI/CD 和生产部署配置

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

当前代码提供统一登录守卫、数据库玩家资料、钱包与 `1 元宝 = 1000 铜钱` 双向兑换、工具/场所/工作台/文物购买与装备、完整知识挑战，以及 14 件文物的七道修复流程和进度持久化。商店商品目前仍为 0 价格；答题历史展示、正式经济与修复奖励、修复档案/图鉴、3D 模型、内容管理后台和生产工程仍属于后续范围。

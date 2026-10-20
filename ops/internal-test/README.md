# 内部测试环境操作手册（A01—A05）

本环境用于成年团队成员内测。账号预建、测试库独立且可丢弃；不接收真实学生数据。所有应用进程仅监听 `127.0.0.1`，由 Tailscale Serve 在尾网内提供 HTTPS。**使用 `tailscale serve`，不要使用 `tailscale funnel`。**

## 一次性准备

1. 在项目根目录和 `server/` 分别运行 `npm ci`。本机需要 Node.js 24、MySQL 8.4 和已登录的 Tailscale。
2. 确认现有开发库的管理员环境文件只在本机，执行（用实际路径替换示例）：

   ```powershell
   Set-Location server
   node scripts/provision-internal-test.cjs --admin-env 'C:\path\to\dev\server\.env' --public-origin 'https://<设备名>.<尾网名>.ts.net:8443'
   ```

   脚本仅允许连接本机 MySQL，且在目标库或用户已存在时拒绝覆盖。它创建 `guji_web_internal_test`、最小 DML 权限的应用账号、单独的迁移账号，并生成被 Git 忽略的 `.env.internal-test` 和 `.env.internal-migrate`。不要把这两个文件发给成员。
3. 只向隔离测试库应用迁移并初始化五道题：

   ```powershell
   $env:DOTENV_CONFIG_PATH = (Resolve-Path '.env.internal-migrate').Path
   npx --no-install prisma validate
   npx --no-install prisma migrate deploy
   npx --no-install prisma generate
   $env:DOTENV_CONFIG_PATH = (Resolve-Path '.env.internal-test').Path
   node prisma/seed.js
   ```

4. 检查 `tailscale serve status --json`，确保 8443 端口未用于其他项目。本项目使用 8443；本机现有的 443 端口服务不要覆盖。Tailscale 管理员应确认测试成员的尾网访问权限。
5. 检查 MySQL 的入站防火墙规则。本机已将原有的 `Port 3306` 和 `Port 33060` 全网放行规则禁用，应用与迁移用户也都只允许 `localhost` 登录。其他机器若有远程 MySQL 需求，应先评估并设置更窄的访问范围；不要直接套用全网放行规则。

## A04：现有集成测试

两套现有测试包含开发环境的重置接口，因此只在隔离测试库、开发模式下运行。项目根目录的以下命令会清除当前 shell 中可能残留的数据库变量、临时启动后端、运行测试并停止后端：

```powershell
./ops/internal-test/run-integration.ps1
```

测试脚本创建临时用户并尝试清理；若失败，先核对测试库，不要在开发库或正式库重跑。

## A05：生产模式 HTTPS 演练

1. 从项目根目录执行 `./ops/internal-test/start.ps1`。脚本以 `VITE_API_URL=/api` 和 `VITE_ENABLE_REGISTRATION=false` 构建前端；后端用 `.env.internal-test` 中的 `NODE_ENV=production` 和 `ALLOW_SELF_REGISTRATION=false` 启动。网关将 `/api` 转发到后端，并为 `/pages/*.html` 提供单页应用回退。所有进程只监听本机回环地址。
2. 在已确认 8443 未被占用后，执行 `tailscale serve --bg --https=8443 4174`。这只把应用共享给同一尾网，且不改动现有 443 服务。
3. 只在首次准备时，从项目根目录执行 `./ops/internal-test/create-accounts.ps1`，为成年测试成员预建独立账号。脚本直接在隔离测试库创建三个账号，将凭证写入被 Git 忽略的 `ops/internal-test/.runtime/test-accounts.txt`；管理员逐人私下分发，不要把凭证上传 Git 或群发。
4. 从项目根目录执行：

   ```powershell
   ./ops/internal-test/run-smoke.ps1
   ```

5. 用一台已加入同一 Tailscale 尾网的成员设备，打开上述 HTTPS 地址，检查登录、子页面刷新、购买、答题和修复进度。确认外部公网设备无法访问。当前没有学生参与。
6. 停止应用时执行 `./ops/internal-test/stop.ps1`。若需要同时撤销 Tailscale 共享，先核对 8443 仍指向本项目，再执行 `tailscale serve --https=8443 off`；不要重置整台设备的 Serve 配置。

## 记录与验收

- 记录 `npm run build`、`prisma validate`、迁移、题库、两套集成测试、HTTPS 冒烟测试的结果及日期。
- 记录成员设备访问结果、Tailscale 访问控制核对人和阻断性问题。
- 当前 `/api/health` 只能证明应用进程工作，不能证明数据库可用；正式上线前还需增加数据库就绪检查和告警。

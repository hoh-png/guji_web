const { randomBytes } = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")
const dotenv = require("dotenv")
const mariadb = require("mariadb")

const DATABASE_NAME = "guji_web_internal_test"
const APP_USER = "guji_it_app"
const MIGRATE_USER = "guji_it_migrate"
const serverDir = path.resolve(__dirname, "..")
const appEnvPath = path.join(serverDir, ".env.internal-test")
const migrateEnvPath = path.join(serverDir, ".env.internal-migrate")

function option(name) {
  const index = process.argv.indexOf(name)
  return index < 0 ? null : process.argv[index + 1]
}

function makeUrl(base, user, password) {
  const url = new URL(base)
  url.username = user
  url.password = password
  url.pathname = `/${DATABASE_NAME}`
  url.search = ""
  url.hash = ""
  return url.toString()
}

async function main() {
  const adminEnvPath = option("--admin-env")
  const publicOriginValue = option("--public-origin")
  if (!adminEnvPath || !publicOriginValue) {
    throw new Error("Usage: node scripts/provision-internal-test.cjs --admin-env <path> --public-origin <https://tailnet-name:8443>")
  }

  const publicOrigin = new URL(publicOriginValue)
  if (publicOrigin.protocol !== "https:" || !publicOrigin.hostname.endsWith(".ts.net")) {
    throw new Error("Public origin must be an HTTPS Tailscale DNS name")
  }
  if (fs.existsSync(appEnvPath) || fs.existsSync(migrateEnvPath)) {
    throw new Error("Internal-test environment files already exist; refusing to overwrite them")
  }

  const adminEnv = dotenv.parse(fs.readFileSync(path.resolve(adminEnvPath)))
  if (!adminEnv.DATABASE_URL) throw new Error("Admin environment file has no DATABASE_URL")
  const adminUrl = new URL(adminEnv.DATABASE_URL)
  if (!new Set(["localhost", "127.0.0.1"]).has(adminUrl.hostname)) {
    throw new Error("This provisioning script only supports a local MySQL server")
  }
  if (adminUrl.pathname.slice(1) === DATABASE_NAME) {
    throw new Error("Admin URL must not point to the internal-test database")
  }

  const connection = await mariadb.createConnection({
    host: adminUrl.hostname,
    port: Number(adminUrl.port || 3306),
    user: decodeURIComponent(adminUrl.username),
    password: decodeURIComponent(adminUrl.password),
    allowPublicKeyRetrieval: true,
    connectTimeout: 5000,
  })

  try {
    const databases = await connection.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [DATABASE_NAME],
    )
    const users = await connection.query(
      "SELECT User FROM mysql.user WHERE Host = 'localhost' AND User IN (?, ?)",
      [APP_USER, MIGRATE_USER],
    )
    if (databases.length || users.length) {
      throw new Error("Test database or users already exist; inspect them before provisioning again")
    }

    const appPassword = randomBytes(32).toString("hex")
    const migratePassword = randomBytes(32).toString("hex")
    const jwtSecret = randomBytes(48).toString("hex")

    await connection.query(`CREATE DATABASE \`${DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`CREATE USER '${APP_USER}'@'localhost' IDENTIFIED BY '${appPassword}'`)
    await connection.query(`CREATE USER '${MIGRATE_USER}'@'localhost' IDENTIFIED BY '${migratePassword}'`)
    await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${DATABASE_NAME}\`.* TO '${APP_USER}'@'localhost'`)
    await connection.query(`GRANT ALL PRIVILEGES ON \`${DATABASE_NAME}\`.* TO '${MIGRATE_USER}'@'localhost'`)

    const appUrl = makeUrl(adminEnv.DATABASE_URL, APP_USER, appPassword)
    const migrateUrl = makeUrl(adminEnv.DATABASE_URL, MIGRATE_USER, migratePassword)
    const appEnv = [
      `DATABASE_URL="${appUrl}"`,
      'DB_ALLOW_PUBLIC_KEY_RETRIEVAL="true"',
      'HOST="127.0.0.1"',
      "PORT=3101",
      `JWT_SECRET="${jwtSecret}"`,
      'NODE_ENV="production"',
      'ALLOW_SELF_REGISTRATION="false"',
      `FRONTEND_URL="${publicOrigin.origin}"`,
      "",
    ].join("\n")
    const migrateEnv = [
      `DATABASE_URL="${migrateUrl}"`,
      'DB_ALLOW_PUBLIC_KEY_RETRIEVAL="true"',
      'NODE_ENV="production"',
      "",
    ].join("\n")
    fs.writeFileSync(appEnvPath, appEnv, { flag: "wx", mode: 0o600 })
    fs.writeFileSync(migrateEnvPath, migrateEnv, { flag: "wx", mode: 0o600 })

    console.log(`Created isolated database ${DATABASE_NAME} and separate app/migration users.`)
    console.log(`Saved ignored configuration files: ${path.basename(appEnvPath)}, ${path.basename(migrateEnvPath)}.`)
    console.log("Credentials were not printed. Keep both files out of shared documents and Git.")
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(error.code || error.message)
  process.exitCode = 1
})

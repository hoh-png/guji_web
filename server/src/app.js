import "dotenv/config"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import authRoutes from "./routes/auth.routes.js"

const app = express()

app.disable("x-powered-by")
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

app.use("/api/auth", authRoutes)

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" })
})

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON body" })
  }

  console.error("Unhandled server error:", error)
  return res.status(500).json({ message: "Internal server error" })
})

export default app

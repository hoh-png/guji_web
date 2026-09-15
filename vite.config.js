import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 古迹修复系统 · React 重构版构建配置
//
// base 必须是 '/'（绝对路径），不能写成 './'：
// 子页面路由形如 /pages/science.html，若产物里是相对路径 ./assets/xxx.js，
// 浏览器会按当前路由解析成 /pages/assets/xxx.js 而 404。
// 使用绝对路径后，任意路由层级都能正确加载 assets 与 images。
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    open: false,
  },
})

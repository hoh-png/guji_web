import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

/* 全局样式：设计变量 / 基础重置 / 全屏页面骨架 / 提示浮层 */
import './styles/global.css'
import './styles/page.css'
import './styles/toast.css'
/* 三个子页面共用的 .sub-page 样式 */
import './styles/subpage.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

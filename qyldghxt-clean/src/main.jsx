// 应用入口文件
// 渲染根组件并初始化应用
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import ViewportScaler from './components/ViewportScaler.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ViewportScaler>
        <App />
        <Toaster position="top-right" />
      </ViewportScaler>
    </BrowserRouter>
  </React.StrictMode>,
)

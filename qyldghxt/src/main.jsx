// 应用入口文件
// 渲染根组件并初始化应用
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import ViewportScaler from './components/ViewportScaler.jsx'
import './index.css'

// 处理Chrome扩展通信请求，避免"Could not establish connection"错误
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // 添加消息监听器，处理扩展发送的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 简单响应，避免扩展通信错误
    sendResponse({ received: true });
    return true;
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ViewportScaler>
        <App />
      </ViewportScaler>
    </HashRouter>
  </React.StrictMode>,
)

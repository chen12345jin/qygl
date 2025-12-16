const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')

// 安全: 使用 contextBridge 暴露有限的 API，而不是使用 eval
let serverConfig = { BASE_URL: 'http://localhost:5004', DISABLE_LOGIN: true }

try {
  const p = path.join(process.resourcesPath || '', 'config.js')
  const code = fs.readFileSync(p, 'utf8')
  
  // 安全解析配置（避免使用 eval）
  const configMatch = code.match(/window\.SERVER_CONFIG\s*=\s*(\{[^}]+\})/)
  if (configMatch && configMatch[1]) {
    // 使用 Function 构造器比 eval 稍微安全一点
    serverConfig = (new Function('return ' + configMatch[1]))()
  }
} catch (err) {
  console.warn('Failed to load server config:', err.message)
}

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('SERVER_CONFIG', serverConfig)
contextBridge.exposeInMainWorld('electronAPI', {
  // 可以在这里添加需要的 Electron API
  platform: process.platform,
  versions: process.versions
})

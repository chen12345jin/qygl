import { app, BrowserWindow, Menu, dialog, shell, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null

// ========== 自动更新配置 ==========
// 读取外部配置文件获取更新服务器地址
function getUpdateServerUrl() {
  try {
    // 打包后从 resources 目录读取配置
    const configPath = app.isPackaged
      ? path.join(process.resourcesPath, 'config.js')
      : path.join(__dirname, '../public/config.js')
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      
      // 优先读取 UPDATE_URL
      const updateMatch = content.match(/UPDATE_URL:\s*['"]([^'"]+)['"]/)
      if (updateMatch && updateMatch[1]) {
        return updateMatch[1]
      }
      
      // 其次从 BASE_URL 推断
      const baseMatch = content.match(/BASE_URL:\s*['"]([^'"]+)['"]/)
      if (baseMatch && baseMatch[1]) {
        const baseUrl = baseMatch[1].replace(/\/+$/, '')
        return `${baseUrl}/updates/`
      }
    }
  } catch (e) {
    console.error('读取更新配置失败:', e)
  }
  // 默认地址（开发/测试用）
  return 'http://localhost:5004/updates/'
}

function setupAutoUpdater() {
  // 配置更新服务器地址
  const updateUrl = getUpdateServerUrl()
  console.log('更新服务器地址:', updateUrl)
  
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updateUrl
  })
  
  // 不自动下载，先提示用户
  autoUpdater.autoDownload = false
  // 退出时自动安装
  autoUpdater.autoInstallOnAppQuit = true

  // 检查更新时
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${info.version}，是否立即下载？`,
      detail: `当前版本: v${app.getVersion()}`,
      buttons: ['立即下载', '稍后提醒'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  // 没有新版本
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本')
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent)
    console.log(`下载进度: ${percent}%`)
    // 更新窗口标题显示进度
    if (mainWindow) {
      mainWindow.setTitle(`企业年度规划系统 - 下载更新 ${percent}%`)
    }
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
    // 恢复窗口标题
    if (mainWindow) {
      mainWindow.setTitle('企业年度规划系统')
    }
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新就绪',
      message: `新版本 v${info.version} 已下载完成`,
      detail: '点击"立即安装"将重启应用并完成更新',
      buttons: ['立即安装', '下次启动时安装'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })

  // 更新错误
  autoUpdater.on('error', (err) => {
    console.error('自动更新出错:', err)
    // 静默处理错误，不打扰用户（除非是手动检查更新）
  })
}

// 手动检查更新（供菜单调用）
function checkForUpdatesManually() {
  autoUpdater.checkForUpdates().then((result) => {
    if (!result || !result.updateInfo) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        detail: `版本: v${app.getVersion()}`
      })
    }
  }).catch((err) => {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '检查更新失败',
      message: '无法连接到更新服务器',
      detail: err.message
    })
  })
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico')
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: iconPath
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3003')
  }

  const template = [
    {
      label: '文件',
      submenu: [
        { role: 'close', label: '关闭' },
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭窗口' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: () => {
            checkForUpdatesManually()
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '企业年度规划系统',
              detail: `版本: v${app.getVersion()}\n© 2025 All Rights Reserved`
            })
          }
        },
        {
          label: '官方网站',
          click: () => { shell.openExternal('https://example.com') }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  
  // 仅在打包后启用自动更新
  if (app.isPackaged) {
    setupAutoUpdater()
    // 启动后 5 秒静默检查更新
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('静默检查更新失败:', err.message)
      })
    }, 5000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

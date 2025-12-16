import { app, BrowserWindow, shell } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  const resourcesPath = process.resourcesPath
  const backendPath = path.join(resourcesPath, 'backend')
  const html = `data:text/html;charset=utf-8,
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>服务端安装向导</h2>
      <p>部署文件已解压至: ${backendPath.replace(/\\/g, '\\\\')}</p>
      <hr/>
      <p><b>部署步骤：</b></p>
      <ol>
        <li>进入安装目录的 resources/backend 文件夹</li>
        <li>右键以管理员身份运行 install_service.bat</li>
      </ol>
      <button id="openFolder">打开部署文件夹</button>
      <script>
        document.getElementById('openFolder').addEventListener('click', () => {
          // 使用 window.open 作为降级方案
          window.location.href = 'file:///${backendPath.replace(/\\/g, '/')}';
        });
      </script>
    </div>`
  win.loadURL(html)
  
  // 添加 IPC 处理以安全地打开文件夹
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file:///')) {
      event.preventDefault()
      shell.openPath(backendPath)
    }
  })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

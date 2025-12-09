import { app, BrowserWindow, shell } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
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
      <button onclick="require('electron').shell.openPath('${backendPath.replace(/\\/g, '\\\\')}')">打开部署文件夹</button>
    </div>`
  win.loadURL(html)
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

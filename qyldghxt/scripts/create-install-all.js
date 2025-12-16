import fs from 'fs'
import path from 'path'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'))
const version = pkg.version
const releaseRoot = path.join(root, 'azb', version, 'release')
const serverExe = path.join(releaseRoot, 'server', `企业年度规划系统-服务端 Setup ${version}.exe`)
const clientExe = path.join(releaseRoot, 'client', `Client-Setup-${version}.exe`)
const outBat = path.join(releaseRoot, 'install_all.bat')

if (!fs.existsSync(serverExe)) {
  console.error('❌ 未找到服务端安装包:', serverExe)
}
if (!fs.existsSync(clientExe)) {
  console.error('❌ 未找到前端安装包:', clientExe)
}

const bat = [
  '@echo off',
  'setlocal',
  'cd /d %~dp0',
  'echo 正在安装服务端...',
  `powershell -Command "Start-Process -FilePath \"${serverExe.replace(/\\/g, '/') }\" -ArgumentList '/S' -Verb runAs -Wait"`,
  'echo 服务端安装完成',
  'echo 确认服务未运行，避免与前端安装器互斥...',
  'sc stop QYGL_Backend_Service >nul 2>&1',
  'taskkill /F /IM 企业年度规划系统服务端.exe >nul 2>&1',
  'timeout /t 2 >nul',
  'echo 正在安装前端...',
  `powershell -Command "Start-Process -FilePath \"${clientExe.replace(/\\/g, '/') }\" -ArgumentList '/S' -Verb runAs -Wait"`,
  'echo 前端安装完成',
  'echo 启动服务端...',
  'sc start QYGL_Backend_Service',
  'echo 全部安装完成',
  'endlocal'
].join('\r\n')

fs.writeFileSync(outBat, bat, 'utf-8')
console.log('✅ 已生成一键安装脚本:', outBat)

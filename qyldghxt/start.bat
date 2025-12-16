::
:: 企业年度规划系统启动脚本
:: 
:: 功能：
:: - 启动后端服务器 (端口: 5004)
:: - 启动前端开发服务器 (端口: 3003)
:: - 自动打开所需的命令行窗口
:: - 显示服务器状态信息
::
@echo off
echo Starting Enterprise Annual Planning System...
cd /d %~dp0
echo Current directory: %CD%
start cmd /k "cd /d %CD% && node server/index.js"
timeout /t 3 /nobreak
start cmd /k "cd /d %CD% && npm run dev"
echo Backend server running on http://localhost:5004
echo Frontend server running on http://localhost:3003
echo Please check the opened windows for server status.
pause

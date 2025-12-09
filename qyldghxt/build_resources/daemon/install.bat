@echo off 
cd /d "%~dp0" 
 
:: --- 确保日志目录存在 ---
if not exist "..\logs" mkdir "..\logs"

:: --- 路径解析 (转为绝对路径) --- 
:: 1. 后端可执行文件（独立打包）
set APP_EXE=%~dp0..\..\backend-service.exe

:: 2. 定位 后端代码目录 (AppDirectory)
set APP_DIR=%~dp0..\..

:: 3. 入口文件 (相对于 AppDirectory)
set APP_ENTRY=

:: --- NSSM 服务配置 --- 
set SERVICE_NAME=QYGL_Backend_Service 
 
:: 停止旧服务 (如果存在)
nssm stop %SERVICE_NAME% 
nssm remove %SERVICE_NAME% confirm 
 
:: 安装服务
nssm install %SERVICE_NAME% "%APP_EXE%" 
nssm set %SERVICE_NAME% AppDirectory "%APP_DIR%" 
nssm set %SERVICE_NAME% AppParameters "%APP_ENTRY%" 

:: 设置日志
nssm set %SERVICE_NAME% AppStdout "%APP_DIR%\logs\out.log" 
nssm set %SERVICE_NAME% AppStderr "%APP_DIR%\logs\err.log" 
 
:: 设置自动重启
nssm set %SERVICE_NAME% AppExit Default Restart
nssm set %SERVICE_NAME% AppRestartDelay 1000
nssm set %SERVICE_NAME% AppEnvironmentExtra "PORT=5004;DB_ENABLED=true;DB_HOST=localhost;DB_USER=root;DB_PASSWORD=;DB_NAME=planning_system;ENABLE_AUTH=true"

:: 启动服务
nssm start %SERVICE_NAME% 

!macro customInstall
  DetailPrint "正在注册并启动后端服务..."
  
  ; 检查批处理文件是否存在
  IfFileExists "$INSTDIR\resources\backend\daemon\install.bat" 0 +3
    ; 运行安装脚本，隐藏窗口
    ExecWait '"$INSTDIR\resources\backend\daemon\install.bat"'
    Goto +2
    
  DetailPrint "错误：找不到服务安装脚本！"
!macroend

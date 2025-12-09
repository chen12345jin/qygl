!include "MUI2.nsh"
Unicode true

; 定义常量
!define PRODUCT_NAME "Enterprise Annual Planning System Server"
!define EXE_NAME "Backend_Setup.exe"
!define SERVICE_NAME "PKGLXT-Server"

Name "${PRODUCT_NAME}"
OutFile "${EXE_NAME}"
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"
ShowInstDetails show
RequestExecutionLevel admin

; 界面配置
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; 页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 语言
!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Server Files" SecServer
  SetOutPath "$INSTDIR"
  
  ; 停止并删除旧服务
  DetailPrint "正在停止旧服务..."
  ExecWait '"$INSTDIR\nssm.exe" stop ${SERVICE_NAME}'
  ExecWait '"$INSTDIR\nssm.exe" remove ${SERVICE_NAME} confirm'
  Sleep 2000

  ; 复制文件
  File "backend-service.exe"
  File "nssm.exe"
  File "install_service.bat"
  
  ; 创建卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; 运行安装脚本
  DetailPrint "正在安装服务..."
  ExecWait '"$INSTDIR\install_service.bat"'
SectionEnd

Section "Uninstall"
  ; 停止并删除服务
  DetailPrint "正在移除服务..."
  ExecWait '"$INSTDIR\nssm.exe" stop ${SERVICE_NAME}'
  ExecWait '"$INSTDIR\nssm.exe" remove ${SERVICE_NAME} confirm'
  
  Delete "$INSTDIR\backend-service.exe"
  Delete "$INSTDIR\nssm.exe"
  Delete "$INSTDIR\install_service.bat"
  Delete "$INSTDIR\uninstall.exe"
  Delete "$INSTDIR\logs\*.log"
  RMDir "$INSTDIR\logs"
  RMDir "$INSTDIR"
SectionEnd

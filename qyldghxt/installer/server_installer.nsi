!include "MUI2.nsh"
Unicode true

; Define constants
!define PRODUCT_NAME "Enterprise Planning Server"
!define EXE_NAME "Server-Setup-1.0.0.exe"
!define INSTALL_DIR_NAME "EnterprisePlanningServer"

Name "${PRODUCT_NAME}"
OutFile "..\release\server\${EXE_NAME}"
InstallDir "C:\${INSTALL_DIR_NAME}"
RequestExecutionLevel admin

; UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Server Files" SecServer
  SetOutPath "$INSTDIR"
  
  ; Copy all files from the prepared ServerSource directory
  ; The script is in 'installer/', so we go up one level to 'release/server-source'
  File /r "..\release\server-source\*.*"

  ; Create Desktop Shortcut
  CreateShortCut "$DESKTOP\Start Planning Server.lnk" "$INSTDIR\start_server.bat" "" "$INSTDIR\backend-service.exe" 0
  
  ; Create Start Menu Shortcut
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Start Server.lnk" "$INSTDIR\start_server.bat" "" "$INSTDIR\backend-service.exe" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"

  ; Write Uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
SectionEnd

Section "Uninstall"
  ; Delete installed files
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR\mysql" ; Remove mysql folder if it exists
  RMDir /r "$INSTDIR"
  
  ; Delete Shortcuts
  Delete "$DESKTOP\Start Planning Server.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Start Server.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
SectionEnd

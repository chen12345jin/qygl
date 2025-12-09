!macro customInstall
  SetOutPath "$INSTDIR"
  IfFileExists "$INSTDIR\resources\backend\install_service.bat" 0 +3
  ExecWait '"$INSTDIR\resources\backend\install_service.bat"'
  Sleep 2000
!macroend

!macro customUnInstall
  IfFileExists "$INSTDIR\resources\backend\nssm.exe" 0 +4
  ExecWait '"$INSTDIR\resources\backend\nssm.exe" stop QYLDGHXTServer'
  ExecWait '"$INSTDIR\resources\backend\nssm.exe" remove QYLDGHXTServer confirm'
!macroend

; Mantém o appId/GUID das versões anteriores para atualizar o mesmo produto.
!ifndef BUILD_UNINSTALLER
  Var SiadeskExistingDirectory
  Var SiadeskExistingMode
  Var SiadeskWelcomeTitle
  Var SiadeskWelcomeText

  !macro customInit
    InitPluginsDir
    File /oname=$PLUGINSDIR\siadesk-install.ps1 "${BUILD_RESOURCES_DIR}\siadesk-install.ps1"
    StrCpy $SiadeskExistingDirectory ""
    StrCpy $SiadeskExistingMode ""

    ; O electron-builder já recuperou as instalações registradas neste ponto.
    ${If} ${FileExists} "$perUserInstallationFolder\${APP_EXECUTABLE_FILENAME}"
      StrCpy $SiadeskExistingDirectory $perUserInstallationFolder
      StrCpy $SiadeskExistingMode "CurrentUser"
    ${ElseIf} ${FileExists} "$perMachineInstallationFolder\${APP_EXECUTABLE_FILENAME}"
      StrCpy $SiadeskExistingDirectory $perMachineInstallationFolder
      StrCpy $SiadeskExistingMode "all"
    ${EndIf}

    ; /D é uma escolha explícita do operador e também permite testes isolados.
    !insertmacro GetDParameter $R0
    ${If} $R0 != ""
      StrCpy $SiadeskExistingDirectory ""
      StrCpy $SiadeskExistingMode ""
    ${ElseIf} $SiadeskExistingDirectory == ""
      ; As primeiras distribuições eram portáteis e não tinham registro no Windows.
      ; Procura apenas os atalhos conhecidos, sem varrer discos ou dados de projetos.
      nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\siadesk-install.ps1" -FindInstallation'
      Pop $R0
      Pop $R1
      ${If} $R0 != 0
        ${IfNot} ${Silent}
          MessageBox MB_OK|MB_ICONEXCLAMATION "Não foi possível verificar se o SIADESK já está instalado.$\r$\n$\r$\nA instalação foi cancelada para evitar criar uma cópia separada. Entre em contato com o suporte da SIAMAC."
        ${EndIf}
        SetErrorLevel 2
        Quit
      ${EndIf}
      ${If} $R0 == 0
      ${AndIf} $R1 != ""
        StrCpy $SiadeskExistingDirectory $R1
        StrCpy $SiadeskExistingMode "portable"
      ${EndIf}
    ${EndIf}

    ${If} $SiadeskExistingDirectory != ""
      StrCpy $INSTDIR $SiadeskExistingDirectory
      StrCpy $SiadeskWelcomeTitle "Atualizar o SIADESK"
      StrCpy $SiadeskWelcomeText "O SIADESK já está instalado em:$\r$\n$SiadeskExistingDirectory$\r$\n$\r$\nEste assistente atualizará essa instalação para a versão ${VERSION}, preservando os projetos e as configurações do usuário.$\r$\n$\r$\nSalve seu trabalho e feche o SIADESK antes de continuar."
      ; Evita que a instalação silenciosa escolha outro escopo.
      ${If} $SiadeskExistingMode == "all"
        StrCpy $hasPerUserInstallation "0"
        StrCpy $hasPerMachineInstallation "1"
      ${Else}
        StrCpy $hasPerUserInstallation "1"
        StrCpy $hasPerMachineInstallation "0"
      ${EndIf}
    ${Else}
      StrCpy $SiadeskWelcomeTitle "Instalar o SIADESK"
      StrCpy $SiadeskWelcomeText "Este assistente instalará o SIADESK ${VERSION} neste computador.$\r$\n$\r$\nSe já utiliza o aplicativo, salve seu trabalho e feche o SIADESK antes de continuar.$\r$\n$\r$\nClique em Avançar para continuar."
    ${EndIf}
  !macroend

  !macro customWelcomePage
    !define MUI_WELCOMEPAGE_TITLE "$SiadeskWelcomeTitle"
    !define MUI_WELCOMEPAGE_TEXT "$SiadeskWelcomeText"
    !insertmacro MUI_PAGE_WELCOME
  !macroend

  !macro customInstallMode
    ${If} $SiadeskExistingMode == "all"
      StrCpy $isForceMachineInstall "1"
    ${ElseIf} $SiadeskExistingMode == "CurrentUser"
      StrCpy $isForceCurrentInstall "1"
    ${ElseIf} $SiadeskExistingMode == "portable"
      StrCpy $installMode "CurrentUser"
      SetShellVarContext current
      StrCpy $INSTDIR $SiadeskExistingDirectory
      Abort
    ${EndIf}
  !macroend

  ; Nunca encerra uma sessão com trabalho não salvo para substituir os arquivos.
  !macro customCheckAppRunning
    siadesk_check_running:
      nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\siadesk-install.ps1" -CheckRunning -InstallDirectory "$INSTDIR"'
      Pop $R0
      Pop $R1
      ${If} $R0 != 0
        ${If} ${Silent}
          SetErrorLevel 2
          Quit
        ${EndIf}
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Não foi possível liberar a instalação do SIADESK.$\r$\n$\r$\nSalve seus projetos e feche o SIADESK. Depois, clique em Repetir.$\r$\n$\r$\nNenhum aplicativo será encerrado automaticamente." IDRETRY siadesk_check_running
        SetErrorLevel 2
        Quit
      ${EndIf}
  !macroend
!endif

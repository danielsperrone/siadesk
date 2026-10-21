@echo off

rem Encerra janelas CMD antigas que rodam o executor do SIADESK antes de renomear esta janela
taskkill /fi "windowtitle eq SIADESK - Executor Web" /t /f >nul 2>&1
taskkill /fi "windowtitle eq SIADESK - Executor Desktop" /t /f >nul 2>&1

rem Libera portas de processos órfãos
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do (
    taskkill /f /pid %%a >nul 2>&1
)
rem O simulador RTSP controla seus próprios processos e informa conflitos de porta.
rem Não encerre MediaMTX ou FFmpeg de outros programas ao abrir o SIADESK.

title SIADESK - Inicializador
color 0B

echo =====================================================================
echo                SIADESK - AUTOMACAO DE BALANCA RODOVIARIA
echo =====================================================================
echo.
echo [INFO] Iniciando verificacoes de ambiente...
echo.

rem Verifica se o Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O Node.js nao foi encontrado no seu sistema.
    echo Por favor, instale o Node.js antes de executar o projeto.
    echo Acesse: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

rem Verifica se a pasta node_modules existe, se nao, instala as dependencias
if not exist node_modules (
    color 0E
    echo [AVISO] A pasta 'node_modules' nao foi encontrada.
    echo [INFO] Instalando as dependencias do projeto ^(npm install^)...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERRO] Falha ao instalar as dependencias. Verifique os erros acima.
        echo.
        pause
        exit /b %errorlevel%
    )
    color 0B
    echo.
    echo [OK] Dependencias instaladas com sucesso!
    echo.
)

echo ---------------------------------------------------------------------
echo Escolha o modo de execucao do SIADESK:
echo ---------------------------------------------------------------------
echo  [1] Aplicativo Desktop (Recomendado - Suporta RTSP/Cameras Virtuais)
echo  [2] Versao Web (Apenas visualizacao no Navegador - Sem RTSP)
echo ---------------------------------------------------------------------
echo.
set /p opcao="Escolha uma opcao (1 ou 2, padrao 1): "

if "%opcao%"=="" set opcao=1

if "%opcao%"=="1" (
    title SIADESK - Executor Desktop
    echo.
    echo [INFO] Iniciando em modo Desktop...
    echo.
    call npm run app
) else (
    title SIADESK - Executor Web
    echo.
    echo [INFO] Iniciando em modo Navegador...
    echo.
    call npm run dev -- --open
)

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] O aplicativo foi encerrado ou ocorreu um erro.
    echo.
    pause
)

@echo off

rem Encerra janelas CMD antigas que rodam o executor do SIADESK antes de renomear esta janela
taskkill /fi "windowtitle eq SIADESK - Executor Web" /t /f >nul 2>&1

rem Libera a porta 5173 (porta padrao do Vite) se houver algum processo orfao
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

rem Libera a porta 5174 (porta reserva do Vite) se houver algum processo orfao
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do (
    taskkill /f /pid %%a >nul 2>&1
)

title SIADESK - Executor Web
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
echo Executando o servidor e abrindo o projeto no navegador...
echo ---------------------------------------------------------------------
echo.
echo [INFO] Pressione Ctrl+C nesta janela de comando para encerrar o servidor.
echo.

rem Executa o servidor de desenvolvimento do Vite e ja abre a pagina web automaticamente
call npm run dev -- --open

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] O servidor foi encerrado ou ocorreu um erro.
    echo.
    pause
)

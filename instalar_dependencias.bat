@echo off
title SIADESK - Instalador de Dependencias
color 0B

echo =====================================================================
echo                SIADESK - INSTALADOR DE DEPENDENCIAS
echo =====================================================================
echo.
echo [INFO] Iniciando instalacao das dependencias do projeto...
echo.

rem Verifica se o Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O Node.js nao foi encontrado no seu sistema.
    echo Por favor, instale o Node.js antes de instalar as dependencias.
    echo Acesse: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Executando 'npm install' para instalar as dependencias...
echo.
call npm install

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] Falha ao instalar as dependencias. Verifique os erros acima.
    echo.
    pause
    exit /b %errorlevel%
)

color 0A
echo.
echo [OK] Todas as dependencias foram instaladas com sucesso!
echo.
echo [INFO] Agora voce ja pode iniciar o SIADESK executando o 'executar.bat'.
echo.
pause

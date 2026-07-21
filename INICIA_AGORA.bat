@echo off
chcp 65001 > nul
title 🎰 Poker Club MVP

echo.
echo ════════════════════════════════════════
echo 🎰 Poker Club MVP - Iniciando...
echo ════════════════════════════════════════
echo.

echo [1/3] Preparando banco de dados...
cd C:\Projetos\Poker\packages\backend
call npx prisma generate
call npx prisma db push --skip-generate

echo.
echo [2/3] Iniciando Backend (porta 3011)...
start "Backend - Poker Club" cmd /k npm run dev

echo.
echo [3/3] Iniciando Frontend (porta 3002)...
timeout /t 3
cd ..\web
start "Frontend - Poker Club" cmd /k npm run dev

echo.
echo ════════════════════════════════════════
echo ✅ Servidores iniciados!
echo ════════════════════════════════════════
echo.
echo 🌐 Abrindo no navegador em 3 segundos...
timeout /t 3

start http://localhost:3002

echo.
echo Pronto! Acesse: http://localhost:3002
echo.
pause

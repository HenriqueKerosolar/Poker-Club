@echo off
echo.
echo 🐳 Iniciando Docker (PostgreSQL + Redis + MinIO)...
echo.
docker-compose up -d
echo.
echo ✅ Docker iniciado!
echo.
echo Verificando status...
timeout /t 3 /nobreak
docker ps
echo.
pause

# Poker Club MVP - Setup Automático
# Execute: .\setup.ps1

Write-Host "🎰 Poker Club MVP - Setup Automático" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "1️⃣ Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js não encontrado! Baixe em https://nodejs.org/" -ForegroundColor Red
    exit
}

# Verificar Docker
Write-Host "`n2️⃣ Verificando Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  Docker não encontrado. Instale em https://docker.com/" -ForegroundColor Yellow
}

# Instalar dependências root
Write-Host "`n3️⃣ Instalando dependências root..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependências root instaladas" -ForegroundColor Green

# Instalar dependências backend
Write-Host "`n4️⃣ Instalando dependências backend..." -ForegroundColor Yellow
cd packages\backend
npm install --legacy-peer-deps
Write-Host "✅ Backend pronto" -ForegroundColor Green

# Gerar Prisma
Write-Host "`n5️⃣ Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Prisma Client gerado" -ForegroundColor Green

cd ..\..

# Instalar dependências frontend
Write-Host "`n6️⃣ Instalando dependências frontend..." -ForegroundColor Yellow
cd packages\web
npm install
Write-Host "✅ Frontend pronto" -ForegroundColor Green

cd ..\..

# Iniciar Docker
Write-Host "`n7️⃣ Iniciando banco de dados (Docker)..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 3
Write-Host "✅ Docker iniciado (PostgreSQL, Redis, MinIO)" -ForegroundColor Green

# Verificar conexão
Write-Host "`n8️⃣ Verificando conexões..." -ForegroundColor Yellow
$pgUp = docker ps --filter "name=poker_postgres" --quiet
$redisUp = docker ps --filter "name=poker_redis" --quiet

if ($pgUp -and $redisUp) {
    Write-Host "✅ PostgreSQL e Redis online" -ForegroundColor Green
} else {
    Write-Host "⚠️  Aguarde alguns segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Migrations
Write-Host "`n9️⃣ Executando Migrations..." -ForegroundColor Yellow
cd packages\backend
npx prisma migrate dev --name init --skip-generate
Write-Host "✅ Banco de dados sincronizado" -ForegroundColor Green

cd ..\..

Write-Host "`n" -ForegroundColor Green
Write-Host "═════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETO!" -ForegroundColor Green
Write-Host "═════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para rodar o projeto:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "  cd packages\backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "  cd packages\web" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Depois acesse:" -ForegroundColor Cyan
Write-Host "  🌐 http://localhost:3002" -ForegroundColor Magenta
Write-Host ""
Write-Host "🎮 Pronto para jogar!" -ForegroundColor Green

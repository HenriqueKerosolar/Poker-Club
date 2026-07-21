# Auto-start Poker Club MVP
Write-Host "🎰 Poker Club MVP - Iniciando automaticamente..." -ForegroundColor Cyan

# Verificar se npm install terminou
Write-Host "`n⏳ Aguardando instalação de dependências..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Ir para backend
Write-Host "`n🔧 Preparando banco de dados..." -ForegroundColor Yellow
cd C:\Projetos\Poker\packages\backend

# Gerar Prisma
npx prisma generate

# Criar banco (SQLite)
npx prisma db push --skip-generate

Write-Host "`n✅ Banco pronto!" -ForegroundColor Green

# Iniciar backend
Write-Host "`n🚀 Iniciando Backend (porta 3011)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Projetos\Poker\packages\backend'; npm run dev"

Start-Sleep -Seconds 3

# Iniciar frontend
Write-Host "`n🌐 Iniciando Frontend (porta 3002)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Projetos\Poker\packages\web'; npm run dev"

Write-Host "`n" -ForegroundColor Green
Write-Host "════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ TUDO INICIADO!" -ForegroundColor Green
Write-Host "════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Aguardando servidores iniciarem..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 8

Write-Host "🌐 Abrindo no navegador..." -ForegroundColor Cyan
Start-Process "http://localhost:3002"

Write-Host ""
Write-Host "✨ Pronto! O Poker Club MVP está rodando!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:3011" -ForegroundColor Magenta
Write-Host "Frontend: http://localhost:3002" -ForegroundColor Magenta

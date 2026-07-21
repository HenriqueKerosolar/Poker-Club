Write-Host "🎰 FORCE INSTALL - Reinstalando tudo..." -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "Backend..." -ForegroundColor Yellow
cd C:\Projetos\Poker\packages\backend
Write-Host "  Limpando..." -ForegroundColor Gray
rm -r node_modules -ErrorAction SilentlyContinue
rm package-lock.json -ErrorAction SilentlyContinue

Write-Host "  Instalando..." -ForegroundColor Gray
npm install --force --legacy-peer-deps

Write-Host ""
Write-Host "Frontend..." -ForegroundColor Yellow
cd C:\Projetos\Poker\packages\web
Write-Host "  Limpando..." -ForegroundColor Gray
rm -r node_modules -ErrorAction SilentlyContinue
rm package-lock.json -ErrorAction SilentlyContinue

Write-Host "  Instalando..." -ForegroundColor Gray
npm install --force

Write-Host ""
Write-Host "✅ Instalação forçada completa!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora execute:" -ForegroundColor Cyan
Write-Host "  1. cd C:\Projetos\Poker\packages\backend && npm run dev" -ForegroundColor White
Write-Host "  2. Em outro terminal: cd C:\Projetos\Poker\packages\web && npm run dev" -ForegroundColor White
Write-Host "  3. Acesse: http://localhost:3002" -ForegroundColor White

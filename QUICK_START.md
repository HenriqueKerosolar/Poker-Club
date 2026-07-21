# 🎰 Poker Club MVP - Quick Start

**Tempo total: ~15 minutos**

---

## 🚀 Opção 1: Setup Automático (RECOMENDADO)

### Passo 1: Abrir PowerShell
```powershell
# No diretório C:\Projetos\Poker, execute:
.\setup.ps1
```

Isso vai:
- ✅ Verificar Node.js e Docker
- ✅ Instalar todas as dependências
- ✅ Iniciar Docker (PostgreSQL, Redis, MinIO)
- ✅ Executar migrations do banco
- ✅ Deixar tudo pronto para rodar!

**Tempo: ~5-10 minutos**

---

## 🎮 Opção 2: Setup Manual

### Passo 1: Iniciar Docker
```powershell
# Terminal 1
docker-compose up -d
```

Aguarde 5 segundos e verifique:
```powershell
docker ps
```

### Passo 2: Backend
```powershell
# Terminal 2
cd packages\backend
npm install
npx prisma migrate dev
npm run dev
```

Aguarde até ver: `Server running on http://localhost:3011`

### Passo 3: Frontend
```powershell
# Terminal 3
cd packages\web
npm install
npm run dev
```

Aguarde até ver: `Ready in X.Xs`

### Passo 4: Acessar
```
http://localhost:3002
```

---

## ⚡ Opção 3: Scripts Rápidos (Depois do Setup)

### Iniciar tudo em 3 cliques:

1. **Duplo clique em:** `start-docker.bat`
2. **Duplo clique em:** `run-backend.bat`
3. **Duplo clique em:** `run-frontend.bat`

Depois acesse: `http://localhost:3002`

---

## ✅ Verificação

### Backend está rodando?
```powershell
curl http://localhost:3011/health
```

### Frontend está rodando?
```powershell
curl http://localhost:3002
```

### Banco conectado?
```powershell
docker ps
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```powershell
cd packages\backend
npm install --legacy-peer-deps
```

### Erro: "Database connection failed"
```powershell
docker-compose up -d
docker ps
```

### Erro: "Port already in use"
```powershell
# Matar processo na porta
netstat -ano | findstr :3011
taskkill /PID [PID] /F
```

### Erro: Prisma migrations
```powershell
cd packages\backend
npx prisma migrate reset
```

---

## 📊 Ports

| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend | 3002 | http://localhost:3002 |
| Backend | 3011 | http://localhost:3011 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MinIO | 9000/9001 | http://localhost:9001 |

---

## 🎯 Teste Rápido

### 1. Registre um usuário
```
Email: teste@email.com
Senha: Teste@123
```

### 2. Faça login
```
Email: teste@email.com
Senha: Teste@123
```

### 3. Veja o dashboard
- Carteira: R$ 100,00 inicial ✅
- Jogos ativos: 3 salas ✅
- Leaderboard: Top 5 players ✅
- Troféus: 8 desbloqueados ✅

---

## 📁 Estrutura

```
C:\Projetos\Poker\
├── packages/
│   ├── backend/      ← NestJS (porta 3011)
│   ├── web/          ← Next.js (porta 3002)
│   └── shared/       ← Tipos compartilhados
├── docker-compose.yml
├── setup.ps1
├── run-backend.bat
├── run-frontend.bat
└── start-docker.bat
```

---

## 🚀 Próximos Passos

Depois de rodar:

1. ✅ Explorar dashboard
2. ✅ Criar conta de teste
3. ✅ Testar login/logout
4. ✅ Ver wallet
5. ✅ Ver leaderboard
6. ✅ Adicionar amigos (quando implementado)
7. ✅ Jogar poker (quando implementado)

---

## 📞 Problemas?

1. Verifique se Docker está rodando
2. Verifique se as portas 3002, 3011, 5432, 6379 estão livres
3. Tente reiniciar tudo com `docker-compose down` depois `docker-compose up -d`

---

**🎉 Pronto para jogar Poker Club MVP!** 🎰

Last Updated: 2025-07-21

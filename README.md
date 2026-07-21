# 🎰 Poker Club - Aplicativo de Poker Recreativo Multiplayer

> Um aplicativo sofisticado de poker com visual premium, suporte a múltiplas modalidades, campeonatos e sistema de fichas virtuais.

## 📋 Visão Geral

**Poker Club** é um projeto full-stack moderno que permite:
- Jogar poker online com amigos (2-3 jogadores no MVP)
- Múltiplas modalidades (Texas Hold'em inicialmente)
- Sistema de fichas virtuais com saldo persistente
- Campeonatos e troféus
- Comunicação por voz via WebRTC
- Avatares personalizados
- Interface premium inspirada em cassinos internacionais

### Status do Projeto
- **Fase Atual:** 1 (Fundação)
- **MVP Target:** Agosto 2025
- **Versão:** 0.0.1 (Em desenvolvimento)

---

## 🏗️ Arquitetura

### Stack Tecnológico

```
┌──────────────────────────────────────────────────────────┐
│ Frontend (Mobile + Web)                                  │
│ React Native (Expo) + Next.js 16 + TypeScript            │
├──────────────────────────────────────────────────────────┤
│ Backend (NestJS)                                         │
│ Node.js + TypeScript + WebSocket                         │
├──────────────────────────────────────────────────────────┤
│ Data (PostgreSQL + Redis)                                │
│ Banco de dados persistente + Cache em memória            │
└──────────────────────────────────────────────────────────┘
```

### Estrutura do Monorepo

```
poker-club/
├── packages/
│   ├── backend/          # NestJS + Motor de Poker
│   ├── web/              # Next.js Admin Panel
│   ├── mobile/           # React Native + Expo
│   └── shared/           # Tipos e utilitários compartilhados
├── docker-compose.yml    # Infraestrutura local
└── docs/                 # Documentação
```

Veja [ARCHITECTURE.md](./ARCHITECTURE.md) para detalhes completos.

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker** & **Docker Compose**
- **Git**

### Setup Local

#### 1. Clone e Dependências
```bash
cd /c/Projetos/Poker
pnpm install
```

#### 2. Inicialize a Infraestrutura
```bash
# Suba PostgreSQL, Redis e MinIO
pnpm run docker:up

# Aguarde a inicialização (10-15 segundos)
pnpm run docker:logs
```

#### 3. Configuração do Banco de Dados
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Execute migrations
pnpm run migrate
```

#### 4. Inicie o Backend
```bash
pnpm run dev
```

Isso iniciará:
- Backend (NestJS): `http://localhost:3000`
- WebSocket: `ws://localhost:3000`

#### 5. Inicie o Frontend
```bash
# Em outro terminal
cd packages/web
pnpm run dev
# Acesse: http://localhost:3001
```

---

## 📖 Documentação

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitetura completa, fluxo de dados, padrões
- **[MVP_CHECKLIST.md](./MVP_CHECKLIST.md)** - Requisitos do MVP, testes de aceitação, critérios
- **[TECHNICAL_RISKS.md](./TECHNICAL_RISKS.md)** - Riscos identificados e mitigações

---

## 🎮 Como Jogar (MVP)

### Fluxo Básico

1. **Cadastro**
   - Email + Senha
   - Recebe R$ 100,00 virtuais
   - Cria avatar

2. **Criar/Entrar em Mesa**
   - Alice cria "Mesa Texas Hold'em"
   - Bob entra com código
   - Ambos na sala de espera

3. **Partida**
   - Escolhem cacife (ex: R$ 25,00 cada)
   - Servidor distribui cartas (privadas)
   - Rodadas: Pré-flop → Flop → Turn → River
   - Ações: Check, Call, Bet, Raise, Fold, All-in
   - Pote atualiza em tempo real

4. **Resultado**
   - Saldos atualizados
   - Histórico registrado
   - Próxima mão ou encerramento

---

## 🧪 Testes

### Rodar Suite Completa
```bash
pnpm run test
```

### Com Cobertura
```bash
pnpm run test:cov
```

### Watch Mode
```bash
pnpm run test:watch
```

### Testes Específicos (Motor de Poker)
```bash
cd packages/backend
pnpm run test -- --testPathPattern=poker.engine
```

**Teste crítico:** Verificar que mãos são avaliadas corretamente
```bash
pnpm run test -- HandEvaluator.test.ts
```

---

## 🔒 Segurança

### Princípios Centrais

1. **Servidor é Autoridade**
   - Cliente NUNCA escolhe cartas
   - Servidor NUNCA confiar em valores do cliente
   - Todas as ações validadas no servidor

2. **Integridade de Saldo**
   - Ledger imutável (append-only)
   - Transações ACID
   - Auditoria completa

3. **Reconexão Segura**
   - Estado restaurado do Redis
   - Timeout com ação segura (fold)
   - Sem duplicação de ações

Veja [TECHNICAL_RISKS.md](./TECHNICAL_RISKS.md) para análise completa.

---

## 🛠️ Desenvolvimento

### Lint e Formatação
```bash
pnpm run lint      # ESLint
pnpm run format    # Prettier
```

### Banco de Dados

#### Visualizar Dados
```bash
pnpm run db:studio
```

#### Criar Migration
```bash
cd packages/backend
pnpm run prisma migrate dev --name describe_change
```

### Logs

Logs estruturados em JSON no `logs/` do backend:
```bash
tail -f logs/error.log
```

---

## 📊 Fases de Desenvolvimento

| Fase | Foco | Status | ETA |
|------|------|--------|-----|
| 1 | Fundação, Autenticação, DB | 🔄 Em Progresso | 1 semana |
| 2 | Motor de Poker, Texas Hold'em | ⏳ Planejado | 1 semana |
| 3 | WebSocket, Multiplayer | ⏳ Planejado | 1 semana |
| 4 | Carteira Virtual, Saldo | ⏳ Planejado | 3 dias |
| 5 | Social (Chat, Voz, Amigos) | ⏳ Planejado | 1 semana |
| 6 | Personalização (Avatar, Cenários) | ⏳ Planejado | 1 semana |
| 7 | Campeonatos & Troféus | ⏳ Planejado | 1 semana |
| 8 | Novas Modalidades (Omaha, etc) | ⏳ Futuro | TBD |

---

## 🤝 Contribuindo

### Padrões de Código

- **TypeScript Strict Mode** ativado
- **NestJS Modules** para organização
- **Testes** em cada funcionalidade (unit + integração)
- **Commit Messages** em formato convencional:
  ```
  feat: add hand evaluator
  fix: correct flush comparison
  test: add edge case for side pots
  docs: update architecture diagram
  ```

### Antes de Fazer Push

```bash
# Lint
pnpm run lint

# Tests
pnpm run test

# Build
pnpm run build
```

---

## 📱 Plataformas Suportadas (MVP)

- ✅ **Web** (Admin Panel + Jogo no Browser)
- ✅ **iOS** (React Native)
- ✅ **Android** (React Native)
- 🔄 **Tablet** (Futuro)
- 🔄 **Smart TV** (Futuro)
- 🔄 **Desktop** (Futuro)

---

## 🎯 MVP Obrigatório

O MVP mínimo deve atender **todos** estes critérios:

- [ ] Cadastro & Login funcionando
- [ ] Criar mesa e convidar amigo
- [ ] Texas Hold'em 1v1 completamente funcional
- [ ] Servidor controla tudo (autoridade)
- [ ] Reconexão sem perda de estado
- [ ] Saldo virtual persistente
- [ ] Extrato imutável
- [ ] Bônus 24h funcionando
- [ ] Chat durante partida
- [ ] Áudio (WebRTC) opcional
- [ ] Campeonato simples com troféu
- [ ] Admin panel básico
- [ ] Testes unitários críticos
- [ ] Docker Compose funciona (`docker-compose up`)
- [ ] README com instruções

Veja [MVP_CHECKLIST.md](./MVP_CHECKLIST.md) para lista completa.

---

## ⚡ Performance & Escalabilidade

### Métricas Alvo
- Latência WebSocket: < 100ms
- Avaliação de mão: < 5ms
- Reconexão: < 2s
- Suporte para 100 mesas simultâneas

### Monitoramento
```bash
# Logs de performance
tail -f logs/app.log | grep performance

# Redis insights
redis-cli INFO stats
```

---

## 🐛 Troubleshooting

### Postgres não conecta
```bash
# Verificar se container está rodando
docker ps | grep poker_postgres

# Logs do container
docker logs poker_postgres
```

### Redis não conecta
```bash
docker logs poker_redis
redis-cli ping  # Deve retornar PONG
```

### Migrations falhando
```bash
# Reset do banco (⚠️ perde dados)
cd packages/backend
pnpm run prisma migrate reset
```

### WebSocket timeout
- Verificar firewall
- Aumentar `GAME_TIMEOUT_SECONDS` em `.env`

---

## 📄 Licença

MIT License - Veja LICENSE para detalhes.

---

## 📞 Suporte

- **Issues:** Abra no repositório Git
- **Email:** desenvolvimento@pokerclub.app
- **Docs:** [Arquitetura](./ARCHITECTURE.md)

---

## 🎉 Roadmap (Pós-MVP)

- [ ] Omaha, Five-Card Draw, Short Deck
- [ ] Galeria 3D de troféus
- [ ] Transmissão para espectadores
- [ ] OAuth (Google, Apple)
- [ ] Monetização cosmética
- [ ] Análise de mãos com IA
- [ ] Torneios de larga escala (6-9 jogadores)

---

**Desenvolvido com ❤️ para amantes de poker.**

Last Updated: 2025-07-21

# 🎰 Arquitetura do Poker Club

## 1. Visão Geral

**Poker Club** é um aplicativo multiplayer de poker recreativo com:
- Partidas online e presenciais entre amigos
- Campeonatos e ligas
- Sistema de fichas virtuais
- Suporte a múltiplas modalidades de poker
- Comunicação por voz/chat integrada
- Avatares e galeria de troféus

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Mobile + Web)                                     │
├──────────────────────┬──────────────────────────────────────┤
│ React Native / Expo  │ Next.js 16 / React                   │
│ TypeScript           │ Tailwind CSS                          │
│ Zustand + React Query│ Base UI (Admin)                      │
└──────────────────────┴──────────────────────────────────────┘
                    ↓  WebSocket + REST
┌─────────────────────────────────────────────────────────────┐
│ Backend (Node.js/NestJS)                                    │
├─────────────────────────────────────────────────────────────┤
│ • Controladores (REST)                                      │
│ • Gateways WebSocket (Salas, Partidas)                      │
│ • Serviços de Negócio (Poker, Saldo, Campeonato)            │
│ • Motor de Poker (Baralho, Turnos, Potes, Avaliação)        │
│ • Autenticação (JWT + Refresh Tokens)                       │
│ • Rate Limiting, Validação, Logs                            │
└─────────────────────────────────────────────────────────────┘
         ↓ SQL         ↓ Cache/Pub-Sub    ↓ WebRTC
┌──────────────────┬──────────────────┬──────────────────┐
│ PostgreSQL       │ Redis            │ Signaling        │
│ (Persistência)   │ (Estado, Filas)  │ (Áudio/Vídeo)    │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## 2. Estrutura do Monorepo

```
poker-club/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── auth/                 # Autenticação & JWT
│   │   │   ├── users/                # Perfis, Avatares
│   │   │   ├── wallets/              # Saldo virtual, Transações
│   │   │   ├── games/                # Lógica de Partidas
│   │   │   │   ├── poker/            # Motor de Poker
│   │   │   │   │   ├── engine/       # DeckEngine, ShuffleEngine, etc
│   │   │   │   │   ├── evaluator/    # HandEvaluator
│   │   │   │   │   └── variants/     # PokerVariant definitions
│   │   │   │   ├── room.gateway.ts   # WebSocket: Salas
│   │   │   │   └── game.gateway.ts   # WebSocket: Partidas
│   │   │   ├── tournaments/          # Campeonatos & Trophies
│   │   │   ├── social/               # Amigos, Clubes, Chat
│   │   │   ├── moderation/           # Denúncias, Abuso
│   │   │   ├── admin/                # Painel administrativo
│   │   │   ├── common/               # Pipes, Guards, Decorators
│   │   │   ├── config/               # Variáveis de ambiente
│   │   │   └── main.ts               # App bootstrap
│   │   ├── test/
│   │   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── (auth)/
│   │   │   │       ├── login/
│   │   │   │       └── register/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   ├── config/
│   │   │   └── middleware.ts
│   │   ├── .env.local
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (game)/
│   │   │   └── (tabs)/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── api/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/
│       ├── types/
│       │   ├── poker.ts              # Tipos de Poker
│       │   ├── wallet.ts             # Tipos de Saldo
│       │   ├── game.ts               # Tipos de Partida
│       │   ├── events.ts             # Tipos de Eventos
│       │   └── index.ts
│       ├── constants/
│       ├── utils/
│       └── package.json
│
├── docker-compose.yml                # Desenvolvimento local
├── .env.example
├── README.md
├── ARCHITECTURE.md (este arquivo)
├── MVP_CHECKLIST.md
├── TECHNICAL_RISKS.md
└── package.json (workspace root)
```

---

## 3. Modelo de Banco de Dados

### Schema PostgreSQL (Versão Simplificada MVP)

#### Núcleo de Usuários
```sql
users (id, email, phone, provider, password_hash, created_at)
user_profiles (id, user_id, username, display_name, country, language, level, experience)
avatars (id, user_id, image_url, style, created_at, public)
```

#### Carteira Virtual
```sql
virtual_wallets (id, user_id, balance_cents, stock_cents, reserved_cents)
wallet_transactions (
  id, wallet_id, type (credit/debit),
  description, amount_cents, balance_before, balance_after,
  game_id, tournament_id, reference_id, created_at
)
conversion_rates (id, rate_cents_per_chip, effective_date)
recovery_credits (user_id, last_granted_at, next_eligible_at)
```

#### Amigos & Social
```sql
friendships (id, user_a_id, user_b_id, status (pending/accepted/blocked), created_at)
blocks (id, blocker_id, blocked_id, reason, created_at)
clubs (id, owner_id, name, logo_url, description, created_at)
club_members (id, club_id, user_id, role (owner/admin/member), joined_at)
```

#### Partidas & Poker
```sql
games (
  id, variant_id, created_by, status (waiting/in_progress/completed),
  created_at, started_at, ended_at,
  buy_in_cents, scenario, music, use_facilitator
)
game_players (
  id, game_id, user_id, position, initial_balance_cents,
  final_balance_cents, status (active/folded/disconnected/left),
  joined_at, left_at
)
game_hands (
  id, game_id, hand_number, status,
  dealer_button_position, sb_amount_cents, bb_amount_cents
)
game_actions (
  id, hand_id, player_id, action (fold/check/call/bet/raise/allin),
  amount_cents, sequence, timestamp
)
game_results (
  id, game_id, winner_id, amount_cents, best_hand,
  created_at
)
```

#### Campeonatos
```sql
tournaments (
  id, creator_id, name, variant_id, status,
  format (quick/best_of_3/elimination/points),
  max_participants, created_at, started_at, ended_at
)
tournament_participants (
  id, tournament_id, user_id, buy_in_cents, position,
  joined_at, eliminated_at
)
tournament_results (id, tournament_id, rank, user_id, prize_cents, trophy_id)
```

#### Troféus
```sql
trophies (
  id, name, description, material (bronze/silver/gold/platinum),
  icon_url, rarity
)
user_trophies (
  id, user_id, trophy_id, tournament_id, earned_at,
  details_json
)
```

#### Outros
```sql
reports (id, reporter_id, reported_id, reason, status (open/resolved), created_at)
audit_logs (id, admin_id, action, entity_type, entity_id, changes_json, created_at)
device_sessions (id, user_id, device_id, ip, user_agent, last_seen)
```

---

## 4. Fluxo de Dados em Tempo Real

### Arquitetura WebSocket

```
Cliente (Mobile/Web)
    ↓ (connect: { token, user_id })
    ↓
┌─────────────────────────────────────────────┐
│ RoomGateway (WebSocket)                     │
│  • Listar mesas                             │
│  • Criar mesa                               │
│  • Entrar em mesa                           │
│  • Mensagens de chat                        │
│  • Mudanças de estado                       │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ GameGateway (WebSocket + Estado Redis)      │
│  • Partida iniciada                         │
│  • Distribuição de cartas                   │
│  • Ações de jogadores (bet, fold, raise)    │
│  • Atualização de pote                      │
│  • Showdown                                 │
│  • Resultado                                │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Motor de Poker (Autoridade do Servidor)     │
│  • DeckEngine: gera baralho                 │
│  • ShuffleEngine: embaralha                 │
│  • DealerEngine: distribui cartas           │
│  • TurnEngine: controla turnos              │
│  • BettingEngine: valida apostas            │
│  • PotEngine: calcula potes                 │
│  • HandEvaluator: avalia mãos               │
│  • ShowdownEngine: determina vencedor       │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Redis (Estado Temporário)                   │
│  • Room:{roomId}: metadados da sala         │
│  • Game:{gameId}: estado da partida         │
│  • Hand:{handId}: state da mão              │
│  • User:{userId}:online: presença          │
│  • EventQueue:{roomId}: fila de eventos     │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ PostgreSQL (Persistência)                   │
│  • Resultado final da partida               │
│  • Transações de saldo                      │
│  • Histórico imutável                       │
│  • Auditoria                                │
└─────────────────────────────────────────────┘
```

---

## 5. Fluxo de MVP (Primeira Versão Funcional)

### Cenário: Alice e Bob jogam Texas Hold'em

1. **Login/Cadastro**
   - Alice cria conta com email + foto
   - Avatar gerado automaticamente
   - Recebe R$ 100,00 virtuais (10.000 fichas)

2. **Criação da Mesa**
   - Alice cria mesa: "Texas Hold'em Heads-Up"
   - Escolhe: cenário, música, fichas, blind
   - Status: WAITING

3. **Convite**
   - Compartilha código "ABC123" via link
   - Bob entra com código

4. **Sala de Espera**
   - Alice e Bob veem um ao outro
   - Confirmam estarem prontos
   - Escolhem cacife (R$ 25,00 cada)
   - Status: READY → STARTING

5. **Partida Inicia**
   - Servidor distribui 2 cartas fechadas
   - Bob é small blind (0.5 BB)
   - Alice é big blind e age primeiro pré-flop
   - Servidor controla cada ação

6. **Apostas (Exemplo)**
   - Alice: bet 50
   - Bob: raise 100
   - Alice: call
   - Servidor calcula pote

7. **Flop**
   - Servidor distribui 3 cartas comunitárias
   - Novas rodadas de apostas
   - Bob: check
   - Alice: bet 75
   - Bob: fold

8. **Resultado da Mão**
   - Pote vai para Alice
   - Saldo atualizado no Redis
   - Transação gravada no banco

9. **Próxima Mão / Encerramento**
   - Repetir ou encerrar
   - Resultado final registrado
   - Troféu se aplicável
   - Valores retornam ao saldo principal

---

## 6. Segurança - Autoridade do Servidor

### Cartas Privadas ❌ NUNCA para o Cliente

```typescript
// ✗ ERRADO
client.emit('player_action', {
  cards: [Ace_Spades, King_Diamonds], // ❌ CLIENTE ENVIA CARTAS
  action: 'fold'
});

// ✓ CORRETO
client.emit('player_action', {
  action: 'fold'
  // Servidor já sabe as cartas
});
```

### Validação Rigorosa no Servidor

```typescript
// Servidor valida CADA ação
async validateAction(gameId, playerId, action) {
  const game = await this.getGameState(gameId);
  
  // 1. É a vez deste jogador?
  if (game.current_player !== playerId) throw Error('Not your turn');
  
  // 2. A ação é legal?
  if (action.type === 'bet' && action.amount < game.bb)
    throw Error('Bet too small');
  
  // 3. Saldo suficiente?
  if (action.amount > this.getStackSize(playerId))
    throw Error('Insufficient stack');
  
  // 4. Não duplicado?
  if (this.hasActionInSequence(playerId, game.sequence))
    throw Error('Duplicate action');
  
  // Execute no servidor
  return this.executeAction(gameId, playerId, action);
}
```

---

## 7. Padrão de Eventos Versionado

Cada evento tem versionamento e validação:

```typescript
interface GameEvent {
  id: string;              // UUID único
  version: 1;              // Versão do schema
  type: string;            // Ex: 'player.bet'
  gameId: string;
  playerId?: string;
  timestamp: number;       // Unix ms
  sequence: number;        // Ordem na mão
  payload: unknown;        // Dados específicos
  signature?: string;      // Assinatura (v2)
}

// Exemplo
{
  id: "evt_abc123",
  version: 1,
  type: "player.bet",
  gameId: "game_xyz",
  playerId: "user_alice",
  timestamp: 1689234567000,
  sequence: 3,
  payload: {
    amount: 5000  // Em cents
  }
}
```

---

## 8. Fases de Implementação

### **Fase 1: Fundação**
- [ ] Monorepo Pnpm + Workspaces
- [ ] PostgreSQL + Prisma
- [ ] NestJS Backend (estrutura)
- [ ] Autenticação (JWT)
- [ ] Next.js Web (painel admin básico)
- [ ] React Native/Expo (tela splash + login)
- [ ] Docker Compose
- [ ] Logs & Config

### **Fase 2: Motor de Poker**
- [ ] Deck & Shuffle
- [ ] Texas Hold'em (lógica)
- [ ] Hand Evaluator (5 melhores cartas)
- [ ] Turnos & Apostas (1v1)
- [ ] Potes
- [ ] Testes unitários
- [ ] Replay simples

### **Fase 3: Multiplayer Realtime**
- [ ] WebSocket (Salas)
- [ ] 2 e 3 jogadores
- [ ] Reconexão
- [ ] Presença (online/offline)
- [ ] State management (Redis)

### **Fase 4: Carteira Virtual**
- [ ] Saldo inicial
- [ ] Transações imutáveis (ledger)
- [ ] Extrato
- [ ] Cacife por partida
- [ ] Bônus 24h
- [ ] Conversão fichas/reais virtuais

### **Fase 5: Social**
- [ ] Amigos
- [ ] Chat de texto
- [ ] WebRTC (áudio)
- [ ] Bloqueio
- [ ] Denúncias

### **Fase 6: Personalização**
- [ ] Avatar por foto
- [ ] Cenários (2-3 inicialmente)
- [ ] Música (silenciar)
- [ ] Temas

### **Fase 7: Campeonatos & Troféus**
- [ ] Torneios simples
- [ ] Ranking
- [ ] Troféus
- [ ] Galeria
- [ ] Pódio

### **Fase 8: Novas Modalidades**
- [ ] Omaha
- [ ] Five-Card Draw
- [ ] Short Deck
- [ ] Etc.

---

## 9. Tecnologias Confirmadas

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| **Backend** | NestJS | Estrutura modular, TypeScript, fácil testes |
| **Tempo Real** | WebSocket (Socket.IO) | Multiplayer, confiável, fallback HTTP |
| **Banco** | PostgreSQL + Prisma | Transações ACID, ORM type-safe |
| **Cache/Pub-Sub** | Redis | Estado temporário, fila de eventos |
| **Web** | Next.js 16 + Tailwind | Admin responsivo, integração fácil |
| **Mobile** | React Native (Expo) | iOS + Android, reutiliza JS |
| **Áudio** | WebRTC + PeerJS | P2P mínimo requisitos |
| **Deploy** | Docker | Portabilidade |
| **Tests** | Jest + Supertest | Unit, integração, E2E |

---

## 10. Riscos Técnicos Identificados

1. **Concorrência em Tempo Real**
   - Múltiplos clientes tentando agir simultaneamente
   - Solução: Sequência atômica, validação rígida, Redis WATCH

2. **Integridade de Saldo**
   - Cliente pode tentar manipular saldo
   - Solução: Servidor é autoridade, ledger imutável, auditoria

3. **Escalabilidade com Muitos Jogadores**
   - Salas com 2-3 jogadores são simples; 6+ é complexo
   - Solução: Arquitetura modular, pronta para Redis Streams + worker pools

4. **Reconexão & Timeout**
   - Jogador desconecta, cartas devem ser foldeadas
   - Solução: Timeouts configuráveis, estado no Redis, recuperação automática

5. **Fraude em Campeonatos**
   - Conluio entre jogadores para transferir fichas
   - Solução: Análise de risco, limites de transferência, auditoria humana

---

## 11. Requisitos Adiados (Pós-MVP)

- ❌ Vídeo streaming para múltiplos espectadores
- ❌ Reconhecimento facial no avatar (apenas foto)
- ❌ Análise de mãos com IA
- ❌ Omaha Hi-Lo, 7-Card Stud, Razz (inicialmente)
- ❌ Transmissão ao vivo em redes sociais
- ❌ App para Smart TV ou Desktop (plataforma)
- ❌ Monetização com cartão crédito (apenas cosméticos depois)
- ❌ Integração com redes sociais para login (Google/Apple sim, Facebook depois)

---

## 12. Variáveis de Ambiente Obrigatórias

```bash
# App
POKER_CLUB_NAME=Poker Club
POKER_CLUB_LOGO_URL=https://...
POKER_VIRTUAL_CURRENCY_NAME=Fichas

# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/poker
REDIS_URL=redis://localhost:6379
JWT_SECRET=seu_secret_super_seguro
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Segurança
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15m
```

---

## 13. Próximos Passos

1. ✅ Você está aqui: Lendo arquitetura
2. → Criar estrutura de pastas (Fase 1)
3. → Configurar banco de dados
4. → Inicializar NestJS + Next.js
5. → Implementar autenticação
6. → Motor de poker (Fase 2)
7. → WebSocket (Fase 3)
8. → Testes & Deploy


# 🚀 Próximos Passos - Fase 2: Motor de Poker

**Objetivo:** Implementar engine de poker completo com Texas Hold'em funcional

---

## 1️⃣ Setup Inicial (30 min)

### Verifique Tudo

```bash
# Terminal 1: Infraestrutura
cd /c/Projetos/Poker
pnpm run docker:up

# Aguarde
sleep 15

# Verifique conexões
docker ps | grep poker
redis-cli ping  # Deve retornar PONG

# Terminal 2: Migrations
pnpm run migrate

# Terminal 3: Backend
cd packages/backend
pnpm run dev

# Deve imprimir:
# ✅ Conectado ao banco de dados PostgreSQL
# ✅ Conectado ao Redis
# 🎰 Poker Club Backend iniciado em http://localhost:3000
```

---

## 2️⃣ Criar Motor de Poker (Dia 1)

### Estrutura de Pastas

```
backend/src/games/poker/
├── deck.engine.ts          # Criar baralho, cartas
├── shuffle.engine.ts       # Embaralhar (Fisher-Yates)
├── dealer.engine.ts        # Distribuir cartas
├── hand.evaluator.ts       # Avaliar mãos (CRÍTICO)
├── hand.evaluator.spec.ts  # 100+ testes
├── turn.engine.ts          # Controlar turnos
├── betting.engine.ts       # Validar apostas
├── pot.engine.ts           # Calcular potes
├── sidepot.engine.ts       # Potes secundários
└── index.ts                # Exporta tudo
```

### 2.1 DeckEngine

```typescript
// backend/src/games/poker/deck.engine.ts

import { Card, Suit, Rank } from '@shared/types/poker';

export class DeckEngine {
  static createDeck(): Card[] {
    const suits = Object.values(Suit);
    const ranks = Object.values(Rank);
    
    const cards: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ suit, rank });
      }
    }
    return cards;
  }

  static cardToString(card: Card): string {
    return `${card.rank}${card.suit}`;
  }

  static stringToCard(str: string): Card {
    const rank = str.slice(0, -1) as Rank;
    const suit = str.slice(-1) as Suit;
    return { rank, suit };
  }
}
```

**Teste:**
```bash
pnpm run test -- deck.engine.spec.ts
```

### 2.2 HandEvaluator (Mais Crítico)

```typescript
// backend/src/games/poker/hand.evaluator.ts

export class HandEvaluator {
  /**
   * Avalia as 5 melhores cartas
   * Retorna rank e kickers para desempate
   */
  static evaluate(cards: Card[]): Hand {
    if (cards.length !== 5) {
      throw new Error('Deve ter exatamente 5 cartas');
    }

    if (this.isRoyalFlush(cards)) return { rank: HandRank.ROYAL_FLUSH, ... };
    if (this.isStraightFlush(cards)) return { rank: HandRank.STRAIGHT_FLUSH, ... };
    // ... etc

    return { rank: HandRank.HIGH_CARD, ... };
  }

  private static isRoyalFlush(cards: Card[]): boolean {
    // A-K-Q-J-10, all same suit
  }

  private static isStraightFlush(cards: Card[]): boolean {
    // 5 straight cards, all same suit
  }

  // ... mais funções privadas
}
```

**Teste Exaustivo:**
```typescript
// hand.evaluator.spec.ts

describe('HandEvaluator', () => {
  it('royal flush beats straight flush', () => {
    const royal = [AH, KH, QH, JH, TH];
    const straight = [9H, 8H, 7H, 6H, 5H];
    
    const result1 = HandEvaluator.evaluate(royal);
    const result2 = HandEvaluator.evaluate(straight);
    
    expect(result1.rank).toBe(HandRank.ROYAL_FLUSH);
    expect(result2.rank).toBe(HandRank.STRAIGHT_FLUSH);
    expect(result1.score).toBeGreaterThan(result2.score);
  });

  // 99+ mais testes...
});
```

---

## 3️⃣ Criar Turnos & Apostas (Dia 2)

### TurnEngine

```typescript
// backend/src/games/poker/turn.engine.ts

export class TurnEngine {
  static getNextPlayer(
    gameState: GameState,
    skipFolded: boolean = true,
  ): number {
    let next = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    if (skipFolded) {
      while (gameState.players[next].status === PlayerStatus.FOLDED) {
        next = (next + 1) % gameState.players.length;
      }
    }
    
    return next;
  }

  static getPlayersRemaining(gameState: GameState): GamePlayer[] {
    return gameState.players.filter(p => p.status !== PlayerStatus.FOLDED);
  }
}
```

### BettingEngine

```typescript
// backend/src/games/poker/betting.engine.ts

export class BettingEngine {
  /**
   * Valida uma ação antes de executar
   */
  static validateAction(
    gameState: GameState,
    playerId: string,
    action: PlayerAction,
    amountCents: number,
  ): { isValid: boolean; error?: string } {
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!player) return { isValid: false, error: 'Player not found' };
    if (gameState.currentPlayerIndex !== gameState.players.indexOf(player)) {
      return { isValid: false, error: 'Not your turn' };
    }

    if (action === PlayerAction.FOLD) return { isValid: true };
    if (action === PlayerAction.CHECK) {
      if (gameState.currentBetCents > 0) {
        return { isValid: false, error: 'Cannot check when bet is active' };
      }
      return { isValid: true };
    }

    if (action === PlayerAction.BET && amountCents < gameState.bb_cents) {
      return { isValid: false, error: 'Bet too small' };
    }

    if (amountCents > player.stackCents) {
      return { isValid: false, error: 'Insufficient stack' };
    }

    return { isValid: true };
  }
}
```

---

## 4️⃣ Criar PotEngine (Dia 3)

### PotEngine

```typescript
// backend/src/games/poker/pot.engine.ts

export class PotEngine {
  /**
   * Calcula todos os potes (main + side pots)
   * Essencial para all-in
   */
  static calculatePots(gameState: GameState): Pot[] {
    const pots: Pot[] = [];
    const stacks = gameState.players.map(p => p.stackCents);
    
    // Ordena stacks únicos
    const uniqueStacks = [...new Set(stacks)].sort((a, b) => a - b);
    
    let prevStack = 0;
    for (const stack of uniqueStacks) {
      const potAmount = (stack - prevStack) * gameState.players.length;
      pots.push({
        amount: potAmount,
        eligiblePlayers: gameState.players.filter(p => p.stackCents >= stack),
      });
      prevStack = stack;
    }
    
    return pots;
  }
}
```

---

## 5️⃣ Testes (Dia 4)

### Suite de Testes Essenciais

```bash
# Rode toda a suite
pnpm run test -- poker

# Com cobertura
pnpm run test:cov -- poker

# Watch mode
pnpm run test:watch -- poker
```

**Casos que DEVEM passar:**

```typescript
✓ DeckEngine.createDeck() retorna 52 cartas
✓ DeckEngine.createDeck() sem duplicatas
✓ HandEvaluator: Royal Flush > Straight Flush
✓ HandEvaluator: Four of a Kind > Full House
✓ HandEvaluator: Kicker resolve tie (Pair vs Pair)
✓ HandEvaluator: 1326 combos de TH avaliados corretamente
✓ Shuffle é aleatório (chi-square test)
✓ BettingEngine: Rejeita ação fora de turno
✓ BettingEngine: Rejeita bet menor que BB
✓ BettingEngine: All-in válido
✓ PotEngine: All-in com 2 jogadores
✓ PotEngine: All-in com 3 jogadores (side pots)
✓ TurnEngine: Next player correto
```

---

## 6️⃣ Integração com NestJS (Dia 5)

### PokerService

```typescript
// backend/src/games/poker/poker.service.ts

@Injectable()
export class PokerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cria nova mão
   */
  async startHand(gameId: string, handNumber: number): Promise<GameHand> {
    const deck = DeckEngine.createDeck();
    const shuffled = ShuffleEngine.shuffle(deck);
    
    const hand = await this.prisma.gameHand.create({
      data: {
        gameId,
        handNumber,
        deck: JSON.stringify(shuffled),
        status: 'in_progress',
        // ...
      },
    });
    
    return hand;
  }

  /**
   * Processa ação do jogador
   */
  async processAction(
    gameId: string,
    handId: string,
    playerId: string,
    action: PlayerAction,
    amountCents: number,
  ): Promise<GameAction> {
    // 1. Valida (BettingEngine)
    // 2. Atualiza estado (Redis)
    // 3. Calcula potes (PotEngine)
    // 4. Verifica showdown
    // 5. Gera eventos (WebSocket)
    
    const gameAction = await this.prisma.gameAction.create({
      data: { handId, playerId, action, amountCents, ... },
    });
    
    return gameAction;
  }

  /**
   * Completa mão
   */
  async completeHand(gameId: string, handId: string): Promise<GameResult> {
    // 1. Avalia mãos (HandEvaluator)
    // 2. Determina vencedor
    // 3. Atualiza saldos
    // 4. Registra resultado
    // 5. Prepara próxima mão
  }
}
```

### Exportar do Module

```typescript
// backend/src/games/poker/poker.module.ts

@Module({
  imports: [DatabaseModule],
  providers: [
    PokerService,
    DeckEngine,
    ShuffleEngine,
    HandEvaluator,
    TurnEngine,
    BettingEngine,
    PotEngine,
  ],
  exports: [PokerService],
})
export class PokerModule {}

// backend/src/games/games.module.ts

@Module({
  imports: [DatabaseModule, RedisModule, PokerModule],
})
export class GamesModule {}
```

---

## ✅ Checklist Fase 2

- [ ] DeckEngine com testes
- [ ] ShuffleEngine com distribuição uniforme
- [ ] HandEvaluator com 100+ testes
- [ ] TurnEngine com lógica de turnos
- [ ] BettingEngine com validação rígida
- [ ] PotEngine com side pots
- [ ] PokerService integrada
- [ ] Suite de testes passa 100%
- [ ] Cobertura > 80%
- [ ] README da Fase 2 atualizado

---

## 🎓 Comandos Úteis

```bash
# Verificar tipos
pnpm -r run type-check

# Lint
pnpm run lint

# Format
pnpm run format

# Testes com watch
pnpm run test:watch -- poker

# Coverage
pnpm run test:cov -- poker

# Build
pnpm run build
```

---

## 🔍 Debugging

```bash
# Logs do backend
tail -f packages/backend/logs/app.log

# Debugar em VS Code
# Adicione em launch.json:
{
  "type": "node",
  "request": "attach",
  "name": "Attach NestJS",
  "port": 9229,
  "skipFiles": ["<node_internals>/**"]
}

# Inicie backend com debug
node --inspect-brk dist/main.js
```

---

## 🎉 Próximo Milestone

Uma vez que **Fase 2** estiver completa:
- Motor de poker funcional ✅
- Testes exaustivos ✅
- Código limpo e documentado ✅

**Fase 3** será criar WebSocket e multiplayer real!

---

**Bora começar! 🚀**


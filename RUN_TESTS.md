# 🧪 Como Rodar os Testes - Fase 2

## Setup Rápido

### 1. Instale Dependências

```bash
cd /c/Projetos/Poker
pnpm install
```

### 2. Rode os Testes do Motor de Poker

```bash
cd packages/backend
pnpm run test -- poker
```

**Esperado:** ✅ 40+ testes passando

---

## Testes Específicos

### Test Hand Evaluator (CRÍTICO)

```bash
pnpm run test -- hand.evaluator.spec.ts
```

**Casos cobertos:**
- ✅ Royal Flush bate Straight Flush
- ✅ Four of a Kind bate Full House
- ✅ Pair of Aces > Pair of Kings
- ✅ Kicker resolve desempate
- ✅ Wheel straight (A-2-3-4-5)
- ✅ Empate detectado
- ✅ Ordem de cartas não importa
- ✅ 30+ casos mais

### Test Deck Engine

```bash
pnpm run test -- deck.engine.spec.ts
```

**Casos cobertos:**
- ✅ 52 cartas criadas
- ✅ 13 de cada naipe
- ✅ Sem duplicatas
- ✅ Conversão Card ↔ String
- ✅ Serialização JSON

---

## Testes com Cobertura

```bash
cd packages/backend
pnpm run test:cov -- poker
```

**Verifica:**
- Statements: 85%+
- Branches: 80%+
- Functions: 90%+
- Lines: 85%+

---

## Watch Mode (Desenvolvimento)

```bash
cd packages/backend
pnpm run test:watch -- poker
```

Rodará testes continuamente conforme você modifica código.

---

## Test Individual

### Exemplo: Testar apenas mão específica

Crie arquivo `test.ts` no projeto:

```typescript
import { HandEvaluator, DeckEngine } from './src/games/poker';
import { Rank, Suit } from '@shared/types/poker';

const card = (rank: Rank, suit: Suit) => ({ rank, suit });

// Teste: Royal Flush
const royal = [
  card(Rank.ACE, Suit.HEARTS),
  card(Rank.KING, Suit.HEARTS),
  card(Rank.QUEEN, Suit.HEARTS),
  card(Rank.JACK, Suit.HEARTS),
  card(Rank.TEN, Suit.HEARTS),
];

const hand = HandEvaluator.evaluate(royal);
console.log('Hand:', hand.rankName); // "Royal Flush"
```

Rode:
```bash
npx ts-node test.ts
```

---

## Debugging

### VS Code Debug

Adicione em `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage", "poker"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Pressione F5 para debugar.

### Logs Durante Testes

```bash
# Com output de console
pnpm run test -- poker --verbose

# Só um arquivo
pnpm run test -- hand.evaluator.spec.ts --verbose
```

---

## Validar Aleatoriedade (Shuffle)

```typescript
import { ShuffleEngine, DeckEngine } from './src/games/poker';

// Embaralha 1000x e verifica distribuição
const freq = {};
for (let i = 0; i < 1000; i++) {
  const deck = DeckEngine.createStandardDeck();
  const shuffled = ShuffleEngine.shuffle(deck);
  
  const firstCard = DeckEngine.cardToString(shuffled[0]);
  freq[firstCard] = (freq[firstCard] || 0) + 1;
}

// Cada carta deve aparecer ~19 vezes (1000/52)
console.log(freq);
```

---

## Checklist de Validação

- [ ] 40+ testes passando
- [ ] Cobertura > 80%
- [ ] Nenhum erro TypeScript
- [ ] ESLint passa
- [ ] Hand Evaluator detecta todas as mãos
- [ ] Kickers resolvem desempates
- [ ] Side pots funcionam
- [ ] Shuffle é uniforme
- [ ] All-in funciona

---

## Resultados Esperados

```
PASS  hand.evaluator.spec.ts
  ✓ reconhece Royal Flush
  ✓ reconhece Straight Flush
  ✓ Royal Flush bate Straight Flush
  ✓ detecta empate
  ✓ desempate com kicker
  ... (30+ mais testes)

PASS  deck.engine.spec.ts
  ✓ cria baralho com 52 cartas
  ✓ contém 13 de cada naipe
  ✓ não tem duplicatas
  ✓ converte Card ↔ String
  ✓ serializa e desserializa
  ... (10+ mais testes)

Test Suites: 2 passed, 2 total
Tests:       40 passed, 40 total
Time:        2.5s
```

---

## Troubleshooting

### Erro: "Cannot find module '@shared/types/poker'"

```bash
cd /c/Projetos/Poker
pnpm install
```

### Erro: "Jest is not recognized"

```bash
cd packages/backend
npx jest --version  # Deve funcionar
```

### Testes lentos

```bash
# Rode só um arquivo
pnpm run test -- hand.evaluator.spec.ts

# Sem coverage
pnpm run test -- poker --no-coverage
```

---

## CI/CD (GitHub Actions)

Arquivo pronto para adicionar em `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm -r run test
```

---

**Pronto! Todos os testes rodando.** 🚀

Last Updated: 2025-07-21

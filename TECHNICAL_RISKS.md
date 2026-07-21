# ⚠️ Riscos Técnicos Identificados - Poker Club

## 1. 🔴 CRÍTICO: Concorrência & Duplicação de Ações

### Risco
```
Alice e Bob ambos fazem "bet 100" no mesmo tempo
Servidor recebe dois eventos quase simultâneos
Pote calcula +200 ao invés de +100 (duplicação)
```

### Impacto
- Saldos incorretos
- Partidas invalidadas
- Confiança quebrada

### Mitigação
- [ ] Redis WATCH/MULTI transações
- [ ] Sequência atômica (_sequence_) por mão
- [ ] Validação de timestamp (ação fora da janela = rejeita)
- [ ] Idempotência: ação com ID único, 2ª tentativa = noop
- [ ] Lock no Redis por 100ms durante processamento

### Teste
```typescript
test('concurrent bets from two players', async () => {
  const bet1 = await player1.bet(100);
  const bet2 = await player2.bet(100);
  // Ambos devem processar, não duplicar
  expect(pot).toBe(200);
});
```

---

## 2. 🔴 CRÍTICO: Integridade de Saldo

### Risco
```
Cliente manipula POST /api/games/:id/result
Envia: { winner: "alice", prize: 100000 }
Saldo de Alice pula de R$ 100 para R$ 100.100
```

### Impacto
- Econômia de fichas quebrada
- Fraude massiva
- Impossível manter integridade

### Mitigação
- [ ] **Servidor é autoridade absoluta**
  - Resultado calculado APENAS no servidor
  - Cliente não envia resultado
- [ ] Validação rigorosa de saldo
  - Before = 100, Cacife = 25, After = 62,50 ✓
  - If After > Before + Cacife → ERRO
- [ ] Transação atômica no banco
  ```typescript
  await db.$transaction(async (tx) => {
    const hand = await tx.gameHand.findUnique(...);
    if (!hand) throw 'Hand not found'; // Rejeita
    
    await tx.virtualWallet.update(...); // Uma única operação
    await tx.walletTransaction.create(...);
  });
  ```
- [ ] Auditoria de cada alteração de saldo
- [ ] Rate limiting: máx 100 partidas/hora por usuário

### Teste
```typescript
test('cannot manually set winner via API', async () => {
  const response = await fetch('/api/games/123/result', {
    method: 'POST',
    body: JSON.stringify({ winner: 'alice' })
  });
  // Servidor ignora, calcula resultado correto
  expect(response.status).toBe(400); // ou ignora
});
```

---

## 3. 🟠 ALTO: Reconexão & State Inconsistency

### Risco
```
Alice aposta 50
Alice desconecta (envia "fold" no caminho)
Bob não sabe se Alice foldeou ou ainda está in
Estado no servidor: folded
Estado no Redis: active
Cliente de Alice: desconectado
```

### Impacto
- Confusão em quem está in/out
- Pote calculado errado
- Mão impossível de completar

### Mitigação
- [ ] Redis como source-of-truth durante mão
- [ ] Timeout com action padrão:
  - Se não agir em 30s → check ou fold automaticamente
- [ ] Reconexão restaura estado exato:
  ```typescript
  async handleReconnect(userId, gameId) {
    const state = await redis.get(`game:${gameId}`);
    const hand = state.hands[state.currentHand];
    
    // Envia estado completo ao cliente (sem cartas adversários)
    socket.emit('game_state', {
      myCards: hand.playerCards[userId],
      communityCards: hand.community,
      pots: hand.pots,
      currentPlayer: hand.currentPlayer,
      actions: hand.actions // histórico
    });
  }
  ```
- [ ] Validar que jogador age no mesmo turno
- [ ] Timeout = fold para jogadores offline

### Teste
```typescript
test('reconnect restores game state correctly', async () => {
  const game = await createGame();
  await player1.bet(50);
  
  socket1.disconnect();
  await delay(500);
  
  socket1.reconnect();
  const state = await socket1.getGameState();
  
  expect(state.currentPlayer).toBe(player2.id);
  expect(state.bets[player1.id]).toBe(50);
});
```

---

## 4. 🟠 ALTO: Colusão Entre Jogadores

### Risco
```
Alice e Bob combinam fora do app:
- Nas 5 primeiras mãos, ambos foldeiam
- Transferem fichas para Charlie via "presentes" fictícios
- Repetem 100 vezes: acumulam R$ 10.000 no "Charlie"
```

### Impacto
- Economia inflacionada
- Bônus iniciais explorados
- Admin não consegue rastrear

### Mitigação
- [ ] Análise de risco automática:
  ```typescript
  async detectCoalition(gameId) {
    const game = await getGame(gameId);
    if (game.duration < 5_min && game.folds > 80%) {
      return { risk: 'HIGH', reason: 'Unusual fold rate' };
    }
    
    // Detecta padrão: sempre foldeiam, depois transferem
    const transfers = await getTransfersAfterGame(gameId);
    if (transfers.total > cacife * 2) {
      return { risk: 'HIGH', reason: 'Unusual transfer volume' };
    }
  }
  ```
- [ ] Limites de presente:
  - Máx R$ 500,00 virtual por dia
  - Máx R$ 100,00 por transação
- [ ] Flag transfers entre jogadores que frequentemente perdem juntos
- [ ] Admin revisa transferências suspeitas
- [ ] Histórico imutável para auditoria

### Teste
```typescript
test('detect coalition pattern', async () => {
  // Simula: Alice e Bob foldeiam 10 mãos seguidas
  // Depois Alice transfere R$ 50 para Bob
  
  const risk = await detectCoalition(gameId);
  expect(risk.risk).toBe('HIGH');
  expect(alertAdmin).toBeCalled();
});
```

---

## 5. 🟠 ALTO: Performance com Múltiplas Partidas

### Risco
```
100 mesas ativas simultaneamente
Cada mesa emite evento a cada 2 segundos
500 eventos/segundo no WebSocket
Servidor sobrecarregado
Eventos atrasam
Reconexão em cascata
```

### Impacto
- Timeout massivo
- Reconexões falham
- Economia de fichas explode

### Mitigação
- [ ] Arquitetura escalável desde o início:
  - Rooms isoladas no Redis (não broadcast global)
  - Event batching (agrupar eventos a cada 100ms)
  - Worker pools para processamento
- [ ] Testes de carga:
  ```typescript
  test('100 concurrent games', async () => {
    const games = await Promise.all(
      Array(100).fill(0).map(() => createGame())
    );
    await driveGamesTillCompletion(games);
    // Verificar: latência < 500ms, sem timeout
  });
  ```
- [ ] Monitoramento:
  - Métrica: eventos/segundo
  - Métrica: latência média
  - Alert se > threshold

### Teste
- Rodar 10 mesas localmente, medir latência

---

## 6. 🟠 ALTO: Avaliação de Mãos (Hand Evaluator)

### Risco
```
Servidor calcula: Alice tem Pair of Aces
Servidor calcula: Bob tem High Card King
Alice vence
Mas na verdade: Alice tem High Card Queen (erro na lógica)
Resultado totalmente errado
```

### Impacto
- Resultado injusto
- Fraude aparente
- Confiança quebrada

### Mitigação
- [ ] **Testes exaustivos** do Hand Evaluator:
  - Todos os 1.326 combos de Texas Hold'em
  - Tie-break com kickers
  - Uso do 5º melhor card (não 3ª carta)
- [ ] Código bem documentado e revisado
- [ ] Validação cruzada com algoritmo independente
  ```typescript
  test('hand evaluator - all royal flushes', () => {
    const hands = generateAllRoyalFlushes();
    hands.forEach(hand => {
      expect(evaluate(hand)).toEqual('Royal Flush');
    });
  });
  ```
- [ ] Replay: recalcular resultado históricamente

### Teste
- Suite com 100+ testes de avaliação
- Comparar resultados com poker libs conhecidas (Pokersolver)

---

## 7. 🟡 MÉDIO: Viés de Embaralhamento

### Risco
```
Shuffle não é 100% aleatório
Com 1.000 mãos, Jack aparece 15% mais que outros naipes
Jogadores percebem padrão
Desconfiança
```

### Impacto
- Desconfiança dos jogadores
- Reputação prejudicada

### Mitigação
- [ ] Fisher-Yates com `crypto.getRandomValues()`
  ```typescript
  function shuffle(deck: Card[]): Card[] {
    const bytes = crypto.getRandomValues(new Uint8Array(deck.length));
    
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor((bytes[i] % (i + 1)));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  ```
- [ ] Teste chi-square: verificar distribuição após 10k shuffles
  ```typescript
  test('shuffle distribution is uniform', () => {
    const counts = {};
    for (let i = 0; i < 10000; i++) {
      const deck = shuffle(newDeck());
      counts[deck[0]] = (counts[deck[0]] || 0) + 1;
    }
    // Verificar que cada carta aparece ~192 vezes em posição 0
    Object.values(counts).forEach(count => {
      expect(count).toBeCloseTo(192, -1); // ±10%
    });
  });
  ```

---

## 8. 🟡 MÉDIO: Ataque DDoS no WebSocket

### Risco
```
Cliente malicioso emite 1.000 eventos/segundo
Servidor processador tudo
Usuários legítimos sofrem lag
```

### Impacto
- Aplicativo inutilizável
- Justiça impossível

### Mitigação
- [ ] Rate limiting por usuário:
  ```typescript
  const limiter = new RateLimiter({
    max: 20,        // 20 eventos
    window: 1000    // por segundo
  });
  
  socket.on('player_action', (action) => {
    if (!limiter.tryConsume(socket.userId)) {
      socket.emit('error', 'Rate limit exceeded');
      return;
    }
    // processar
  });
  ```
- [ ] Validação de payload (rejeita > 1KB)
- [ ] Timeout automático se comportamento suspeito
- [ ] Logging de tentativas suspeitas

---

## 9. 🟡 MÉDIO: Vazamento de Cartas Privadas

### Risk
```
Dev acessa database production
SELECT * FROM game_hands WHERE id = 'hand_123'
Vê todas as cartas de todos os jogadores
Passam para jogador específico
```

### Impacto
- Fraude massiva
- Confiança quebrada

### Mitigação
- [ ] **Nunca armazenar cartas privadas inteiras**
  - Armazenar: hash da carta privada (SHA256)
  - Reconstruir durante replay apenas com permissão do vencedor
- [ ] Acesso ao DB limitado:
  - Aplicação tem READ only para tables de cards
  - Backup criptografado
  - Logs de acesso ao DB
- [ ] Monitoramento:
  - Alertar se dev tenta SELECT game_hands.private_cards
  - Monitorar conexões ao DB

---

## 10. 🟡 MÉDIO: Saldo Negativo

### Risco
```
Alice tem R$ 50,00
Cria partida com buy-in R$ 60,00
Sistema permite (erro de validação)
Alice termina com -R$ 10,00
```

### Impacto
- Economia quebrada
- Bônus duplicados para "recuperar"

### Mitigação
- [ ] Validação antes de criar partida:
  ```typescript
  async createGame(userId, buyIn) {
    const wallet = await getWallet(userId);
    
    if (wallet.balance < buyIn) {
      throw Error('Insufficient balance');
    }
    
    // Apenas DEPOIS: criar partida
  }
  ```
- [ ] Transação atômica (Prisma $transaction)
- [ ] Rejeitar saque se saldo < 0 (constraint na DB)
- [ ] Teste: tentar 100x criar partida com saldo baixo

---

## 11. 🟢 BAIXO: Prototipação Rápida Quebra Depois

### Risk
```
MVP com mock de banco
Depois conecta ao DB real
Descobrem que estrutura não escala
Refatorar tudo
```

### Impacto
- Perda de tempo
- Desmotivação

### Mitigação
- [ ] **Real DB desde o começo**
  - Docker Compose com Postgres
  - Migrations com Prisma
- [ ] Testes com DB real (não mocks)
- [ ] Arquitetura modular preparada para crescimento

---

## 12. 🟢 BAIXO: Sem Logs Suficientes

### Risk
```
Jogador reclama: "Perdi R$ 100, não recebi bônus"
Admin não consegue rastrear
Sem logs, sem prova
```

### Impacto
- Impossível resolver disputas
- Confiança quebrada

### Mitigação
- [ ] Log estruturado (JSON):
  ```json
  {
    "timestamp": "2025-07-21T10:30:15Z",
    "event": "balance_updated",
    "userId": "user_123",
    "before": 10000,
    "after": 12500,
    "reason": "game_result",
    "gameId": "game_abc"
  }
  ```
- [ ] Todas as transações logadas
- [ ] Arquivo de log rotativo
- [ ] Query rápida: `SELECT * FROM logs WHERE userId = ? ORDER BY timestamp DESC LIMIT 100`

---

## Matriz de Risco

| ID | Categoria | Severidade | Probabilidade | Score | Status |
|----|-----------|-----------|--------------|-------|--------|
| 1  | Concorrência | CRÍTICO | ALTO | 🔴 | Mitigado |
| 2  | Saldo | CRÍTICO | MÉDIO | 🔴 | Mitigado |
| 3  | Reconexão | ALTO | MÉDIO | 🟠 | Mitigado |
| 4  | Colusão | ALTO | BAIXO | 🟠 | Detectável |
| 5  | Performance | ALTO | MÉDIO | 🟠 | Monitorado |
| 6  | Hand Evaluator | ALTO | BAIXO | 🟠 | Testado |
| 7  | Embaralhamento | MÉDIO | BAIXO | 🟡 | Validado |
| 8  | DDoS | MÉDIO | BAIXO | 🟡 | Rate Limited |
| 9  | Vazamento Cards | MÉDIO | MUITO BAIXO | 🟡 | Criptografado |
| 10 | Saldo Negativo | MÉDIO | BAIXO | 🟡 | Validado |
| 11 | Prototipagem | BAIXO | MÉDIO | 🟢 | Planejado |
| 12 | Logs | BAIXO | ALTO | 🟢 | Planejado |

---

## ✅ Checklist de Mitigação Implementada

- [ ] Fase 1: Fundação
  - [ ] Transações atômicas (Prisma)
  - [ ] Rate limiting
  - [ ] Logs estruturados

- [ ] Fase 2: Motor
  - [ ] Hand Evaluator com 100+ testes
  - [ ] Shuffle com crypto randomness
  - [ ] Sequência atômica por mão

- [ ] Fase 3: Multiplayer
  - [ ] Redis WATCH/MULTI
  - [ ] Reconexão com state restore
  - [ ] Timeout com action padrão

- [ ] Fase 4: Carteira
  - [ ] Validação rigorosa de saldo
  - [ ] Ledger imutável
  - [ ] Auditoria

- [ ] Contínuo
  - [ ] Monitoramento de performance
  - [ ] Detecção de anomalias
  - [ ] Backups criptografados


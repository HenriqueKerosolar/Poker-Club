# 🎯 MVP Checklist - Poker Club

## MVP Obrigatório (Versão 0.1.0)

O MVP mínimo viável deve possuir **TODAS** estas funcionalidades operacionais:

---

## ✅ Autenticação & Perfil

- [ ] Cadastro com email + senha
- [ ] Login
- [ ] Perfil com nome público e username
- [ ] Avatar: pronto ou upload de foto
- [ ] Logout seguro
- [ ] JWT com refresh token

---

## ✅ Texas Hold'em 1v1 + 2v1

- [ ] Baralho correto (52 cartas)
- [ ] Embaralhamento seguro (Fisher-Yates)
- [ ] Distribuição inicial (2 cartas fechadas)
- [ ] Blinds (small, big)
- [ ] Turnos: Pré-flop, Flop, Turn, River
- [ ] Ações: Check, Call, Bet, Raise, Fold, All-in
- [ ] Pote principal
- [ ] Side pots (all-in)
- [ ] Showdown (avaliação de mãos)
- [ ] Desempate (kicker)
- [ ] Resultado correto
- [ ] Próxima mão dentro da mesa
- [ ] Limite de mãos ou encerramento manual

**Testes Obrigatórios:**
- [ ] Royal Flush > Straight Flush > Four of a Kind
- [ ] Kicker resolve empate
- [ ] All-in com 3 jogadores gera side pots corretos
- [ ] Fold correto remove jogador da mão
- [ ] Check-call funciona

---

## ✅ Partida Multiplayer Online

### Criação de Mesa
- [ ] Jogador (Alice) cria mesa
- [ ] Define: modalidade, buy-in, blinds, cenário, música
- [ ] Recebe código de convite
- [ ] Mesa fica em estado WAITING

### Convite & Entrada
- [ ] Bob entra com código
- [ ] Ambos veem um ao outro na sala de espera
- [ ] Avatar, nome, status de conexão visíveis
- [ ] Botão "Pronto" para confirmar

### Início da Partida
- [ ] Alice e Bob confirmam pronto
- [ ] Status → STARTING
- [ ] 3 segundo countdown
- [ ] Partida inicia automaticamente

### Durante a Partida
- [ ] **Servidor controla tudo** (Alice não vê cartas de Bob)
- [ ] **Sem duplicação de ações** (mesma ação só vale 1x)
- [ ] Turnos funcionam (alternância correta)
- [ ] Cartas privadas permanecem privadas
- [ ] Pote atualiza em tempo real
- [ ] Chat funciona

### Reconexão
- [ ] Se Alice desconectar, vaga reservada por 30s
- [ ] Ao reconectar, estado restaurado
- [ ] Se não voltar em 30s, fold automático
- [ ] Nenhuma ação duplicada

### Encerramento
- [ ] Última mão termina
- [ ] Resultado exibido
- [ ] Saldos atualizados
- [ ] Histórico registrado

---

## ✅ Saldo Virtual & Carteira

### Saldo Inicial
- [ ] Novo usuário recebe R$ 100,00 virtuais
- [ ] Equivalente a 10.000 fichas (1:100)
- [ ] Registrado como "Crédito Inicial"
- [ ] Não pode ser duplicado (usuário recebe apenas 1x)

### Escolha de Cacife
- [ ] Antes de entrar na mesa, escolhe quanto levar
- [ ] Saldo disponível exibido
- [ ] Valor mínimo: R$ 1,00
- [ ] Valor máximo: saldo disponível
- [ ] Fichas convertidas automaticamente (exibição)

### Resultado da Partida
- [ ] Cacife inicial: R$ 25,00
- [ ] Saldo final: R$ 62,50
- [ ] Resultado: +R$ 37,50 ✓
- [ ] Atualiza saldo principal imediatamente

### Extrato Imutável
- [ ] Cada transação cria entry no ledger
- [ ] Mostra: data, tipo, valor, saldo antes/depois
- [ ] Não pode ser editado/deletado
- [ ] Formato: [Data] [Tipo] [Descrição] [Valor] | Saldo: R$ X,XX

**Exemplo:**
```
2025-07-21 10:30:15 | Crédito Inicial | R$ 100,00 | Saldo: R$ 100,00
2025-07-21 10:35:42 | Entrada Partida | -R$ 25,00 | Saldo: R$ 75,00
2025-07-21 10:45:20 | Resultado Partida | +R$ 37,50 | Saldo: R$ 112,50
```

### Estoque de Fichas
- [ ] Área "Meu Estoque" mostra saldo guardado
- [ ] Botão "Guardar" move fichas
- [ ] Botão "Retirar" move do estoque
- [ ] Saldo total = Disponível + Estoque

---

## ✅ Bônus de Recuperação (24h)

- [ ] Se saldo = 0 após 24h sem bônus anterior:
  - [ ] Recebe R$ 100,00 virtuais
  - [ ] Registra "Saldo Recuperação"
  - [ ] Countdown até próximo bônus: "Disponível em 23h 45min"
- [ ] Não acumula (múltiplas perdas = 1 bônus, não múltiplos)
- [ ] Não aumenta por inatividade (5 dias sem jogar = ainda R$ 100)

---

## ✅ Chat de Texto

- [ ] Caixa de mensagens durante partida
- [ ] Enviar mensagem com Enter
- [ ] Limite de caracteres: 200
- [ ] Histórico visível (últimas 50)
- [ ] Emotes/reações básicas (👍 😂 🎉)
- [ ] Silenciar jogador (não vejo mensagens)

---

## ✅ Áudio (WebRTC)

- [ ] Botão Ligar/Desligar Microfone
- [ ] Indicador de quem está falando
- [ ] Volume individual ajustável
- [ ] Sem áudio = partida continua
- [ ] Modo "Apenas Amigos" (admin pode ativar)
- [ ] Denúncia de áudio abusivo

**Teste Mínimo:**
- [ ] 2 navegadores em mesma sala
- [ ] Áudio unidirecional funciona
- [ ] Echo cancellation (não eco próprio)
- [ ] Reconexão automática

---

## ✅ Assistente de Mesa (Iniciante)

- [ ] Botão ativar/desativar durante partida
- [ ] Mostra: combinações possíveis na mão
- [ ] Mostra: tabela de força de mãos (ex: pair < two pair < trips)
- [ ] Mostra: opções disponíveis (check, call, bet, fold)
- [ ] **NÃO** vê cartas adversários
- [ ] **NÃO** sugere ação automática
- [ ] Adversários veem: "Este jogador está em modo aprendizagem"

---

## ✅ Cenários & Música

### Cenários (MVP: apenas 1-2)
1. Cassino Clássico
   - [ ] Imagem de fundo animada (loop)
   - [ ] Mesa textured (feltro)
   - [ ] Lighting adequado

### Música Ambiente
- [ ] 1 trilha incluída (royalty-free)
- [ ] Botão silenciar/dessilenciar
- [ ] Volume slider (0-100%)
- [ ] Loop contínuo

### Performance
- [ ] Modo economia: fundo estático, sem animação

---

## ✅ Campeonato Simples

- [ ] Criador define:
  - [ ] Nome
  - [ ] Modalidade (Texas Hold'em)
  - [ ] Número de partidas (ex: 3)
  - [ ] Buy-in (R$ 10,00)
  - [ ] Formato: "Melhor de 3"

- [ ] Participante entra:
  - [ ] Vê lista de mesas
  - [ ] Paga buy-in automaticamente
  - [ ] Aguarda próxima mão

- [ ] Resultado:
  - [ ] Pontos por vitória (1º = 3pts, 2º = 1pt)
  - [ ] Ranking ao final
  - [ ] 1º lugar ganha 70%, 2º = 30%

---

## ✅ Troféu & Galeria

### Troféu Automático
- [ ] Campeão de campeonato recebe troféu
- [ ] Material: Bronze (MVP)
- [ ] Mostra: nome, data, participantes

### Galeria de Troféus
- [ ] Tela "Minha Galeria"
- [ ] Lista troféus em grid
- [ ] Click → Detalhes (data, como conquistou)
- [ ] Contador total

---

## ✅ Painel Administrativo Web

### Dados Visíveis
- [ ] Total de usuários
- [ ] Mesas ativas
- [ ] Partidas em progresso
- [ ] Últimas transações
- [ ] Denúncias abertas

### Ações Básicas
- [ ] Suspender usuário
- [ ] Ver avatar (moderar se necessário)
- [ ] Bloquear chat de jogador
- [ ] Ver extrato de saldo
- [ ] Fazer estorno virtual (com motivo)

### Auditoria
- [ ] Cada ação registra: quem, quando, o quê
- [ ] Log imutável (append-only)

---

## ✅ Logs & Segurança

- [ ] Log de login (sucesso/falha)
- [ ] Log de ações em mesa (bet, fold, etc)
- [ ] Log de transações (crédito, débito)
- [ ] Log de erros (stack trace, usuário, timestamp)
- [ ] Log de acesso admin
- [ ] Sem logs de cartas privadas em analytics externos

---

## ✅ Testes Essenciais

### Unit Tests (Motor de Poker)
- [ ] `test_royal_flush_beats_straight_flush.ts`
- [ ] `test_kicker_wins_pair_tie.ts`
- [ ] `test_three_player_sidepot.ts`
- [ ] `test_fold_removes_player.ts`
- [ ] `test_allin_creates_side_pot.ts`

### Integração (WebSocket + DB)
- [ ] Criar mesa → salva no DB ✓
- [ ] Join mesa → Redis atualiza presença ✓
- [ ] Bet → valida servidor ✓
- [ ] Disconnect → fold automático ✓
- [ ] Reconectar → estado restaurado ✓

### E2E (Fluxo Completo)
- [ ] Alice e Bob se cadastram
- [ ] Alice cria mesa, Bob entra
- [ ] 3 mãos de poker completas
- [ ] Resultado correto
- [ ] Saldo atualizado
- [ ] Histórico registrado

---

## ✅ Critérios de Aceitação do MVP

O MVP é aprovado quando **TODOS** estes testes passam:

### 1. Segurança Básica
- [ ] Não posso ver cartas do adversário via console
- [ ] Não posso enviar `{cartas: [AK]}` para o servidor
- [ ] Não posso modificar meu saldo direto
- [ ] Servidor rejeita ações fora de turno

### 2. Integridade de Dados
- [ ] Três partidas, três resultados diferentes = três potes distintos
- [ ] Saldo nunca fica negativo
- [ ] Crédito inicial nunca duplica (mesmo usuário, múltiplas contas testadas)
- [ ] Bônus 24h não acumula (aguarda 24h real)

### 3. Multiplicidade
- [ ] Alice e Bob podem estar em salas diferentes simultaneamente
- [ ] Duas partidas ocorrem sem interferência
- [ ] Chat não mistura mensagens entre mesas

### 4. Jogo Funcional
- [ ] Royal Flush bate Straight Flush (avaliação correta)
- [ ] All-in com 3 jogadores calcula side pots corretos
- [ ] Fold remove jogador, pote vai para vencedor
- [ ] Check-call funciona (não vira bet)
- [ ] Empatadas com kicker correto

### 5. Reconexão
- [ ] Desconectar durante bet → folda automaticamente após 30s
- [ ] Reconectar antes de timeout → continua partida
- [ ] Cartas privadas restauradas corretamente

### 6. Multiplayer
- [ ] 2 jogadores: 1v1 funciona
- [ ] 3 jogadores: posições corretas
- [ ] Servidor controla ordem de turnos

### 7. Carteira
- [ ] Novo = R$ 100,00 ✓
- [ ] Partida com ganho +R$ 37,50 ✓
- [ ] Extrato mostra sequência de transações
- [ ] Estoque guarda fichas
- [ ] Bônus 24h aparece após timeout

### 8. Campeonato
- [ ] 3 participantes, 3 mãos
- [ ] Ranking correto ao final
- [ ] Campeão recebe troféu

### 9. Logs & Admin
- [ ] Evento de login no log
- [ ] Ação de bet no log
- [ ] Estorno cria auditoria
- [ ] Admin vê tudo

---

## 📊 Estimativa de Tempo (Fase 1-3)

| Etapa | Tempo Estimado |
|-------|----------------|
| Infraestrutura (DB, Docker, Auth) | 2-3 dias |
| Motor de Poker + Tests | 3-4 dias |
| WebSocket + Estado | 2-3 dias |
| Frontend (telas essenciais) | 3-4 dias |
| Carteira virtual | 2 dias |
| Integração e Bugs | 2-3 dias |
| **Total MVP** | **14-20 dias** |

---

## 🚀 Definição de "Pronto para Usar"

MVP está pronto quando:

1. ✅ Código testado (unit + integração)
2. ✅ Banco funcionando (Postgres)
3. ✅ WebSocket estável
4. ✅ 2 clientes podem jogar 1v1 ou 1v1v1
5. ✅ Saldo virtual correto após partida
6. ✅ Sem crashes ou erros não capturados
7. ✅ README com instruções de setup
8. ✅ Docker Compose funciona (`docker-compose up`)
9. ✅ Admin pode ver logs e estornar
10. ✅ Documentação das APIs

---

## 📝 Pendências Pós-MVP (Fase 4+)

- Omaha, Five-Card Draw, Short Deck
- Mais cenários (15 no total)
- Galeria 3D
- Transmissão para espectadores
- Integração Google/Apple OAuth
- Monetização cosmética (avatares premium)


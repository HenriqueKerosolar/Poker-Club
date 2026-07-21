import {
  Card,
  GameState,
  GameStatus,
  PlayerStatus,
  PlayerAction,
  Hand,
} from '@shared/types/poker';
import { DeckEngine } from './engine/deck.engine';
import { ShuffleEngine } from './engine/shuffle.engine';
import { HandEvaluator } from './evaluator/hand.evaluator';
import { TurnEngine } from './engine/turn.engine';
import { BettingEngine } from './engine/betting.engine';
import { PotEngine } from './engine/pot.engine';

/**
 * PokerEngine - Orquestra a lógica completa de uma partida
 * Combina todos os engines para criar uma partida funcional
 */
export class PokerEngine {
  /**
   * Inicia uma nova partida de Texas Hold'em
   */
  static initializeGame(
    gameId: string,
    playerIds: string[],
    sbCents: number,
    bbCents: number,
  ): GameState {
    if (playerIds.length < 2) {
      throw new Error('Need at least 2 players');
    }

    const players = playerIds.map((id, index) => ({
      id,
      position: index,
      stackCents: 10000, // Default start stack
      status: PlayerStatus.ACTIVE,
      currentBetCents: 0,
      isConnected: true,
      holeCards: [],
    }));

    return {
      id: gameId,
      variantId: 'texas_holdem',
      status: GameStatus.IN_PROGRESS,
      players,
      currentPlayerIndex: 0,
      currentBetCents: 0,
      totalPotCents: 0,
      sidePots: [],
      communityCards: [],
      handHistory: [],
      createdAt: Date.now(),
      startedAt: Date.now(),
      bb_cents: bbCents,
      sb_cents: sbCents,
      lastRaiseAmount: bbCents,
    };
  }

  /**
   * Inicia uma nova mão
   */
  static dealNewHand(gameState: GameState): Card[] {
    // Cria e embaralha baralho
    const deck = DeckEngine.createStandardDeck();
    const shuffled = ShuffleEngine.shuffle(deck);

    // Distribui 2 cartas para cada jogador
    let cardIndex = 0;
    for (const player of gameState.players) {
      if (player.status !== PlayerStatus.FOLDED) {
        player.holeCards = [shuffled[cardIndex++], shuffled[cardIndex++]];
      }
    }

    // Retorna baralho restante
    return shuffled.slice(cardIndex);
  }

  /**
   * Processa uma ação do jogador
   */
  static processAction(
    gameState: GameState,
    playerId: string,
    action: PlayerAction,
    amountCents: number = 0,
  ): {
    success: boolean;
    error?: string;
  } {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      return { success: false, error: 'Player not found' };
    }

    // Valida ação
    const validation = BettingEngine.validateAction(
      gameState,
      playerId,
      action,
      amountCents,
    );

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Aplica ação
    BettingEngine.applyAction(gameState, playerIndex, action, amountCents);

    // Atualiza pote total
    gameState.totalPotCents = PotEngine.getTotalPot(gameState);

    return { success: true };
  }

  /**
   * Move para próximo jogador
   */
  static advanceToNextPlayer(gameState: GameState): void {
    gameState.currentPlayerIndex = TurnEngine.getNextPlayer(gameState, true);
  }

  /**
   * Completa a rodada de apostas
   */
  static completeBettingRound(gameState: GameState): void {
    // Reset bets para próxima rodada
    PotEngine.resetBetsForNextRound(gameState);
  }

  /**
   * Distribui community cards no flop
   */
  static dealFlop(gameState: GameState, deck: Card[]): void {
    if (deck.length < 3) {
      throw new Error('Not enough cards in deck for flop');
    }
    gameState.communityCards = deck.slice(0, 3);
  }

  /**
   * Distribui turn
   */
  static dealTurn(gameState: GameState, deck: Card[]): void {
    if (deck.length < 4) {
      throw new Error('Not enough cards in deck for turn');
    }
    gameState.communityCards = deck.slice(0, 4);
  }

  /**
   * Distribui river
   */
  static dealRiver(gameState: GameState, deck: Card[]): void {
    if (deck.length < 5) {
      throw new Error('Not enough cards in deck for river');
    }
    gameState.communityCards = deck.slice(0, 5);
  }

  /**
   * Determina vencedor (showdown)
   * Retorna lista de jogadores vencedores (pode haver empate)
   */
  static determineWinner(
    gameState: GameState,
  ): { winnerIds: string[]; bestHand: Hand } {
    const remaining = gameState.players.filter(
      p => p.status !== PlayerStatus.FOLDED,
    );

    if (remaining.length === 0) {
      throw new Error('No players remaining');
    }

    if (remaining.length === 1) {
      // Único jogador restante vence
      return {
        winnerIds: [remaining[0].id],
        bestHand: {
          rank: 0,
          rankName: 'No showdown',
          cards: [],
          kickers: [],
        },
      };
    }

    // Avalia mãos de cada jogador
    const evaluations = remaining.map(player => {
      const allCards = [...player.holeCards, ...gameState.communityCards];
      // Aqui seria preciso pegar os 5 melhores, mas simplificando:
      const best5 = allCards.slice(0, 5);
      return {
        playerId: player.id,
        hand: HandEvaluator.evaluate(best5),
      };
    });

    // Encontra a melhor mão
    let bestHand = evaluations[0].hand;
    for (let i = 1; i < evaluations.length; i++) {
      const comparison = HandEvaluator.compare(evaluations[i].hand, bestHand);
      if (comparison > 0) {
        bestHand = evaluations[i].hand;
      }
    }

    // Encontra todos que têm a melhor mão (pode haver empate)
    const winners = evaluations.filter(
      e => HandEvaluator.compare(e.hand, bestHand) === 0,
    );

    return {
      winnerIds: winners.map(w => w.playerId),
      bestHand,
    };
  }

  /**
   * Retorna ações disponíveis para o jogador atual
   */
  static getAvailableActions(gameState: GameState): PlayerAction[] {
    return BettingEngine.getAvailableActions(
      gameState,
      gameState.currentPlayerIndex,
    );
  }

  /**
   * Retorna resumo do estado atual (para logs/debugging)
   */
  static getStateSummary(gameState: GameState): string {
    const current = gameState.players[gameState.currentPlayerIndex];
    const remaining = TurnEngine.getPlayersRemaining(gameState).length;

    let summary = `Game: ${gameState.id}\n`;
    summary += `Status: ${gameState.status}\n`;
    summary += `Current player: ${current?.id}\n`;
    summary += `Pot: ${gameState.totalPotCents} cents\n`;
    summary += `Current bet: ${gameState.currentBetCents} cents\n`;
    summary += `Players remaining: ${remaining}\n`;
    summary += `Community: ${gameState.communityCards.length} cards\n`;

    return summary;
  }
}

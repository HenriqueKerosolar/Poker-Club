import { GameState, PlayerStatus } from '../../../shared/types/poker';

/**
 * TurnEngine - Controla turnos e ordem de ações
 * Gerencia quem joga quando
 */
export class TurnEngine {
  /**
   * Retorna o próximo jogador a agir
   * Se skipFolded=true, pula jogadores que foldearam
   */
  static getNextPlayer(
    gameState: GameState,
    skipFolded: boolean = true,
  ): number {
    if (gameState.players.length === 0) {
      throw new Error('No players in game');
    }

    let next = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    if (skipFolded) {
      const startIndex = next;
      let iterations = 0;

      while (
        gameState.players[next].status === PlayerStatus.FOLDED &&
        iterations < gameState.players.length
      ) {
        next = (next + 1) % gameState.players.length;
        iterations++;
      }

      if (iterations === gameState.players.length) {
        throw new Error('No active players remaining');
      }
    }

    return next;
  }

  /**
   * Retorna a posição do dealer (button)
   */
  static getDealerPosition(gameState: GameState): number {
    return gameState.players.length > 0 ? gameState.currentPlayerIndex : 0;
  }

  /**
   * Retorna posição do small blind (depois do dealer)
   */
  static getSmallBlindPosition(gameState: GameState): number {
    if (gameState.players.length < 2) return 0;
    return (gameState.currentPlayerIndex + 1) % gameState.players.length;
  }

  /**
   * Retorna posição do big blind (depois do SB)
   */
  static getBigBlindPosition(gameState: GameState): number {
    if (gameState.players.length < 2) return 0;
    return (gameState.currentPlayerIndex + 2) % gameState.players.length;
  }

  /**
   * Retorna jogadores ainda na mão (não foldearam)
   */
  static getPlayersRemaining(gameState: GameState) {
    return gameState.players.filter(p => p.status !== PlayerStatus.FOLDED);
  }

  /**
   * Retorna quantos jogadores ainda podem agir (ativos e conectados)
   */
  static getPlayersToAct(gameState: GameState) {
    return gameState.players.filter(
      p =>
        p.status !== PlayerStatus.FOLDED &&
        p.isConnected,
    );
  }

  /**
   * Verifica se a rodada de apostas terminou
   * Termina quando:
   * - Todos apostaram o mesmo valor
   * - Todos menos um foldearam
   * - Todos pagaram o bet/raise
   */
  static isBettingRoundComplete(gameState: GameState): boolean {
    const remaining = this.getPlayersRemaining(gameState);

    // Se só resta 1 jogador, rodada acabou (outros foldearam)
    if (remaining.length <= 1) {
      return true;
    }

    // Se todos que não foldearam estão all-in ou pagaram, rodada acabou
    const allPaid = remaining.every(
      p =>
        p.status === PlayerStatus.ALL_IN ||
        p.currentBetCents === gameState.currentBetCents,
    );

    return allPaid;
  }

  /**
   * Verifica se showdown foi atingido (último river, ninguém foldeou)
   */
  static isShowdownReached(gameState: GameState): boolean {
    const remaining = this.getPlayersRemaining(gameState);
    return remaining.length > 1;
  }

  /**
   * Rotaciona o dealer button
   */
  static rotateDealer(gameState: GameState): number {
    const nextDealer = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    return nextDealer;
  }

  /**
   * Detecta se está em situação heads-up (2 jogadores)
   */
  static isHeadsUp(gameState: GameState): boolean {
    return gameState.players.length === 2;
  }

  /**
   * Retorna posição inicial de ação dependendo da rodada
   * Pré-flop: UTG (esquerda do BB)
   * Pós-flop: SB (após dealer)
   */
  static getInitialActionPosition(
    gameState: GameState,
    isPreflop: boolean,
  ): number {
    if (isPreflop) {
      // Pré-flop: começa com UTG (esquerda do BB)
      return (this.getBigBlindPosition(gameState) + 1) %
        gameState.players.length;
    } else {
      // Pós-flop: começa com SB
      return this.getSmallBlindPosition(gameState);
    }
  }

  /**
   * Calcula quanto cada jogador precisa colocar para igualar aposta
   */
  static getAmountToCall(
    currentBetCents: number,
    playerCurrentBetCents: number,
  ): number {
    return Math.max(0, currentBetCents - playerCurrentBetCents);
  }

  /**
   * Valida se um raise é válido
   */
  static isValidRaise(
    raiseAmount: number,
    currentBetCents: number,
    lastRaiseAmount: number,
  ): boolean {
    // Raise mínimo = último raise
    const minRaise = currentBetCents + lastRaiseAmount;
    return raiseAmount >= minRaise;
  }
}

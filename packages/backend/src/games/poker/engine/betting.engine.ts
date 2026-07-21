import { GameState, PlayerAction, PlayerStatus } from '@shared/types/poker';

/**
 * BettingEngine - Valida e processa apostas
 * CRÍTICO: Garante que nenhuma ação inválida seja executada
 */
export class BettingEngine {
  /**
   * Valida uma ação antes de executar
   * Retorna { isValid, error? }
   */
  static validateAction(
    gameState: GameState,
    playerId: string,
    action: PlayerAction,
    amountCents: number = 0,
  ): { isValid: boolean; error?: string } {
    // 1. Encontra o jogador
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { isValid: false, error: 'Player not found in game' };
    }

    const player = gameState.players[playerIndex];

    // 2. Verifica se é a vez deste jogador
    if (gameState.currentPlayerIndex !== playerIndex) {
      return { isValid: false, error: 'Not your turn' };
    }

    // 3. Verifica se o jogador está ativo
    if (player.status === PlayerStatus.FOLDED) {
      return { isValid: false, error: 'Player has already folded' };
    }

    if (player.status === PlayerStatus.LEFT) {
      return { isValid: false, error: 'Player has left the game' };
    }

    // 4. Valida ação específica
    switch (action) {
      case PlayerAction.FOLD:
        return this.validateFold(gameState, playerIndex);

      case PlayerAction.CHECK:
        return this.validateCheck(gameState, playerIndex);

      case PlayerAction.CALL:
        return this.validateCall(gameState, playerIndex);

      case PlayerAction.BET:
        return this.validateBet(gameState, playerIndex, amountCents);

      case PlayerAction.RAISE:
        return this.validateRaise(gameState, playerIndex, amountCents);

      case PlayerAction.ALL_IN:
        return this.validateAllIn(gameState, playerIndex, amountCents);

      default:
        return { isValid: false, error: `Invalid action: ${action}` };
    }
  }

  // ===== VALIDAÇÃO POR AÇÃO =====

  private static validateFold(gameState: GameState, playerIndex: number): {
    isValid: boolean;
    error?: string;
  } {
    // Sempre pode foldar (exceto se já foldeou)
    return { isValid: true };
  }

  private static validateCheck(gameState: GameState, playerIndex: number): {
    isValid: boolean;
    error?: string;
  } {
    // Só pode checar se não há aposta no pote
    if (gameState.currentBetCents > 0) {
      return { isValid: false, error: 'Cannot check when bet is active' };
    }

    return { isValid: true };
  }

  private static validateCall(gameState: GameState, playerIndex: number): {
    isValid: boolean;
    error?: string;
  } {
    const player = gameState.players[playerIndex];
    const amountToCall = gameState.currentBetCents - (player.currentBetCents || 0);

    // Se não há aposta, precisa checar
    if (amountToCall === 0) {
      return { isValid: false, error: 'No bet to call, check instead' };
    }

    // Se stack é suficiente
    if (amountToCall > player.stackCents) {
      return { isValid: false, error: 'Insufficient stack to call' };
    }

    return { isValid: true };
  }

  private static validateBet(
    gameState: GameState,
    playerIndex: number,
    amountCents: number,
  ): { isValid: boolean; error?: string } {
    const player = gameState.players[playerIndex];

    // Só pode apostar se não há aposta
    if (gameState.currentBetCents > 0) {
      return { isValid: false, error: 'Cannot bet when someone has bet' };
    }

    // Validar quantidade
    if (amountCents <= 0) {
      return { isValid: false, error: 'Bet amount must be positive' };
    }

    if (amountCents < gameState.bb_cents) {
      return { isValid: false, error: `Minimum bet is ${gameState.bb_cents}` };
    }

    if (amountCents > player.stackCents) {
      return { isValid: false, error: 'Bet exceeds stack' };
    }

    return { isValid: true };
  }

  private static validateRaise(
    gameState: GameState,
    playerIndex: number,
    amountCents: number,
  ): { isValid: boolean; error?: string } {
    const player = gameState.players[playerIndex];

    // Precisa haver uma aposta para fazer raise
    if (gameState.currentBetCents === 0) {
      return { isValid: false, error: 'Cannot raise without a bet' };
    }

    // Raise deve ser >= aposta atual
    if (amountCents < gameState.currentBetCents) {
      return { isValid: false, error: 'Raise must equal or exceed current bet' };
    }

    // Raise mínimo = bet anterior + tamanho da aposta
    const minRaise = gameState.currentBetCents + gameState.lastRaiseAmount;
    if (amountCents < minRaise && amountCents < player.stackCents) {
      return { isValid: false, error: `Minimum raise is ${minRaise}` };
    }

    // Validar stack
    if (amountCents > player.stackCents) {
      return { isValid: false, error: 'Raise exceeds stack' };
    }

    return { isValid: true };
  }

  private static validateAllIn(
    gameState: GameState,
    playerIndex: number,
    amountCents: number,
  ): { isValid: boolean; error?: string } {
    const player = gameState.players[playerIndex];

    // All-in com o stack inteiro
    if (amountCents !== player.stackCents && amountCents > 0) {
      return { isValid: false, error: 'All-in must be entire stack' };
    }

    return { isValid: true };
  }

  // ===== HELPERS =====

  /**
   * Calcula quanto um jogador precisa pagar para igualar a aposta
   */
  static getAmountToCall(
    currentBetCents: number,
    playerCurrentBetCents: number,
  ): number {
    return Math.max(0, currentBetCents - playerCurrentBetCents);
  }

  /**
   * Retorna ações disponíveis para um jogador
   */
  static getAvailableActions(
    gameState: GameState,
    playerIndex: number,
  ): PlayerAction[] {
    const player = gameState.players[playerIndex];
    const actions: PlayerAction[] = [];

    // Sempre pode foldar
    actions.push(PlayerAction.FOLD);

    // Pode checar se não há aposta
    if (gameState.currentBetCents === 0) {
      actions.push(PlayerAction.CHECK);
    } else {
      // Senão pode pagar
      const amountToCall = this.getAmountToCall(
        gameState.currentBetCents,
        player.currentBetCents || 0,
      );

      if (amountToCall <= player.stackCents) {
        actions.push(PlayerAction.CALL);
      }
    }

    // Pode apostar se stack > 0
    if (player.stackCents > 0 && gameState.currentBetCents === 0) {
      actions.push(PlayerAction.BET);
    }

    // Pode fazer raise se stack > amount_to_call
    if (
      player.stackCents > 0 &&
      gameState.currentBetCents > 0
    ) {
      actions.push(PlayerAction.RAISE);
    }

    // Pode fazer all-in se stack > 0
    if (player.stackCents > 0) {
      actions.push(PlayerAction.ALL_IN);
    }

    return actions;
  }

  /**
   * Aplica uma ação à game state (muta o objeto)
   * NOTA: Esta função assume que a validação já passou
   */
  static applyAction(
    gameState: GameState,
    playerIndex: number,
    action: PlayerAction,
    amountCents: number = 0,
  ): void {
    const player = gameState.players[playerIndex];

    switch (action) {
      case PlayerAction.FOLD:
        player.status = PlayerStatus.FOLDED;
        break;

      case PlayerAction.CHECK:
        // Nada muda
        break;

      case PlayerAction.CALL:
        const amountToCall = this.getAmountToCall(
          gameState.currentBetCents,
          player.currentBetCents || 0,
        );
        player.stackCents -= amountToCall;
        player.currentBetCents = (player.currentBetCents || 0) + amountToCall;
        break;

      case PlayerAction.BET:
        player.stackCents -= amountCents;
        player.currentBetCents = (player.currentBetCents || 0) + amountCents;
        gameState.currentBetCents = amountCents;
        gameState.lastRaiseAmount = amountCents;
        break;

      case PlayerAction.RAISE:
        const callAmount = this.getAmountToCall(
          gameState.currentBetCents,
          player.currentBetCents || 0,
        );
        const extraRaise = amountCents - gameState.currentBetCents;
        player.stackCents -= callAmount + extraRaise;
        player.currentBetCents = (player.currentBetCents || 0) + callAmount + extraRaise;
        gameState.lastRaiseAmount = extraRaise;
        gameState.currentBetCents = amountCents;
        break;

      case PlayerAction.ALL_IN:
        const amountToAllIn = amountCents || player.stackCents;
        player.stackCents -= amountToAllIn;
        player.currentBetCents = (player.currentBetCents || 0) + amountToAllIn;
        player.status = PlayerStatus.ALL_IN;

        if (amountToAllIn > gameState.currentBetCents) {
          gameState.lastRaiseAmount = amountToAllIn - gameState.currentBetCents;
          gameState.currentBetCents = amountToAllIn;
        }
        break;
    }
  }
}

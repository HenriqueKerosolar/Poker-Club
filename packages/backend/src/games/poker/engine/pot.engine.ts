import { GameState, PlayerStatus, Pot } from '@shared/types/poker';

/**
 * PotEngine - Calcula potes principais e side pots
 * CRÍTICO: All-in com múltiplos jogadores requer side pots precisos
 */
export class PotEngine {
  /**
   * Calcula o pote total da mesa
   */
  static getTotalPot(gameState: GameState): number {
    return gameState.players.reduce(
      (sum, player) => sum + (player.currentBetCents || 0),
      0,
    );
  }

  /**
   * Calcula potes (main + side pots)
   * Essencial para determinar quem pode ganhar cada pote
   */
  static calculatePots(gameState: GameState): Pot[] {
    const pots: Pot[] = [];

    // Pega os stacks (quanto cada jogador apostou)
    const bets = gameState.players.map((p, i) => ({
      playerId: p.id,
      playerIndex: i,
      bet: p.currentBetCents || 0,
      isActive: p.status !== PlayerStatus.FOLDED,
    }));

    // Ordena apostas únicas
    const uniqueBets = [...new Set(bets.map(b => b.bet))].sort((a, b) => a - b);

    let prevBet = 0;

    for (const currentBet of uniqueBets) {
      if (currentBet === 0) continue;

      // Calcula tamanho do pote para este nível
      const potSize = (currentBet - prevBet) * bets.length;

      // Jogadores elegíveis = aqueles que apostaram este valor ou mais
      const eligible = bets
        .filter(b => b.bet >= currentBet && b.isActive)
        .map(b => b.playerId);

      if (eligible.length > 0) {
        pots.push({
          amountCents: potSize,
          eligiblePlayerIds: eligible,
        });
      }

      prevBet = currentBet;
    }

    return pots;
  }

  /**
   * Calcula o pote que um jogador específico é elegível para ganhar
   * Útil para all-in analysis
   */
  static getEligiblePots(gameState: GameState, playerIndex: number): Pot[] {
    const pots = this.calculatePots(gameState);
    const player = gameState.players[playerIndex];

    return pots.filter(pot =>
      pot.eligiblePlayerIds.includes(player.id),
    );
  }

  /**
   * Retorna a quantidade máxima que um jogador pode ganhar
   */
  static getMaxWinAmount(gameState: GameState, playerIndex: number): number {
    const pots = this.getEligiblePots(gameState, playerIndex);
    return pots.reduce((sum, pot) => sum + pot.amountCents, 0);
  }

  /**
   * Simula resultado de all-in para múltiplos jogadores
   * Exemplo: Player A all-in com R$100, Player B all-in com R$50
   */
  static simulateAllInScenario(gameState: GameState): { pots: Pot[]; analysis: string } {
    const pots = this.calculatePots(gameState);

    // Análise textual
    const analysis =
      pots.length === 1
        ? 'Main pot only (no side pots)'
        : `${pots.length} pots created (1 main + ${pots.length - 1} side pots)`;

    return { pots, analysis };
  }

  /**
   * Distribui ganhos entre vencedores
   * Recebe resultado de cada pote
   */
  static distributeWinnings(
    pots: Pot[],
    potResults: Array<{ potIndex: number; winnerIds: string[] }>,
  ): Record<string, number> {
    const winnings: Record<string, number> = {};

    for (const result of potResults) {
      const pot = pots[result.potIndex];
      const sharePerWinner = pot.amountCents / result.winnerIds.length;

      for (const winnerId of result.winnerIds) {
        winnings[winnerId] = (winnings[winnerId] || 0) + sharePerWinner;
      }
    }

    return winnings;
  }

  /**
   * Valida se um side pot é válido
   * (usado para testes)
   */
  static isValidPotStructure(pots: Pot[]): boolean {
    if (pots.length === 0) return false;

    // Cada pote precisa ter pelo menos 1 jogador elegível
    if (pots.some(pot => pot.eligiblePlayerIds.length === 0)) {
      return false;
    }

    // Potes devem ter amount > 0
    if (pots.some(pot => pot.amountCents <= 0)) {
      return false;
    }

    return true;
  }

  /**
   * Reseta o estado de apostas para próxima rodada
   */
  static resetBetsForNextRound(gameState: GameState): void {
    for (const player of gameState.players) {
      player.currentBetCents = 0;
    }
    gameState.currentBetCents = 0;
  }

  /**
   * Retorna resumo de potes (para logging/debugging)
   */
  static getPotSummary(gameState: GameState): string {
    const pots = this.calculatePots(gameState);
    const total = this.getTotalPot(gameState);

    let summary = `Total Pot: ${total} cents\n`;
    summary += `Number of pots: ${pots.length}\n`;

    for (let i = 0; i < pots.length; i++) {
      const pot = pots[i];
      const type = i === 0 ? 'Main' : `Side ${i}`;
      summary += `${type} Pot: ${pot.amountCents} cents (eligible: ${pot.eligiblePlayerIds.join(', ')})\n`;
    }

    return summary;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { PrismaService } from '@/database/prisma.service';
import {
  GameState,
  GameStatus,
  PlayerStatus,
  PlayerAction,
  GamePlayer,
} from '@shared/types/poker';
import {
  PokerEngine,
  HandEvaluator,
  PotEngine,
  BettingEngine,
  TurnEngine,
} from '@/games/poker';
import { generateId } from '@shared/utils';

/**
 * GameService - Orquestra partidas em tempo real
 * Gerencia estado da partida e executa ações
 */
@Injectable()
export class GameService {
  private logger = new Logger('GameService');
  private gameKeyPrefix = 'game:';
  private playerGameKeyPrefix = 'player_game:';

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  /**
   * Cria nova partida a partir de uma sala
   */
  async createGame(
    roomId: string,
    variantId: string,
    playerIds: string[],
  ): Promise<GameState> {
    const gameId = generateId();

    // Cria game state
    const gameState = PokerEngine.initializeGame(
      gameId,
      playerIds,
      50, // small blind (centavos)
      100, // big blind (centavos)
    );

    gameState.status = GameStatus.IN_PROGRESS;
    gameState.variantId = variantId;

    // Salva em Redis (TTL: 4 horas)
    await this.redis.setJson(`${this.gameKeyPrefix}${gameId}`, gameState, 14400);

    // Mapeia cada jogador → jogo
    for (const playerId of playerIds) {
      await this.redis.set(
        `${this.playerGameKeyPrefix}${playerId}`,
        gameId,
        14400,
      );
    }

    // Salva no banco (persistência)
    await this.prisma.game.create({
      data: {
        id: gameId,
        variantId,
        createdById: playerIds[0],
        status: 'in_progress',
        buyInCents: 2500, // Default buy-in
        createdAt: new Date(),
        startedAt: new Date(),
      },
    });

    this.logger.log(
      `Game created: ${gameId} with ${playerIds.length} players`,
    );
    return gameState;
  }

  /**
   * Busca estado da partida
   */
  async getGame(gameId: string): Promise<GameState | null> {
    return this.redis.getJson<GameState>(`${this.gameKeyPrefix}${gameId}`);
  }

  /**
   * Inicia nova mão
   */
  async startNewHand(gameId: string): Promise<void> {
    const gameState = await this.getGame(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Deal hole cards
    const deck = PokerEngine.dealNewHand(gameState);

    // Armazena deck restante (pós deal)
    gameState.deckRemaining = deck;

    // Reset de apostas
    PotEngine.resetBetsForNextRound(gameState);

    // Define dealer para próxima mão
    gameState.currentPlayerIndex = TurnEngine.rotateDealer(gameState);

    // Salva
    await this.redis.setJson(`${this.gameKeyPrefix}${gameId}`, gameState, 14400);

    this.logger.log(`Hand started in game ${gameId}`);
  }

  /**
   * Processa ação de um jogador
   */
  async processPlayerAction(
    gameId: string,
    playerId: string,
    action: PlayerAction,
    amountCents: number = 0,
  ): Promise<{
    success: boolean;
    error?: string;
    gameState?: GameState;
  }> {
    const gameState = await this.getGame(gameId);
    if (!gameState) {
      return { success: false, error: 'Game not found' };
    }

    // Valida se é a vez do jogador
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return {
        success: false,
        error: 'Not your turn',
      };
    }

    // Processa ação
    const result = PokerEngine.processAction(
      gameState,
      playerId,
      action,
      amountCents,
    );

    if (!result.success) {
      return result;
    }

    // Registra ação no banco
    await this.prisma.gameAction.create({
      data: {
        handId: `hand_${gameId}_${gameState.players.length}`,
        playerId,
        action,
        amountCents,
        sequence: gameState.handHistory.length,
      } as any,
    });

    // Avança para próximo jogador
    TurnEngine.getPlayersRemaining(gameState).length > 1 &&
      PokerEngine.advanceToNextPlayer(gameState);

    // Verifica se rodada de apostas acabou
    if (TurnEngine.isBettingRoundComplete(gameState)) {
      // Completa rodada (distribuir community cards na próxima etapa)
      PotEngine.resetBetsForNextRound(gameState);
    }

    // Salva
    await this.redis.setJson(`${this.gameKeyPrefix}${gameId}`, gameState, 14400);

    return {
      success: true,
      gameState,
    };
  }

  /**
   * Distribui flop
   */
  async dealFlop(gameId: string): Promise<void> {
    const gameState = await this.getGame(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!gameState.deckRemaining || gameState.deckRemaining.length < 3) {
      throw new Error('Not enough cards for flop');
    }

    PokerEngine.dealFlop(gameState, gameState.deckRemaining);

    // Salva
    await this.redis.setJson(`${this.gameKeyPrefix}${gameId}`, gameState, 14400);

    this.logger.log(`Flop dealt in game ${gameId}`);
  }

  /**
   * Distribui turn
   */
  async dealTurn(gameId: string): Promise<void> {
    const gameState = await this.getGame(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!gameState.deckRemaining || gameState.deckRemaining.length < 4) {
      throw new Error('Not enough cards for turn');
    }

    PokerEngine.dealTurn(gameState, gameState.deckRemaining);

    await this.redis.setJson(`${this.gameKeyPrefix}${gameId}`, gameState, 14400);

    this.logger.log(`Turn dealt in game ${gameId}`);
  }

  /**
   * Distribui river
   */
  async dealRiver(gameId: string): Promise<void> {
    const gameState = await this.getGame(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!gameState.deckRemaining || gameState.deckRemaining.length < 5) {
      throw new Error('Not enough cards for river');
    }

    PokerEngine.dealRiver(gameState, gameState.deckRemaining);

    await this.redis.setJson(`${this.gameKeyPrefix}${gameId}`, gameState, 14400);

    this.logger.log(`River dealt in game ${gameId}`);
  }

  /**
   * Showdown - Determina vencedor
   */
  async completeHand(gameId: string): Promise<{
    winnerIds: string[];
    prizePerWinner: number;
  }> {
    const gameState = await this.getGame(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Determina vencedor
    const { winnerIds, bestHand } = PokerEngine.determineWinner(gameState);

    // Calcula potes
    const pots = PotEngine.calculatePots(gameState);
    const totalPot = pots.reduce((sum, p) => sum + p.amountCents, 0);

    // Se múltiplos vencedores (empate), divide
    const prizePerWinner = Math.floor(totalPot / winnerIds.length);

    // Salva resultado no banco
    for (const winnerId of winnerIds) {
      await this.prisma.gameResult.create({
        data: {
          gameId,
          winnerId,
          prizeAmountCents: prizePerWinner,
          bestHand: bestHand.rankName,
        } as any,
      });
    }

    this.logger.log(
      `Hand completed in ${gameId}, winner(s): ${winnerIds.join(', ')}`,
    );

    return {
      winnerIds,
      prizePerWinner,
    };
  }

  /**
   * Busca a partida de um jogador
   */
  async getPlayerGame(playerId: string): Promise<GameState | null> {
    const gameId = await this.redis.get(
      `${this.playerGameKeyPrefix}${playerId}`,
    );
    if (!gameId) return null;

    return this.getGame(gameId);
  }

  /**
   * Encerra partida e salva no banco
   */
  async endGame(gameId: string): Promise<void> {
    const gameState = await this.getGame(gameId);
    if (gameState) {
      // Salva resultado final no banco
      await this.prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'completed',
          endedAt: new Date(),
        },
      });

      // Remove de Redis
      await this.redis.delete(`${this.gameKeyPrefix}${gameId}`);

      // Remove mapeamento de todos os jogadores
      for (const player of gameState.players) {
        await this.redis.delete(
          `${this.playerGameKeyPrefix}${player.id}`,
        );
      }
    }

    this.logger.log(`Game ${gameId} ended`);
  }

  /**
   * Retorna resumo da partida
   */
  getGameSummary(gameState: GameState): string {
    const remaining = TurnEngine.getPlayersRemaining(gameState).length;
    const totalPot = PotEngine.getTotalPot(gameState);

    let summary = `Game: ${gameState.id}\n`;
    summary += `Status: ${gameState.status}\n`;
    summary += `Players: ${remaining}/${gameState.players.length}\n`;
    summary += `Pot: ${totalPot} cents\n`;
    summary += `Community: ${gameState.communityCards.length} cards\n`;

    return summary;
  }
}

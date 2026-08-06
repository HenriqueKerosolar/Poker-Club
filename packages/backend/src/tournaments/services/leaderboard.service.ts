import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

/**
 * LeaderboardService - Rankings, estatísticas globais
 * Suporta: all-time, seasonal, por formato
 */
@Injectable()
export class LeaderboardService {
  private logger = new Logger('LeaderboardService');
  private readonly LEADERBOARD_TTL = 60 * 60; // 1 hora

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Retorna leaderboard geral (all-time)
   */
  async getGlobalLeaderboard(limit: number = 100): Promise<any[]> {
    const cacheKey = `leaderboard:global:${limit}`;

    // Tenta cache
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      return cached;
    }

    // Busca do banco
    const leaderboard = await this.prisma.game.groupBy({
      by: ['players'],
      where: {
        status: 'finished',
      },
      _count: {
        id: true,
      },
    });

    // Agrupa por jogador
    const playerStats: Record<string, any> = {};

    const games = await this.prisma.game.findMany({
      where: { status: 'finished' },
      include: {
        players: {
          select: { userId: true },
        },
      },
    });

    for (const game of games) {
      for (const player of game.players) {
        if (!playerStats[player.userId]) {
          playerStats[player.userId] = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWinnings: 0,
            totalLosses: 0,
          };
        }
        playerStats[player.userId].gamesPlayed++;

        const result = (game.finalResult as any)?.[player.userId] || 0;
        if (result > 0) {
          playerStats[player.userId].gamesWon++;
          playerStats[player.userId].totalWinnings += result;
        } else {
          playerStats[player.userId].totalLosses += Math.abs(result);
        }
      }
    }

    // Ordena por winrate + winnings
    const sorted = Object.entries(playerStats)
      .map(([userId, stats]) => ({
        userId,
        winRate:
          stats.gamesPlayed > 0
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 10000) / 100
            : 0,
        ...stats,
      }))
      .sort((a, b) => {
        // Primeiro por win rate, depois por ganhos
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return b.totalWinnings - a.totalWinnings;
      })
      .slice(0, limit)
      .map((stat, idx) => ({
        rank: idx + 1,
        ...stat,
      }));

    // Enriquece com dados do usuário
    const enriched = await Promise.all(
      sorted.map(async (stat) => {
        const user = await this.prisma.user.findUnique({
          where: { id: stat.userId },
          select: {
            username: true,
            id: true,
          },
        });
        return { ...stat, username: user?.username };
      }),
    );

    // Cache
    await this.redis.setJson(cacheKey, enriched, this.LEADERBOARD_TTL);

    return enriched;
  }

  /**
   * Retorna leaderboard por formato (Texas Hold'em, Omaha, etc)
   */
  async getFormatLeaderboard(
    format: string,
    limit: number = 50,
  ): Promise<any[]> {
    const cacheKey = `leaderboard:format:${format}:${limit}`;

    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      return cached;
    }

    const games = await this.prisma.game.findMany({
      where: {
        format,
        status: 'finished',
      },
      include: {
        players: {
          select: { userId: true },
        },
      },
    });

    // Agrupa por jogador (similar ao global)
    const playerStats: Record<string, any> = {};

    for (const game of games) {
      for (const player of game.players) {
        if (!playerStats[player.userId]) {
          playerStats[player.userId] = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWinnings: 0,
          };
        }
        playerStats[player.userId].gamesPlayed++;

        const result = (game.finalResult as any)?.[player.userId] || 0;
        if (result > 0) {
          playerStats[player.userId].gamesWon++;
          playerStats[player.userId].totalWinnings += result;
        }
      }
    }

    const sorted = Object.entries(playerStats)
      .map(([userId, stats]) => ({
        userId,
        format,
        winRate:
          stats.gamesPlayed > 0
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 10000) / 100
            : 0,
        ...stats,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.totalWinnings - a.totalWinnings)
      .slice(0, limit)
      .map((stat, idx) => ({ rank: idx + 1, ...stat }));

    // Enriquece
    const enriched = await Promise.all(
      sorted.map(async (stat) => {
        const user = await this.prisma.user.findUnique({
          where: { id: stat.userId },
          select: { username: true },
        });
        return { ...stat, username: user?.username };
      }),
    );

    await this.redis.setJson(cacheKey, enriched, this.LEADERBOARD_TTL);
    return enriched;
  }

  /**
   * Retorna posição do usuário
   */
  async getUserLeaderboardPosition(userId: string): Promise<any> {
    const leaderboard = await this.getGlobalLeaderboard(1000);
    const position = leaderboard.find((u) => u.userId === userId);

    if (!position) {
      return {
        rank: null,
        userId,
        message: 'Jogador não está no leaderboard',
      };
    }

    return position;
  }

  /**
   * Retorna leaderboard semanal
   */
  async getWeeklyLeaderboard(limit: number = 50): Promise<any[]> {
    const cacheKey = `leaderboard:weekly:${limit}`;

    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      return cached;
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const games = await this.prisma.game.findMany({
      where: {
        status: 'finished',
        finishedAt: { gte: oneWeekAgo },
      },
      include: {
        players: { select: { userId: true } },
      },
    });

    // Agrupa stats
    const playerStats: Record<string, any> = {};

    for (const game of games) {
      for (const player of game.players) {
        if (!playerStats[player.userId]) {
          playerStats[player.userId] = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWinnings: 0,
          };
        }
        playerStats[player.userId].gamesPlayed++;

        const result = (game.finalResult as any)?.[player.userId] || 0;
        if (result > 0) {
          playerStats[player.userId].gamesWon++;
          playerStats[player.userId].totalWinnings += result;
        }
      }
    }

    const sorted = Object.entries(playerStats)
      .map(([userId, stats]) => ({
        userId,
        period: 'weekly',
        winRate:
          stats.gamesPlayed > 0
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 10000) / 100
            : 0,
        ...stats,
      }))
      .sort((a, b) => b.totalWinnings - a.totalWinnings)
      .slice(0, limit)
      .map((stat, idx) => ({ rank: idx + 1, ...stat }));

    // Enriquece
    const enriched = await Promise.all(
      sorted.map(async (stat) => {
        const user = await this.prisma.user.findUnique({
          where: { id: stat.userId },
          select: { username: true },
        });
        return { ...stat, username: user?.username };
      }),
    );

    await this.redis.setJson(cacheKey, enriched, this.LEADERBOARD_TTL);
    return enriched;
  }

  /**
   * Invalida cache de leaderboard
   */
  async invalidateCache(): Promise<void> {
    await this.redis.delete('leaderboard:global:*');
    await this.redis.delete('leaderboard:format:*');
    await this.redis.delete('leaderboard:weekly:*');
    this.logger.log('Leaderboard cache invalidado');
  }
}

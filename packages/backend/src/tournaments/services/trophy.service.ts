import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

/**
 * TrophyService - Achievements, troféus, badges
 * Desbloqueia automaticamente baseado em eventos
 */
@Injectable()
export class TrophyService {
  private logger = new Logger('TrophyService');

  constructor(private prisma: PrismaService) {}

  /**
   * Define trofeu/achievement para usuário
   */
  async awardTrophy(userId: string, trophyId: string): Promise<any> {
    // Verifica se já tem
    const existing = await this.prisma.userTrophy.findUnique({
      where: {
        userId_trophyId: { userId, trophyId },
      },
    });

    if (existing) {
      return existing; // Já tem
    }

    const trophy = await this.prisma.userTrophy.create({
      data: {
        userId,
        trophyId,
        unlockedAt: new Date(),
      },
      include: {
        trophy: true,
      },
    });

    this.logger.log(`Troféu desbloqueado: ${userId} → ${trophyId}`);
    return trophy;
  }

  /**
   * Lista troféus do usuário
   */
  async getUserTrophies(userId: string): Promise<any[]> {
    return this.prisma.userTrophy.findMany({
      where: { userId },
      include: {
        trophy: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * Retorna todos os troféus disponíveis
   */
  getAllAvailableTrophies(): Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }> {
    return [
      // Starter
      {
        id: 'first_game',
        name: 'First Hand',
        description: 'Jogue sua primeira partida',
        icon: '🎰',
        category: 'starter',
        rarity: 'common',
      },
      {
        id: 'first_win',
        name: 'Vencedor',
        description: 'Ganhe sua primeira partida',
        icon: '🏆',
        category: 'starter',
        rarity: 'common',
      },

      // Wins
      {
        id: 'ten_wins',
        name: '10 Vitórias',
        description: 'Ganhe 10 partidas',
        icon: '⭐',
        category: 'wins',
        rarity: 'common',
      },
      {
        id: 'fifty_wins',
        name: '50 Vitórias',
        description: 'Ganhe 50 partidas',
        icon: '✨',
        category: 'wins',
        rarity: 'rare',
      },
      {
        id: 'hundred_wins',
        name: '100 Vitórias',
        description: 'Ganhe 100 partidas',
        icon: '🌟',
        category: 'wins',
        rarity: 'epic',
      },

      // Winrate
      {
        id: 'good_winrate',
        name: 'Estrategista',
        description: 'Atinja 60% de taxa de vitória',
        icon: '📊',
        category: 'winrate',
        rarity: 'rare',
      },
      {
        id: 'excellent_winrate',
        name: 'Mestre do Poker',
        description: 'Atinja 75% de taxa de vitória',
        icon: '👑',
        category: 'winrate',
        rarity: 'legendary',
      },

      // Money
      {
        id: 'high_roller',
        name: 'High Roller',
        description: 'Ganhe R$ 10.000 (1.000.000 cents)',
        icon: '💰',
        category: 'money',
        rarity: 'rare',
      },
      {
        id: 'millionaire',
        name: 'Milionário',
        description: 'Ganhe R$ 100.000 (10.000.000 cents)',
        icon: '💎',
        category: 'money',
        rarity: 'epic',
      },

      // Tournament
      {
        id: 'tournament_participant',
        name: 'Participante',
        description: 'Participe de um torneio',
        icon: '🎪',
        category: 'tournament',
        rarity: 'common',
      },
      {
        id: 'tournament_winner',
        name: 'Campeão',
        description: 'Ganhe um torneio',
        icon: '🥇',
        category: 'tournament',
        rarity: 'epic',
      },
      {
        id: 'tournament_champion',
        name: 'Lenda',
        description: 'Ganhe 5 torneios',
        icon: '👑',
        category: 'tournament',
        rarity: 'legendary',
      },

      // Social
      {
        id: 'has_friends',
        name: 'Amigo',
        description: 'Adicione 5 amigos',
        icon: '👥',
        category: 'social',
        rarity: 'common',
      },
      {
        id: 'popular',
        name: 'Popular',
        description: 'Adicione 50 amigos',
        icon: '🌐',
        category: 'social',
        rarity: 'rare',
      },

      // Special
      {
        id: 'perfect_game',
        name: 'Jogo Perfeito',
        description: 'Ganhe uma partida com ALL-IN na primeira rodada',
        icon: '🎯',
        category: 'special',
        rarity: 'epic',
      },
      {
        id: 'consecutive_wins',
        name: 'Maremoto',
        description: 'Ganhe 5 partidas consecutivas',
        icon: '🌊',
        category: 'special',
        rarity: 'rare',
      },
      {
        id: 'comeback',
        name: 'Retorno',
        description: 'Ganhe uma partida com menos de R$ 10 de fichas',
        icon: '⚡',
        category: 'special',
        rarity: 'epic',
      },

      // Seasonal
      {
        id: 'daily_login_7',
        name: 'Dedicado',
        description: 'Faça login 7 dias seguidos',
        icon: '📅',
        category: 'seasonal',
        rarity: 'common',
      },
      {
        id: 'daily_login_30',
        name: 'Consistente',
        description: 'Faça login 30 dias seguidos',
        icon: '🔥',
        category: 'seasonal',
        rarity: 'rare',
      },
    ];
  }

  /**
   * Verifica e desbloqueia troféus automaticamente
   */
  async checkAndUnlockTrophies(userId: string): Promise<string[]> {
    const unlockedTrophies: string[] = [];

    // Busca stats do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const games = await this.prisma.game.findMany({
      where: {
        players: { some: { userId } },
      },
    });

    // Calcula stats
    let gamesWon = 0;
    let totalWinnings = 0;
    let maxConsecutiveWins = 0;
    let currentConsecutive = 0;

    for (const game of games) {
      const result = (game.finalResult as any)?.[userId] || 0;
      if (result > 0) {
        gamesWon++;
        totalWinnings += result;
        currentConsecutive++;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    const winRate = games.length > 0 ? (gamesWon / games.length) * 100 : 0;

    // Verifica cada troféu
    // Starter
    if (games.length >= 1) {
      await this.awardTrophy(userId, 'first_game');
      unlockedTrophies.push('first_game');
    }
    if (gamesWon >= 1) {
      await this.awardTrophy(userId, 'first_win');
      unlockedTrophies.push('first_win');
    }

    // Wins
    if (gamesWon >= 10) {
      await this.awardTrophy(userId, 'ten_wins');
      unlockedTrophies.push('ten_wins');
    }
    if (gamesWon >= 50) {
      await this.awardTrophy(userId, 'fifty_wins');
      unlockedTrophies.push('fifty_wins');
    }
    if (gamesWon >= 100) {
      await this.awardTrophy(userId, 'hundred_wins');
      unlockedTrophies.push('hundred_wins');
    }

    // Winrate
    if (winRate >= 60) {
      await this.awardTrophy(userId, 'good_winrate');
      unlockedTrophies.push('good_winrate');
    }
    if (winRate >= 75) {
      await this.awardTrophy(userId, 'excellent_winrate');
      unlockedTrophies.push('excellent_winrate');
    }

    // Money
    if (totalWinnings >= 1000000) {
      // R$ 10.000
      await this.awardTrophy(userId, 'high_roller');
      unlockedTrophies.push('high_roller');
    }
    if (totalWinnings >= 10000000) {
      // R$ 100.000
      await this.awardTrophy(userId, 'millionaire');
      unlockedTrophies.push('millionaire');
    }

    // Consecutive wins
    if (maxConsecutiveWins >= 5) {
      await this.awardTrophy(userId, 'consecutive_wins');
      unlockedTrophies.push('consecutive_wins');
    }

    // Friends
    const friendCount = await this.prisma.friendship.count({
      where: {
        OR: [
          { requesterUserId: userId, status: 'accepted' },
          { recipientUserId: userId, status: 'accepted' },
        ],
      },
    });

    if (friendCount >= 5) {
      await this.awardTrophy(userId, 'has_friends');
      unlockedTrophies.push('has_friends');
    }
    if (friendCount >= 50) {
      await this.awardTrophy(userId, 'popular');
      unlockedTrophies.push('popular');
    }

    return unlockedTrophies;
  }

  /**
   * Obtém progresso de troféus do usuário
   */
  async getTrophyProgress(userId: string): Promise<any> {
    const allTrophies = this.getAllAvailableTrophies();
    const userTrophies = await this.getUserTrophies(userId);
    const userTrophyIds = userTrophies.map((t) => t.trophyId);

    return allTrophies.map((trophy) => ({
      ...trophy,
      unlocked: userTrophyIds.includes(trophy.id),
      unlockedAt: userTrophies.find((t) => t.trophyId === trophy.id)?.unlockedAt || null,
    }));
  }
}

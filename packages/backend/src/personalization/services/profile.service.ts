import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * ProfileService - Perfil de usuário (bio, info, estatísticas)
 */
@Injectable()
export class ProfileService {
  private logger = new Logger('ProfileService');
  private readonly MAX_BIO_LENGTH = 500;

  constructor(private prisma: PrismaService) {}

  /**
   * Atualiza perfil do usuário
   */
  async updateProfile(
    userId: string,
    profile: {
      displayName?: string;
      bio?: string;
      location?: string;
      website?: string;
    },
  ): Promise<any> {
    // Valida bio
    if (profile.bio && profile.bio.length > this.MAX_BIO_LENGTH) {
      throw new BadRequestException(
        `Bio muito longa (máx ${this.MAX_BIO_LENGTH} caracteres)`,
      );
    }

    // Valida displayName
    if (profile.displayName && profile.displayName.length < 2) {
      throw new BadRequestException('Nome deve ter no mínimo 2 caracteres');
    }

    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName: profile.displayName,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
      },
      create: {
        userId,
        displayName: profile.displayName,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
      },
    });

    this.logger.log(`Perfil atualizado: ${userId}`);

    return this.formatProfile(userProfile);
  }

  /**
   * Obtém perfil completo do usuário
   */
  async getUserProfile(userId: string): Promise<any> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // Busca estatísticas
    const stats = await this.getPlayerStats(userId);

    return {
      user: user,
      profile: this.formatProfile(profile),
      stats: stats,
    };
  }

  /**
   * Busca estatísticas do jogador
   */
  async getPlayerStats(userId: string): Promise<any> {
    const games = await this.prisma.game.findMany({
      where: {
        players: {
          some: { userId },
        },
      },
      select: {
        id: true,
        finalResult: true,
      },
    });

    let totalGames = games.length;
    let gamesWon = 0;
    let totalWinnings = 0;

    for (const game of games) {
      if (game.finalResult) {
        const result = (game.finalResult as any)[userId];
        if (result && result > 0) {
          gamesWon++;
          totalWinnings += result;
        }
      }
    }

    const winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;

    return {
      gamesPlayed: totalGames,
      gamesWon: gamesWon,
      winRate: Math.round(winRate * 100) / 100,
      totalWinnings: totalWinnings,
      totalLosses: Math.max(0, totalGames - gamesWon),
      averageWinPerGame:
        gamesWon > 0 ? Math.round((totalWinnings / gamesWon) * 100) / 100 : 0,
    };
  }

  /**
   * Atualiza bio do usuário
   */
  async updateBio(userId: string, bio: string): Promise<any> {
    if (bio && bio.length > this.MAX_BIO_LENGTH) {
      throw new BadRequestException(
        `Bio muito longa (máx ${this.MAX_BIO_LENGTH} caracteres)`,
      );
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { bio },
      create: { userId, bio },
    });

    return { bio: profile.bio };
  }

  /**
   * Atualiza localização
   */
  async updateLocation(userId: string, location: string): Promise<any> {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { location },
      create: { userId, location },
    });

    return { location: profile.location };
  }

  /**
   * Atualiza website
   */
  async updateWebsite(userId: string, website: string): Promise<any> {
    // Valida URL
    if (website) {
      try {
        new URL(website);
      } catch {
        throw new BadRequestException('URL inválida');
      }
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { website },
      create: { userId, website },
    });

    return { website: profile.website };
  }

  /**
   * Obtém perfil público (sem dados sensíveis)
   */
  async getPublicProfile(userId: string): Promise<any> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    const stats = await this.getPlayerStats(userId);

    return {
      user: user,
      profile: {
        displayName: profile?.displayName,
        bio: profile?.bio,
        location: profile?.location,
        website: profile?.website,
        avatarUrl: profile?.avatarUrl,
      },
      stats: stats,
    };
  }

  /**
   * Formata perfil para resposta
   */
  private formatProfile(profile: any): any {
    return {
      displayName: profile?.displayName,
      bio: profile?.bio,
      location: profile?.location,
      website: profile?.website,
      avatarUrl: profile?.avatarUrl,
      theme: profile?.theme || 'light',
      backgroundMusic: profile?.backgroundMusic || 'casino_jazz',
      musicVolume: profile?.musicVolume ?? 70,
      effectsVolume: profile?.effectsVolume ?? 70,
      musicEnabled: profile?.musicEnabled ?? true,
      effectsEnabled: profile?.effectsEnabled ?? true,
      createdAt: profile?.createdAt,
      updatedAt: profile?.updatedAt,
    };
  }
}

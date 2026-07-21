import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/redis/redis.service';

/**
 * TournamentService - Criação, gestão e execução de torneios
 * Suporta: criação, participação, gestão de fases
 */
@Injectable()
export class TournamentService {
  private logger = new Logger('TournamentService');
  private readonly TOURNAMENT_TTL = 30 * 24 * 60 * 60; // 30 dias

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Cria novo torneio
   */
  async createTournament(
    creatorId: string,
    data: {
      name: string;
      description?: string;
      format: 'single_elimination' | 'round_robin' | 'swiss';
      maxPlayers: number;
      buyInCents: number;
      prizePoolCents: number;
      startAt: Date;
    },
  ): Promise<any> {
    if (data.maxPlayers < 2 || data.maxPlayers > 1024) {
      throw new BadRequestException('Max players deve estar entre 2-1024');
    }

    if (data.buyInCents <= 0) {
      throw new BadRequestException('Buy-in deve ser maior que 0');
    }

    if (data.prizePoolCents < data.buyInCents) {
      throw new BadRequestException('Prize pool deve ser maior que buy-in');
    }

    const tournament = await this.prisma.tournament.create({
      data: {
        creatorId,
        name: data.name,
        description: data.description,
        format: data.format,
        maxPlayers: data.maxPlayers,
        buyInCents: data.buyInCents,
        prizePoolCents: data.prizePoolCents,
        startAt: data.startAt,
        status: 'created',
        players: {
          create: {
            userId: creatorId,
            position: 1,
          },
        },
      },
      include: {
        players: true,
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Cache em Redis
    const key = `tournament:${tournament.id}`;
    await this.redis.setJson(key, tournament, this.TOURNAMENT_TTL);

    this.logger.log(`Torneio criado: ${tournament.id} por ${creatorId}`);
    return tournament;
  }

  /**
   * Entra em um torneio
   */
  async joinTournament(tournamentId: string, userId: string): Promise<any> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { players: true },
    });

    if (!tournament) {
      throw new BadRequestException('Torneio não encontrado');
    }

    if (tournament.status !== 'created') {
      throw new BadRequestException('Torneio já iniciou ou foi cancelado');
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      throw new BadRequestException('Torneio está cheio');
    }

    // Verifica se já está inscrito
    const already = tournament.players.find((p) => p.userId === userId);
    if (already) {
      throw new BadRequestException('Você já está inscrito');
    }

    // Reserva saldo (buy-in)
    // Será cobrado de verdade quando torneio inicia
    const participant = await this.prisma.tournamentPlayer.create({
      data: {
        tournamentId,
        userId,
        position: tournament.players.length + 1,
      },
    });

    // Invalidar cache
    await this.redis.delete(`tournament:${tournamentId}`);

    this.logger.log(`Jogador entrou em torneio: ${userId} em ${tournamentId}`);
    return participant;
  }

  /**
   * Sai de um torneio
   */
  async leaveTournament(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new BadRequestException('Torneio não encontrado');
    }

    if (tournament.status !== 'created') {
      throw new BadRequestException('Não pode sair de torneio em andamento');
    }

    await this.prisma.tournamentPlayer.deleteMany({
      where: { tournamentId, userId },
    });

    // Invalidar cache
    await this.redis.delete(`tournament:${tournamentId}`);

    this.logger.log(`Jogador saiu do torneio: ${userId} de ${tournamentId}`);
  }

  /**
   * Inicia o torneio
   */
  async startTournament(tournamentId: string, creatorId: string): Promise<any> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { players: true },
    });

    if (!tournament) {
      throw new BadRequestException('Torneio não encontrado');
    }

    if (tournament.creatorId !== creatorId) {
      throw new BadRequestException('Apenas o criador pode iniciar');
    }

    if (tournament.status !== 'created') {
      throw new BadRequestException('Torneio já foi iniciado');
    }

    if (tournament.players.length < 2) {
      throw new BadRequestException('Mínimo 2 jogadores necessário');
    }

    // Atualiza status
    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Embaralha jogadores
    const shuffled = tournament.players
      .map((p) => ({ ...p, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((p, idx) => ({ ...p, position: idx + 1 }));

    // Cria primeira rodada (Round 1)
    await this.createTournamentRound(tournamentId, 1, tournament.format);

    // Invalidar cache
    await this.redis.delete(`tournament:${tournamentId}`);

    this.logger.log(`Torneio iniciado: ${tournamentId}`);
    return updated;
  }

  /**
   * Cria rodada do torneio
   */
  async createTournamentRound(
    tournamentId: string,
    roundNumber: number,
    format: string,
  ): Promise<any> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { players: true },
    });

    const round = await this.prisma.tournamentRound.create({
      data: {
        tournamentId,
        roundNumber,
        status: 'scheduled',
      },
    });

    // Gera matches baseado no formato
    if (format === 'single_elimination') {
      await this.createEliminationMatches(tournamentId, round.id, tournament.players);
    } else if (format === 'round_robin') {
      await this.createRoundRobinMatches(tournamentId, round.id, tournament.players);
    }

    return round;
  }

  /**
   * Cria matches de eliminação simples
   */
  private async createEliminationMatches(
    tournamentId: string,
    roundId: string,
    players: any[],
  ): Promise<void> {
    for (let i = 0; i < players.length; i += 2) {
      await this.prisma.tournamentMatch.create({
        data: {
          roundId,
          player1Id: players[i].userId,
          player2Id: players[i + 1]?.userId || null,
          status: 'scheduled',
        },
      });
    }
  }

  /**
   * Cria matches round-robin
   */
  private async createRoundRobinMatches(
    tournamentId: string,
    roundId: string,
    players: any[],
  ): Promise<void> {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        await this.prisma.tournamentMatch.create({
          data: {
            roundId,
            player1Id: players[i].userId,
            player2Id: players[j].userId,
            status: 'scheduled',
          },
        });
      }
    }
  }

  /**
   * Registra resultado de match
   */
  async recordMatchResult(
    matchId: string,
    winnerId: string,
    winningCents: number,
  ): Promise<any> {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new BadRequestException('Match não encontrado');
    }

    const updated = await this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        winnerId,
        winningCents,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Match completado: ${matchId}, vencedor: ${winnerId}`);
    return updated;
  }

  /**
   * Obtém detalhes do torneio
   */
  async getTournamentDetails(tournamentId: string): Promise<any> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          include: {
            user: {
              select: {
                username: true,
                id: true,
              },
            },
          },
        },
        rounds: {
          include: {
            matches: true,
          },
        },
        creator: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    });

    return tournament;
  }

  /**
   * Lista torneios ativos
   */
  async getActiveTournaments(): Promise<any[]> {
    return this.prisma.tournament.findMany({
      where: {
        status: { in: ['created', 'running'] },
      },
      include: {
        players: true,
        creator: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Finaliza torneio e distribui prêmios
   */
  async finalizeTournament(tournamentId: string): Promise<any> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: true,
        rounds: {
          include: {
            matches: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new BadRequestException('Torneio não encontrado');
    }

    // Calcula ranking final
    const ranking = await this.calculateFinalRanking(tournament);

    // Distribui prêmios (90% para top 3)
    const prizeDistribution = this.calculatePrizeDistribution(
      tournament.prizePoolCents,
      ranking,
    );

    // Atualiza posição final dos jogadores
    for (const [userId, position] of Object.entries(ranking)) {
      const prize = prizeDistribution[userId] || 0;
      await this.prisma.tournamentPlayer.updateMany({
        where: { tournamentId, userId },
        data: { finalPosition: position as number, prizeWonCents: prize },
      });
    }

    // Marca como finalizado
    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'finished',
        finishedAt: new Date(),
      },
    });

    // Invalidar cache
    await this.redis.delete(`tournament:${tournamentId}`);

    this.logger.log(`Torneio finalizado: ${tournamentId}`);
    return { tournament: updated, ranking, prizes: prizeDistribution };
  }

  /**
   * Calcula ranking final baseado em wins
   */
  private async calculateFinalRanking(tournament: any): Promise<Record<string, number>> {
    const ranking = {};

    // Conta wins por jogador
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (match.winnerId) {
          ranking[match.winnerId] = (ranking[match.winnerId] || 0) + 1;
        }
      }
    }

    // Ordena por wins descendente
    return Object.fromEntries(
      Object.entries(ranking)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([userId], idx) => [userId, idx + 1]),
    );
  }

  /**
   * Calcula distribuição de prêmios
   */
  private calculatePrizeDistribution(
    prizePoolCents: number,
    ranking: Record<string, number>,
  ): Record<string, number> {
    const distribution = {};

    // Prêmios: 50% (1º), 30% (2º), 20% (3º)
    const prizes = [
      { position: 1, percentage: 0.5 },
      { position: 2, percentage: 0.3 },
      { position: 3, percentage: 0.2 },
    ];

    for (const [userId, position] of Object.entries(ranking)) {
      const prize = prizes.find((p) => p.position === position);
      if (prize) {
        distribution[userId] = Math.round(prizePoolCents * prize.percentage);
      }
    }

    return distribution;
  }
}

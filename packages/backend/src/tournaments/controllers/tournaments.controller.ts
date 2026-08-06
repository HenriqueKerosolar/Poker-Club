import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TournamentService } from '../services/tournament.service';
import { TrophyService } from '../services/trophy.service';
import { LeaderboardService } from '../services/leaderboard.service';

/**
 * TournamentsController - Torneios, troféus, leaderboards
 */
@Controller('api/tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  private logger = new Logger('TournamentsController');

  constructor(
    private tournamentService: TournamentService,
    private trophyService: TrophyService,
    private leaderboardService: LeaderboardService,
  ) {}

  // ==================== TOURNAMENTS ====================

  /**
   * POST /api/tournaments
   * Cria novo torneio
   */
  @Post()
  async createTournament(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      description?: string;
      format: 'single_elimination' | 'round_robin' | 'swiss';
      maxPlayers: number;
      buyInCents: number;
      prizePoolCents: number;
      startAt: string;
    },
  ) {
    const userId = req.user.sub;
    return this.tournamentService.createTournament(userId, {
      ...body,
      startAt: new Date(body.startAt),
    });
  }

  /**
   * GET /api/tournaments
   * Lista torneios ativos
   */
  @Get()
  async getActiveTournaments() {
    return this.tournamentService.getActiveTournaments();
  }

  /**
   * GET /api/tournaments/:tournamentId
   * Detalhes do torneio
   */
  @Get(':tournamentId')
  async getTournament(@Param('tournamentId') tournamentId: string) {
    return this.tournamentService.getTournamentDetails(tournamentId);
  }

  /**
   * POST /api/tournaments/:tournamentId/join
   * Entra em um torneio
   */
  @Post(':tournamentId/join')
  async joinTournament(
    @Req() req: any,
    @Param('tournamentId') tournamentId: string,
  ) {
    const userId = req.user.sub;
    return this.tournamentService.joinTournament(tournamentId, userId);
  }

  /**
   * POST /api/tournaments/:tournamentId/leave
   * Sai de um torneio
   */
  @Post(':tournamentId/leave')
  async leaveTournament(
    @Req() req: any,
    @Param('tournamentId') tournamentId: string,
  ) {
    const userId = req.user.sub;
    await this.tournamentService.leaveTournament(tournamentId, userId);
    return { success: true };
  }

  /**
   * POST /api/tournaments/:tournamentId/start
   * Inicia o torneio (apenas criador)
   */
  @Post(':tournamentId/start')
  async startTournament(
    @Req() req: any,
    @Param('tournamentId') tournamentId: string,
  ) {
    const userId = req.user.sub;
    return this.tournamentService.startTournament(tournamentId, userId);
  }

  /**
   * POST /api/tournaments/:tournamentId/finish
   * Finaliza e distribui prêmios
   */
  @Post(':tournamentId/finish')
  async finalizeTournament(@Param('tournamentId') tournamentId: string) {
    const result = await this.tournamentService.finalizeTournament(tournamentId);

    // Desbloqueia troféus para vencedores
    const winners = Object.entries(result.ranking)
      .filter(([, pos]) => pos === 1)
      .map(([userId]) => userId);

    for (const userId of winners) {
      await this.trophyService.awardTrophy(userId, 'tournament_winner');
    }

    return result;
  }

  /**
   * POST /api/tournaments/:tournamentId/matches/:matchId/result
   * Registra resultado de match
   */
  @Post(':tournamentId/matches/:matchId/result')
  async recordMatchResult(
    @Param('matchId') matchId: string,
    @Body() body: { winnerId: string; winningCents: number },
  ) {
    return this.tournamentService.recordMatchResult(
      matchId,
      body.winnerId,
      body.winningCents,
    );
  }

  // ==================== TROPHIES ====================

  /**
   * GET /api/tournaments/trophies/available
   * Lista todos os troféus disponíveis
   */
  @Get('trophies/available')
  getAvailableTrophies() {
    return { trophies: this.trophyService.getAllAvailableTrophies() };
  }

  /**
   * GET /api/tournaments/trophies/my-trophies
   * Meus troféus desbloqueados
   */
  @Get('trophies/my-trophies')
  async getMyTrophies(@Req() req: any) {
    const userId = req.user.sub;
    const trophies = await this.trophyService.getUserTrophies(userId);
    return { trophies };
  }

  /**
   * GET /api/tournaments/trophies/progress
   * Progresso de todos os troféus
   */
  @Get('trophies/progress')
  async getTrophyProgress(@Req() req: any) {
    const userId = req.user.sub;
    const progress = await this.trophyService.getTrophyProgress(userId);
    return { progress };
  }

  /**
   * POST /api/tournaments/trophies/check
   * Verifica e desbloqueia troféus elegíveis
   */
  @Post('trophies/check')
  async checkTrophies(@Req() req: any) {
    const userId = req.user.sub;
    const unlocked = await this.trophyService.checkAndUnlockTrophies(userId);
    return { newTrophies: unlocked };
  }

  /**
   * GET /api/tournaments/trophies/:userId
   * Troféus de outro jogador (público)
   */
  @Get('trophies/:userId')
  async getUserTrophies(@Param('userId') userId: string) {
    const trophies = await this.trophyService.getUserTrophies(userId);
    return { trophies };
  }

  // ==================== LEADERBOARDS ====================

  /**
   * GET /api/tournaments/leaderboard/global
   * Leaderboard geral
   */
  @Get('leaderboard/global')
  async getGlobalLeaderboard(@Query('limit') limit: string = '100') {
    return this.leaderboardService.getGlobalLeaderboard(parseInt(limit));
  }

  /**
   * GET /api/tournaments/leaderboard/weekly
   * Leaderboard semanal
   */
  @Get('leaderboard/weekly')
  async getWeeklyLeaderboard(@Query('limit') limit: string = '50') {
    return this.leaderboardService.getWeeklyLeaderboard(parseInt(limit));
  }

  /**
   * GET /api/tournaments/leaderboard/format/:format
   * Leaderboard por formato
   */
  @Get('leaderboard/format/:format')
  async getFormatLeaderboard(
    @Param('format') format: string,
    @Query('limit') limit: string = '50',
  ) {
    return this.leaderboardService.getFormatLeaderboard(format, parseInt(limit));
  }

  /**
   * GET /api/tournaments/leaderboard/my-position
   * Minha posição
   */
  @Get('leaderboard/my-position')
  async getMyPosition(@Req() req: any) {
    const userId = req.user.sub;
    return this.leaderboardService.getUserLeaderboardPosition(userId);
  }
}

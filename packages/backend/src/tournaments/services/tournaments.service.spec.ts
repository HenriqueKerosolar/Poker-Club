import { describe, it, expect, beforeEach } from '@jest/globals';
import { TournamentService } from './tournament.service';
import { TrophyService } from './trophy.service';
import { LeaderboardService } from './leaderboard.service';

/**
 * Testes de Tournaments
 */
describe('TournamentsServices', () => {
  let tournamentService: TournamentService;
  let trophyService: TrophyService;
  let leaderboardService: LeaderboardService;

  const mockPrisma = {
    tournament: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    tournamentPlayer: {
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    tournamentRound: {
      create: jest.fn(),
    },
    tournamentMatch: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userTrophy: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    game: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    friendship: {
      count: jest.fn(),
    },
  };

  const mockRedis = {
    setJson: jest.fn(),
    getJson: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    tournamentService = new TournamentService(mockPrisma as any, mockRedis as any);
    trophyService = new TrophyService(mockPrisma as any);
    leaderboardService = new LeaderboardService(
      mockPrisma as any,
      mockRedis as any,
    );
    jest.clearAllMocks();
  });

  describe('TournamentService', () => {
    it('cria novo torneio', async () => {
      const tournamentData = {
        name: 'Texas Hold\\'em Championship',
        format: 'single_elimination' as const,
        maxPlayers: 8,
        buyInCents: 10000,
        prizePoolCents: 100000,
        startAt: new Date('2025-07-25'),
      };

      mockPrisma.tournament.create.mockResolvedValue({
        id: 'tournament_1',
        ...tournamentData,
        creatorId: 'user_1',
        status: 'created',
        players: [{ userId: 'user_1', position: 1 }],
      });

      const result = await tournamentService.createTournament('user_1', tournamentData);

      expect(result.name).toBe('Texas Hold\\'em Championship');
      expect(result.status).toBe('created');
    });

    it('valida número de jogadores', async () => {
      expect(() =>
        tournamentService.createTournament('user_1', {
          name: 'Small',
          format: 'single_elimination',
          maxPlayers: 1,
          buyInCents: 1000,
          prizePoolCents: 10000,
          startAt: new Date(),
        }),
      ).rejects.toThrow('2-1024');
    });

    it('entra em um torneio', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 'tournament_1',
        status: 'created',
        maxPlayers: 8,
        players: [{ userId: 'user_1' }],
      });

      mockPrisma.tournamentPlayer.create.mockResolvedValue({
        tournamentId: 'tournament_1',
        userId: 'user_2',
        position: 2,
      });

      const result = await tournamentService.joinTournament(
        'tournament_1',
        'user_2',
      );

      expect(result.position).toBe(2);
    });

    it('inicia torneio (somente criador)', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: 'tournament_1',
        creatorId: 'user_1',
        status: 'created',
        players: [{ userId: 'user_1' }, { userId: 'user_2' }],
      });

      mockPrisma.tournament.update.mockResolvedValue({
        id: 'tournament_1',
        status: 'running',
      });

      const result = await tournamentService.startTournament(
        'tournament_1',
        'user_1',
      );

      expect(result.status).toBe('running');
    });

    it('rejeita início se não é criador', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        creatorId: 'user_1',
        status: 'created',
      });

      expect(() =>
        tournamentService.startTournament('tournament_1', 'user_2'),
      ).rejects.toThrow('criador');
    });

    it('registra resultado de match', async () => {
      mockPrisma.tournamentMatch.findUnique.mockResolvedValue({
        id: 'match_1',
      });

      mockPrisma.tournamentMatch.update.mockResolvedValue({
        id: 'match_1',
        winnerId: 'user_1',
        status: 'completed',
      });

      const result = await tournamentService.recordMatchResult(
        'match_1',
        'user_1',
        50000,
      );

      expect(result.status).toBe('completed');
      expect(result.winnerId).toBe('user_1');
    });
  });

  describe('TrophyService', () => {
    it('lista troféus disponíveis', () => {
      const trophies = trophyService.getAllAvailableTrophies();

      expect(trophies.length).toBeGreaterThan(0);
      expect(trophies[0]).toHaveProperty('id');
      expect(trophies[0]).toHaveProperty('name');
      expect(trophies[0]).toHaveProperty('rarity');
    });

    it('desbloqueia troféu para usuário', async () => {
      mockPrisma.userTrophy.findUnique.mockResolvedValue(null);
      mockPrisma.userTrophy.create.mockResolvedValue({
        userId: 'user_1',
        trophyId: 'first_win',
        unlockedAt: new Date(),
        trophy: { id: 'first_win', name: 'Vencedor' },
      });

      const result = await trophyService.awardTrophy('user_1', 'first_win');

      expect(result.trophyId).toBe('first_win');
    });

    it('não desbloqueia troféu duplicado', async () => {
      const existing = { userId: 'user_1', trophyId: 'first_win' };
      mockPrisma.userTrophy.findUnique.mockResolvedValue(existing);

      const result = await trophyService.awardTrophy('user_1', 'first_win');

      expect(result).toEqual(existing);
      expect(mockPrisma.userTrophy.create).not.toHaveBeenCalled();
    });

    it('verifica e desbloqueia troféus', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      mockPrisma.game.findMany.mockResolvedValue([
        { finalResult: { user_1: 1000 } },
        { finalResult: { user_1: -500 } },
      ]);
      mockPrisma.friendship.count.mockResolvedValue(0);
      mockPrisma.userTrophy.findUnique.mockResolvedValue(null);
      mockPrisma.userTrophy.create.mockResolvedValue({});

      const trophies = await trophyService.checkAndUnlockTrophies('user_1');

      expect(trophies.length).toBeGreaterThan(0);
    });
  });

  describe('LeaderboardService', () => {
    it('retorna leaderboard global', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        {
          players: [{ userId: 'user_1' }, { userId: 'user_2' }],
          finalResult: { user_1: 1000, user_2: -1000 },
          status: 'finished',
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({ username: 'alice' });
      mockRedis.getJson.mockResolvedValue(null);

      const leaderboard = await leaderboardService.getGlobalLeaderboard(10);

      expect(leaderboard).toBeDefined();
    });

    it('retorna posição do usuário', async () => {
      const leaderboard = [
        { rank: 1, userId: 'user_1', winRate: 75 },
        { rank: 2, userId: 'user_2', winRate: 60 },
      ];

      mockRedis.getJson.mockResolvedValue(leaderboard);

      const position = await leaderboardService.getUserLeaderboardPosition('user_1');

      expect(position.rank).toBe(1);
    });

    it('retorna leaderboard semanal', async () => {
      mockPrisma.game.findMany.mockResolvedValue([]);
      mockRedis.getJson.mockResolvedValue(null);

      const leaderboard = await leaderboardService.getWeeklyLeaderboard(10);

      expect(Array.isArray(leaderboard)).toBe(true);
    });

    it('invalida cache de leaderboard', async () => {
      await leaderboardService.invalidateCache();

      expect(mockRedis.delete).toHaveBeenCalledWith('leaderboard:global:*');
    });
  });
});

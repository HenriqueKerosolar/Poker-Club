import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { RedisModule } from '@/redis/redis.module';
import { AuthModule } from '@/auth/auth.module';

// Services
import { TournamentService } from './services/tournament.service';
import { TrophyService } from './services/trophy.service';
import { LeaderboardService } from './services/leaderboard.service';

// Controllers
import { TournamentsController } from './controllers/tournaments.controller';

/**
 * TournamentsModule - Torneios, troféus, leaderboards
 */
@Module({
  imports: [DatabaseModule, RedisModule, AuthModule],
  controllers: [TournamentsController],
  providers: [TournamentService, TrophyService, LeaderboardService],
  exports: [TournamentService, TrophyService, LeaderboardService],
})
export class TournamentsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos de configuração
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

// Módulos de negócio
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { GamesModule } from './games/games.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { SocialModule } from './social/social.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infraestrutura
    DatabaseModule,
    RedisModule,

    // Autenticação
    AuthModule,

    // Módulos de negócio
    UsersModule,
    WalletsModule,
    GamesModule,
    TournamentsModule,
    SocialModule,
    ModerationModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

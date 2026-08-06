import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import { AuthModule } from '../../auth/auth.module';

// Services
import { RoomService } from './services/room.service';
import { GameService } from './services/game.service';

// Gateways
import { RoomGateway } from './gateways/room.gateway';
import { GameGateway } from './gateways/game.gateway';

/**
 * WebSocketModule - Integra salas e partidas em tempo real
 */
@Module({
  imports: [DatabaseModule, RedisModule, AuthModule],
  providers: [
    // Services
    RoomService,
    GameService,

    // Gateways
    RoomGateway,
    GameGateway,
  ],
  exports: [RoomService, GameService],
})
export class WebSocketModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { RedisModule } from '@/redis/redis.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [DatabaseModule, RedisModule, WebSocketModule],
  exports: [WebSocketModule],
})
export class GamesModule {}

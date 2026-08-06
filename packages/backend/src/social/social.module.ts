import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

// Services
import { FriendsService } from './services/friends.service';
import { ChatService } from './services/chat.service';

// Controllers
import { SocialController } from './controllers/social.controller';

// Gateways
import { SocialGateway } from './gateways/social.gateway';

/**
 * SocialModule - Amigos, chat, bloqueios
 */
@Module({
  imports: [DatabaseModule, RedisModule, AuthModule],
  controllers: [SocialController],
  providers: [FriendsService, ChatService, SocialGateway],
  exports: [FriendsService, ChatService],
})
export class SocialModule {}

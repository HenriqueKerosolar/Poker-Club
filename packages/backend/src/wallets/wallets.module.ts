import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

// Services
import { WalletService } from './services/wallet.service';
import { TransactionService } from './services/transaction.service';

// Controllers
import { WalletController } from './controllers/wallet.controller';

/**
 * WalletsModule - Carteira virtual e transações
 */
@Module({
  imports: [DatabaseModule, RedisModule, AuthModule],
  controllers: [WalletController],
  providers: [WalletService, TransactionService],
  exports: [WalletService, TransactionService],
})
export class WalletsModule {}

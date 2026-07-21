import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { WalletService } from '../services/wallet.service';

/**
 * WalletController - Expõe endpoints de carteira
 */
@Controller('api/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  private logger = new Logger('WalletController');

  constructor(private walletService: WalletService) {}

  /**
   * GET /api/wallet
   * Retorna resumo da carteira do usuário
   */
  @Get()
  async getWallet(@Req() req: any) {
    const userId = req.user.sub;
    return this.walletService.getWalletSummary(userId);
  }

  /**
   * GET /api/wallet/statement
   * Retorna extrato (últimas transações)
   */
  @Get('statement')
  async getStatement(@Req() req: any) {
    const userId = req.user.sub;
    return this.walletService.getStatement(userId, 50);
  }

  /**
   * GET /api/wallet/recovery-time
   * Retorna tempo até próximo bônus de recuperação
   */
  @Get('recovery-time')
  async getRecoveryTime(@Req() req: any) {
    const userId = req.user.sub;
    const seconds = await this.walletService.getTimeUntilNextRecoveryCredit(userId);
    return {
      secondsUntilEligible: seconds,
      hoursUntilEligible: Math.ceil(seconds / 3600),
      formatted: this.formatTime(seconds),
    };
  }

  /**
   * POST /api/wallet/deposit-to-stock
   * Guarda fichas no estoque
   */
  @Post('deposit-to-stock')
  async depositToStock(
    @Req() req: any,
    @Body() body: { amountCents: number },
  ) {
    const userId = req.user.sub;
    const { amountCents } = body;

    if (!amountCents || amountCents <= 0) {
      throw new Error('Invalid amount');
    }

    return this.walletService.depositToStock(userId, amountCents);
  }

  /**
   * POST /api/wallet/withdraw-from-stock
   * Retira fichas do estoque
   */
  @Post('withdraw-from-stock')
  async withdrawFromStock(
    @Req() req: any,
    @Body() body: { amountCents: number },
  ) {
    const userId = req.user.sub;
    const { amountCents } = body;

    if (!amountCents || amountCents <= 0) {
      throw new Error('Invalid amount');
    }

    return this.walletService.withdrawFromStock(userId, amountCents);
  }

  /**
   * POST /api/wallet/claim-recovery-credit
   * Solicita bônus de recuperação (se elegível)
   */
  @Post('claim-recovery-credit')
  async claimRecoveryCredit(@Req() req: any) {
    const userId = req.user.sub;
    const result = await this.walletService.checkAndApplyRecoveryCredit(userId);

    if (!result) {
      return {
        success: false,
        message: 'Not eligible for recovery credit',
        timeUntilEligible: await this.walletService.getTimeUntilNextRecoveryCredit(userId),
      };
    }

    return {
      success: true,
      message: 'Recovery credit applied',
      transaction: result.transaction,
      wallet: result.wallet,
    };
  }

  /**
   * Formata tempo em "Xh Ym"
   */
  private formatTime(seconds: number): string {
    if (seconds === 0) return 'Now';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }
}

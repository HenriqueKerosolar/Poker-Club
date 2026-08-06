import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PixService } from '../services/pix.service';

/**
 * PixController - Pagamentos via Pix
 */
@Controller('api/payment/pix')
@UseGuards(JwtAuthGuard)
export class PixController {
  private logger = new Logger('PixController');

  constructor(private pixService: PixService) {}

  /**
   * POST /api/payment/pix/deposit
   * Inicia depósito via Pix
   */
  @Post('deposit')
  async initiateDeposit(
    @Req() req: any,
    @Body() body: { amountCents: number },
  ) {
    const userId = req.user.sub;
    return this.pixService.initiateDeposit(userId, body.amountCents);
  }

  /**
   * POST /api/payment/pix/withdraw
   * Inicia saque via Pix
   */
  @Post('withdraw')
  async initiateWithdrawal(
    @Req() req: any,
    @Body() body: { amountCents: number; pixKey: string },
  ) {
    const userId = req.user.sub;
    return this.pixService.initiateWithdrawal(
      userId,
      body.amountCents,
      body.pixKey,
    );
  }

  /**
   * GET /api/payment/pix/status/:transactionId
   * Status da transação
   */
  @Get('status/:transactionId')
  async getStatus(@Param('transactionId') transactionId: string) {
    return this.pixService.getTransactionStatus(transactionId);
  }

  /**
   * GET /api/payment/pix/history
   * Histórico de transações
   */
  @Get('history')
  async getHistory(@Req() req: any) {
    const userId = req.user.sub;
    return this.pixService.getUserTransactions(userId);
  }

  /**
   * POST /api/payment/pix/webhook
   * Webhook do PSP confirmando pagamento
   */
  @Post('webhook')
  async handleWebhook(@Body() body: { transactionId: string; status: string }) {
    if (body.status === 'completed') {
      await this.pixService.confirmDeposit(body.transactionId);
    }
    return { success: true };
  }
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransactionType } from '../../shared/types/wallet';
import { WalletService } from './wallet.service';

/**
 * TransactionService - Operações complexas entre carteiras
 * Presentes, empréstimos, patrocínios
 */
@Injectable()
export class TransactionService {
  private logger = new Logger('TransactionService');

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  /**
   * Envia presente (gift) de um jogador para outro
   * Transação unidirecional, sem retorno obrigatório
   */
  async sendGift(
    senderId: string,
    recipientId: string,
    amountCents: number,
    message?: string,
  ): Promise<any> {
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot send gift to yourself');
    }

    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (amountCents > 100000) { // R$ 1.000 máximo
      throw new BadRequestException('Amount exceeds maximum (R$ 1.000)');
    }

    // Verifica saldo do remetente
    const senderWallet = await this.walletService.getWallet(senderId);
    if (!senderWallet || senderWallet.balanceCents < amountCents) {
      throw new BadRequestException('Insufficient balance');
    }

    // Transação ACID
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Débita do remetente
      await tx.virtualWalletTransaction.create({
        data: {
          walletId: senderWallet.id,
          userId: senderId,
          type: TransactionType.GIFT_SENT,
          description: `Gift to ${recipientId}: ${message || ''}`,
          amountCents: -amountCents,
          balanceBeforeCents: senderWallet.balanceCents,
          balanceAfterCents: senderWallet.balanceCents - amountCents,
          referenceId: recipientId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: senderWallet.id },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      // 2. Credita ao destinatário
      const recipientWallet = await tx.virtualWallet.findUnique({
        where: { userId: recipientId },
      });

      if (!recipientWallet) {
        throw new BadRequestException('Recipient wallet not found');
      }

      await tx.virtualWalletTransaction.create({
        data: {
          walletId: recipientWallet.id,
          userId: recipientId,
          type: TransactionType.GIFT_RECEIVED,
          description: `Gift from ${senderId}: ${message || ''}`,
          amountCents,
          balanceBeforeCents: recipientWallet.balanceCents,
          balanceAfterCents: recipientWallet.balanceCents + amountCents,
          referenceId: senderId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: recipientWallet.id },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });

      return { success: true };
    });

    this.logger.log(
      `Gift: ${senderId} → ${recipientId} ${amountCents} cents`,
    );

    return result;
  }

  /**
   * Solicitação de empréstimo
   * Empréstimo virtual, sem juros, apenas para rastreamento
   */
  async requestLoan(
    borrowerId: string,
    lenderId: string,
    amountCents: number,
    message?: string,
  ): Promise<any> {
    if (borrowerId === lenderId) {
      throw new BadRequestException('Cannot borrow from yourself');
    }

    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Verifica saldo do credor
    const lenderWallet = await this.walletService.getWallet(lenderId);
    if (!lenderWallet || lenderWallet.balanceCents < amountCents) {
      throw new BadRequestException('Lender has insufficient balance');
    }

    // Transação ACID
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Débita do credor
      await tx.virtualWalletTransaction.create({
        data: {
          walletId: lenderWallet.id,
          userId: lenderId,
          type: TransactionType.LOAN_SENT,
          description: `Loan to ${borrowerId}: ${message || ''}`,
          amountCents: -amountCents,
          balanceBeforeCents: lenderWallet.balanceCents,
          balanceAfterCents: lenderWallet.balanceCents - amountCents,
          referenceId: borrowerId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: lenderWallet.id },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      // 2. Credita ao devedor
      const borrowerWallet = await tx.virtualWallet.findUnique({
        where: { userId: borrowerId },
      });

      if (!borrowerWallet) {
        throw new BadRequestException('Borrower wallet not found');
      }

      await tx.virtualWalletTransaction.create({
        data: {
          walletId: borrowerWallet.id,
          userId: borrowerId,
          type: TransactionType.LOAN_RECEIVED,
          description: `Loan from ${lenderId}: ${message || ''}`,
          amountCents,
          balanceBeforeCents: borrowerWallet.balanceCents,
          balanceAfterCents: borrowerWallet.balanceCents + amountCents,
          referenceId: lenderId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: borrowerWallet.id },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });

      // 3. Cria registro de empréstimo
      const loan = await tx.playerLoan.create({
        data: {
          lenderId,
          borrowerId,
          amountCents,
          status: 'active',
        } as any,
      });

      return { loan, success: true };
    });

    this.logger.log(
      `Loan: ${lenderId} → ${borrowerId} ${amountCents} cents`,
    );

    return result;
  }

  /**
   * Devolve parte do empréstimo
   */
  async repayLoan(
    borrowerId: string,
    lenderId: string,
    amountCents: number,
  ): Promise<any> {
    // Verifica saldo do devedor
    const borrowerWallet = await this.walletService.getWallet(borrowerId);
    if (!borrowerWallet || borrowerWallet.balanceCents < amountCents) {
      throw new BadRequestException('Insufficient balance to repay');
    }

    // Transação ACID
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Débita do devedor
      await tx.virtualWalletTransaction.create({
        data: {
          walletId: borrowerWallet.id,
          userId: borrowerId,
          type: TransactionType.LOAN_SENT, // Repagamento é como enviar fichas
          description: `Repay loan to ${lenderId}`,
          amountCents: -amountCents,
          balanceBeforeCents: borrowerWallet.balanceCents,
          balanceAfterCents: borrowerWallet.balanceCents - amountCents,
          referenceId: lenderId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: borrowerWallet.id },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      // 2. Credita ao credor
      const lenderWallet = await tx.virtualWallet.findUnique({
        where: { userId: lenderId },
      });

      if (!lenderWallet) {
        throw new BadRequestException('Lender wallet not found');
      }

      await tx.virtualWalletTransaction.create({
        data: {
          walletId: lenderWallet.id,
          userId: lenderId,
          type: TransactionType.LOAN_RECEIVED,
          description: `Loan repayment from ${borrowerId}`,
          amountCents,
          balanceBeforeCents: lenderWallet.balanceCents,
          balanceAfterCents: lenderWallet.balanceCents + amountCents,
          referenceId: borrowerId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: lenderWallet.id },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });

      return { success: true };
    });

    this.logger.log(
      `Loan repayment: ${borrowerId} → ${lenderId} ${amountCents} cents`,
    );

    return result;
  }

  /**
   * Cancela um empréstimo (devolve o crédito ao credor)
   */
  async cancelLoan(
    borrowerId: string,
    lenderId: string,
  ): Promise<any> {
    // Busca empréstimo ativo
    const loan = await this.prisma.playerLoan.findFirst({
      where: {
        lenderId,
        borrowerId,
        status: 'active',
      },
    });

    if (!loan) {
      throw new BadRequestException('No active loan found');
    }

    // Devolve como reembolso
    const result = await this.prisma.$transaction(async (tx) => {
      const borrowerWallet = await tx.virtualWallet.findUnique({
        where: { userId: borrowerId },
      });

      // 1. Débita do devedor
      await tx.virtualWalletTransaction.create({
        data: {
          walletId: borrowerWallet.id,
          userId: borrowerId,
          type: TransactionType.REVERSAL,
          description: `Loan cancelled - refund to ${lenderId}`,
          amountCents: -loan.amountCents,
          balanceBeforeCents: borrowerWallet.balanceCents,
          balanceAfterCents: borrowerWallet.balanceCents - loan.amountCents,
          referenceId: lenderId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: borrowerWallet.id },
        data: {
          balanceCents: {
            decrement: loan.amountCents,
          },
        },
      });

      // 2. Credita ao credor
      const lenderWallet = await tx.virtualWallet.findUnique({
        where: { userId: lenderId },
      });

      await tx.virtualWalletTransaction.create({
        data: {
          walletId: lenderWallet.id,
          userId: lenderId,
          type: TransactionType.REVERSAL,
          description: `Loan cancelled - refund from ${borrowerId}`,
          amountCents: loan.amountCents,
          balanceBeforeCents: lenderWallet.balanceCents,
          balanceAfterCents: lenderWallet.balanceCents + loan.amountCents,
          referenceId: borrowerId,
        } as any,
      });

      await tx.virtualWallet.update({
        where: { id: lenderWallet.id },
        data: {
          balanceCents: {
            increment: loan.amountCents,
          },
        },
      });

      // 3. Marca empréstimo como cancelado
      await tx.playerLoan.update({
        where: { id: loan.id },
        data: {
          status: 'cancelled',
        },
      });

      return { success: true, refundAmount: loan.amountCents };
    });

    this.logger.log(
      `Loan cancelled: ${lenderId} → ${borrowerId} (refund ${loan.amountCents})`,
    );

    return result;
  }
}

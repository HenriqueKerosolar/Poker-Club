import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * PixService - Integração com Pix (pagamentos virtuais)
 * Suporta: depósito, saque, transferência
 */
@Injectable()
export class PixService {
  private logger = new Logger('PixService');
  private readonly MIN_DEPOSIT = 1000; // R$ 10
  private readonly MAX_DEPOSIT = 1000000; // R$ 10.000
  private readonly MAX_DAILY_DEPOSIT = 5000000; // R$ 50.000

  constructor(private prisma: PrismaService) {}

  /**
   * Inicia depósito via Pix
   * Retorna QR Code para o usuário escanear
   */
  async initiateDeposit(
    userId: string,
    amountCents: number,
  ): Promise<{
    transactionId: string;
    qrCode: string;
    amount: number;
    expiresAt: Date;
  }> {
    if (amountCents < this.MIN_DEPOSIT || amountCents > this.MAX_DEPOSIT) {
      throw new BadRequestException(
        `Depósito deve estar entre R$ 10 e R$ 10.000`,
      );
    }

    // Verifica limite diário
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDeposits = await this.prisma.pixTransaction.aggregate({
      where: {
        userId,
        type: 'deposit',
        status: { in: ['completed', 'pending'] },
        createdAt: { gte: today },
      },
      _sum: { amountCents: true },
    });

    const dailyTotal = (todayDeposits._sum.amountCents || 0) + amountCents;
    if (dailyTotal > this.MAX_DAILY_DEPOSIT) {
      throw new BadRequestException('Limite diário de depósito excedido');
    }

    // Cria transação Pix
    const transaction = await this.prisma.pixTransaction.create({
      data: {
        userId,
        type: 'deposit',
        amountCents,
        status: 'pending',
        pixKey: this.generatePixKey(), // Key fictícia para demo
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      },
    });

    // Gera QR Code (simulado para demo)
    const qrCode = this.generateQRCode(transaction.id, amountCents);

    this.logger.log(`Depósito iniciado: ${userId} - R$ ${(amountCents / 100).toFixed(2)}`);

    return {
      transactionId: transaction.id,
      qrCode,
      amount: amountCents / 100,
      expiresAt: transaction.expiresAt,
    };
  }

  /**
   * Confirma depósito (webhook do PSP)
   */
  async confirmDeposit(transactionId: string): Promise<void> {
    const transaction = await this.prisma.pixTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new BadRequestException('Transação não encontrada');
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestException('Transação já foi processada');
    }

    // Atualiza transação
    await this.prisma.pixTransaction.update({
      where: { id: transactionId },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Credita wallet do usuário
    const wallet = await this.prisma.virtualWallet.findUnique({
      where: { userId: transaction.userId },
    });

    if (wallet) {
      await this.prisma.virtualWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: { increment: transaction.amountCents },
        },
      });

      // Registra no ledger
      await this.prisma.virtualWalletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: transaction.userId,
          type: 'deposit',
          description: `Depósito via Pix - ${transaction.pixKey}`,
          amountCents: transaction.amountCents,
          balanceBeforeCents: wallet.balanceCents,
          balanceAfterCents: wallet.balanceCents + transaction.amountCents,
          referenceId: transactionId,
        } as any,
      });
    }

    this.logger.log(
      `Depósito confirmado: ${transaction.userId} - R$ ${(transaction.amountCents / 100).toFixed(2)}`,
    );
  }

  /**
   * Inicia saque via Pix
   */
  async initiateWithdrawal(
    userId: string,
    amountCents: number,
    pixKey: string,
  ): Promise<{
    transactionId: string;
    status: string;
    estimatedTime: string;
  }> {
    if (amountCents < this.MIN_DEPOSIT || amountCents > this.MAX_DEPOSIT) {
      throw new BadRequestException(
        `Saque deve estar entre R$ 10 e R$ 10.000`,
      );
    }

    // Verifica saldo
    const wallet = await this.prisma.virtualWallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balanceCents < amountCents) {
      throw new BadRequestException('Saldo insuficiente');
    }

    // Cria transação de saque
    const transaction = await this.prisma.pixTransaction.create({
      data: {
        userId,
        type: 'withdrawal',
        amountCents,
        status: 'pending',
        pixKey,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
      },
    });

    // Debita wallet imediatamente (reservado)
    await this.prisma.virtualWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: { decrement: amountCents },
      },
    });

    this.logger.log(
      `Saque iniciado: ${userId} - R$ ${(amountCents / 100).toFixed(2)}`,
    );

    return {
      transactionId: transaction.id,
      status: 'pending',
      estimatedTime: '1-2 minutos',
    };
  }

  /**
   * Geradores de chaves/QR Code (simulado para demo)
   */
  private generatePixKey(): string {
    return `pix_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateQRCode(transactionId: string, amountCents: number): string {
    // Em produção, usaria biblioteca para gerar QR Code real
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  /**
   * Verifica status de transação
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    const transaction = await this.prisma.pixTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new BadRequestException('Transação não encontrada');
    }

    return {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amountCents / 100,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  /**
   * Lista transações do usuário
   */
  async getUserTransactions(userId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.pixTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        amountCents: true,
        pixKey: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }
}

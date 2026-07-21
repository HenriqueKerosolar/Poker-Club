import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { TransactionType, INITIAL_BALANCE_CENTS, RECOVERY_BALANCE_CENTS, RECOVERY_COOLDOWN_HOURS } from '@shared/types/wallet';
import { generateId } from '@shared/utils';

/**
 * WalletService - Gerencia saldo virtual do jogador
 * CRÍTICO: Ledger imutável, transações ACID, sem saldo negativo
 */
@Injectable()
export class WalletService {
  private logger = new Logger('WalletService');
  private walletKeyPrefix = 'wallet:';
  private lastRecoveryCreditKeyPrefix = 'last_recovery:';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Cria carteira inicial para novo usuário
   * Crédito inicial: R$ 100,00 virtuais
   */
  async createWallet(userId: string): Promise<any> {
    // Verifica se já existe
    const existing = await this.prisma.virtualWallet.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Wallet already exists');
    }

    // Cria carteira
    const wallet = await this.prisma.virtualWallet.create({
      data: {
        userId,
        balanceCents: INITIAL_BALANCE_CENTS,
        stockCents: 0,
        reservedCents: 0,
      },
    });

    // Registra crédito inicial no ledger
    await this.prisma.virtualWalletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: TransactionType.CREDIT_INITIAL,
        description: 'Welcome bonus',
        amountCents: INITIAL_BALANCE_CENTS,
        balanceBeforeCents: 0,
        balanceAfterCents: INITIAL_BALANCE_CENTS,
      } as any,
    });

    // Cache em Redis
    await this.redis.setJson(
      `${this.walletKeyPrefix}${userId}`,
      wallet,
      86400, // 24 horas
    );

    this.logger.log(`Wallet created for user ${userId}, initial balance: ${INITIAL_BALANCE_CENTS} cents`);
    return wallet;
  }

  /**
   * Busca carteira (cache-first)
   */
  async getWallet(userId: string): Promise<any> {
    // Tenta Redis primeiro
    let wallet = await this.redis.getJson(`${this.walletKeyPrefix}${userId}`);

    if (wallet) {
      return wallet;
    }

    // Busca no DB
    wallet = await this.prisma.virtualWallet.findUnique({
      where: { userId },
    });

    if (wallet) {
      // Salva em Redis
      await this.redis.setJson(`${this.walletKeyPrefix}${userId}`, wallet, 86400);
    }

    return wallet;
  }

  /**
   * Obtém saldo disponível (sem reservas)
   */
  async getAvailableBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return 0;

    return Math.max(0, wallet.balanceCents - wallet.reservedCents);
  }

  /**
   * Registra transação (ledger imutável)
   * NUNCA modifica saldo diretamente - apenas cria registro
   */
  async recordTransaction(
    userId: string,
    type: TransactionType,
    description: string,
    amountCents: number, // positivo = crédito, negativo = débito
    referenceId?: string,
    gameId?: string,
  ): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const balanceBefore = wallet.balanceCents;
    const balanceAfter = balanceBefore + amountCents;

    // Validação: não permitir saldo negativo
    if (balanceAfter < 0) {
      throw new BadRequestException('Insufficient balance');
    }

    // Transação ACID no banco
    const transaction = await this.prisma.$transaction(async (tx) => {
      // 1. Registra transação no ledger (imutável)
      const txRecord = await tx.virtualWalletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type,
          description,
          amountCents,
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceAfter,
          gameId,
          referenceId,
        } as any,
      });

      // 2. Atualiza saldo na carteira
      const updatedWallet = await tx.virtualWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: balanceAfter,
        },
      });

      return { transaction: txRecord, wallet: updatedWallet };
    });

    // Invalida cache (vai ser recarregado)
    await this.redis.delete(`${this.walletKeyPrefix}${userId}`);

    this.logger.log(
      `Transaction recorded: ${userId} ${type} ${amountCents} cents (${description})`,
    );

    return transaction;
  }

  /**
   * Obtém extrato (últimas N transações)
   */
  async getStatement(userId: string, limit: number = 50): Promise<any[]> {
    const transactions = await this.prisma.virtualWalletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  }

  /**
   * Guarda fichas no estoque
   */
  async depositToStock(userId: string, amountCents: number): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (amountCents > wallet.balanceCents) {
      throw new BadRequestException('Insufficient balance');
    }

    // Transação ACID
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Registra no ledger
      const txRecord = await tx.virtualWalletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: TransactionType.STOCK_DEPOSIT,
          description: 'Deposit to stock',
          amountCents: -amountCents,
          balanceBeforeCents: wallet.balanceCents,
          balanceAfterCents: wallet.balanceCents - amountCents,
        } as any,
      });

      // 2. Atualiza carteira
      const updatedWallet = await tx.virtualWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
          stockCents: {
            increment: amountCents,
          },
        },
      });

      return { transaction: txRecord, wallet: updatedWallet };
    });

    await this.redis.delete(`${this.walletKeyPrefix}${userId}`);
    this.logger.log(`Stock deposit: ${userId} ${amountCents} cents`);

    return result;
  }

  /**
   * Retira fichas do estoque
   */
  async withdrawFromStock(userId: string, amountCents: number): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (amountCents > wallet.stockCents) {
      throw new BadRequestException('Insufficient stock');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const txRecord = await tx.virtualWalletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: TransactionType.STOCK_WITHDRAWAL,
          description: 'Withdraw from stock',
          amountCents,
          balanceBeforeCents: wallet.balanceCents,
          balanceAfterCents: wallet.balanceCents + amountCents,
        } as any,
      });

      const updatedWallet = await tx.virtualWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: {
            increment: amountCents,
          },
          stockCents: {
            decrement: amountCents,
          },
        },
      });

      return { transaction: txRecord, wallet: updatedWallet };
    });

    await this.redis.delete(`${this.walletKeyPrefix}${userId}`);
    this.logger.log(`Stock withdrawal: ${userId} ${amountCents} cents`);

    return result;
  }

  /**
   * Aplica resultado de partida
   * Crédita ganho ou debita perda
   */
  async applyGameResult(
    userId: string,
    resultCents: number,
    gameId: string,
  ): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const type = resultCents > 0
      ? TransactionType.GAME_RESULT
      : TransactionType.GAME_RESULT;

    const description = resultCents > 0
      ? `Game win +${resultCents} cents`
      : `Game loss ${resultCents} cents`;

    return this.recordTransaction(
      userId,
      type,
      description,
      resultCents,
      gameId,
      gameId,
    );
  }

  /**
   * Verifica e aplica bônus de recuperação (24h)
   * R$ 100,00 virtual quando saldo = 0
   */
  async checkAndApplyRecoveryCredit(userId: string): Promise<any | null> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    // Se saldo > 0, não recebe bônus
    if (wallet.balanceCents > 0 && wallet.stockCents > 0) {
      return null;
    }

    // Verifica último crédito
    const lastCredit = await this.redis.get(
      `${this.lastRecoveryCreditKeyPrefix}${userId}`,
    );

    if (lastCredit) {
      const lastTime = parseInt(lastCredit);
      const now = Date.now();
      const hours = (now - lastTime) / (1000 * 60 * 60);

      if (hours < RECOVERY_COOLDOWN_HOURS) {
        return null; // Ainda em cooldown
      }
    }

    // Aplica bônus
    const result = await this.recordTransaction(
      userId,
      TransactionType.RECOVERY_CREDIT,
      'Daily recovery bonus',
      RECOVERY_BALANCE_CENTS,
    );

    // Registra tempo do bônus
    await this.redis.set(
      `${this.lastRecoveryCreditKeyPrefix}${userId}`,
      Date.now().toString(),
      RECOVERY_COOLDOWN_HOURS * 3600,
    );

    this.logger.log(`Recovery credit applied to ${userId}`);
    return result;
  }

  /**
   * Retorna tempo até próximo bônus de recuperação
   */
  async getTimeUntilNextRecoveryCredit(userId: string): Promise<number> {
    const lastCredit = await this.redis.get(
      `${this.lastRecoveryCreditKeyPrefix}${userId}`,
    );

    if (!lastCredit) {
      return 0; // Elegível agora
    }

    const lastTime = parseInt(lastCredit);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastTime) / 1000);
    const cooldownSeconds = RECOVERY_COOLDOWN_HOURS * 3600;
    const remainingSeconds = Math.max(0, cooldownSeconds - elapsedSeconds);

    return remainingSeconds;
  }

  /**
   * Reserva saldo para partida
   */
  async reserveBalance(userId: string, amountCents: number): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const available = Math.max(0, wallet.balanceCents - wallet.reservedCents);
    if (amountCents > available) {
      throw new BadRequestException('Insufficient balance to reserve');
    }

    // Atualiza em Redis e DB
    const updated = await this.prisma.virtualWallet.update({
      where: { id: wallet.id },
      data: {
        reservedCents: {
          increment: amountCents,
        },
      },
    });

    await this.redis.setJson(`${this.walletKeyPrefix}${userId}`, updated, 86400);

    return updated;
  }

  /**
   * Libera reserva (e.g., quando partida termina)
   */
  async releaseReserve(userId: string, amountCents: number): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (amountCents > wallet.reservedCents) {
      throw new BadRequestException('Cannot release more than reserved');
    }

    const updated = await this.prisma.virtualWallet.update({
      where: { id: wallet.id },
      data: {
        reservedCents: {
          decrement: amountCents,
        },
      },
    });

    await this.redis.setJson(`${this.walletKeyPrefix}${userId}`, updated, 86400);

    return updated;
  }

  /**
   * Retorna resumo da carteira
   */
  async getWalletSummary(userId: string): Promise<any> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const available = Math.max(0, wallet.balanceCents - wallet.reservedCents);
    const timeUntilRecovery = await this.getTimeUntilNextRecoveryCredit(userId);

    return {
      userId,
      balance: wallet.balanceCents,
      stock: wallet.stockCents,
      reserved: wallet.reservedCents,
      available,
      total: wallet.balanceCents + wallet.stockCents,
      timeUntilRecoveryCreditSeconds: timeUntilRecovery,
    };
  }
}

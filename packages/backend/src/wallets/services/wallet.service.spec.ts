import { describe, it, expect, beforeEach } from '@jest/globals';
import { WalletService } from './wallet.service';

/**
 * Testes do WalletService
 * CRÍTICO: Ledger imutável, transações ACID, sem saldo negativo
 */
describe('WalletService', () => {
  let service: WalletService;

  // Mock Prisma e Redis (em produção usar testcontainers)
  const mockPrisma = {
    virtualWallet: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    virtualWalletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockRedis = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    service = new WalletService(mockPrisma as any, mockRedis as any);
    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('cria carteira com saldo inicial R$ 100,00', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        userId,
        balanceCents: 10000, // R$ 100,00
        stockCents: 0,
        reservedCents: 0,
      };

      mockPrisma.virtualWallet.findUnique.mockResolvedValue(null);
      mockPrisma.virtualWallet.create.mockResolvedValue(wallet);
      mockPrisma.virtualWalletTransaction.create.mockResolvedValue({});

      const result = await service.createWallet(userId);

      expect(result).toEqual(wallet);
      expect(mockPrisma.virtualWallet.create).toHaveBeenCalledWith({
        data: {
          userId,
          balanceCents: 10000,
          stockCents: 0,
          reservedCents: 0,
        },
      });
    });

    it('rejeita criar carteira duplicada', async () => {
      const userId = 'user_123';
      mockPrisma.virtualWallet.findUnique.mockResolvedValue({
        id: 'wallet_123',
        userId,
        balanceCents: 10000,
      });

      expect(service.createWallet(userId)).rejects.toThrow('already exists');
    });
  });

  describe('recordTransaction', () => {
    it('registra transação com amount positivo (crédito)', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        balanceCents: 10000,
        stockCents: 0,
        reservedCents: 0,
      };

      mockPrisma.virtualWallet.findUnique.mockResolvedValue(wallet);
      mockRedis.getJson.mockResolvedValue(wallet);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const mockTx = {
          virtualWalletTransaction: {
            create: jest.fn().mockResolvedValue({
              id: 'tx_123',
              amountCents: 5000,
            }),
          },
          virtualWallet: {
            update: jest.fn().mockResolvedValue({
              ...wallet,
              balanceCents: 15000,
            }),
          },
        };
        return cb(mockTx);
      });

      const result = await service.recordTransaction(
        userId,
        'game_result' as any,
        'Game win',
        5000,
      );

      expect(result.wallet.balanceCents).toBe(15000);
    });

    it('rejeita amount que causaria saldo negativo', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        balanceCents: 1000,
        stockCents: 0,
        reservedCents: 0,
      };

      mockRedis.getJson.mockResolvedValue(wallet);

      expect(
        service.recordTransaction(
          userId,
          'game_result' as any,
          'Loss',
          5000, // Maior que saldo
        ),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('depositToStock', () => {
    it('transfere fichas do saldo para estoque', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        balanceCents: 10000,
        stockCents: 0,
        reservedCents: 0,
      };

      mockRedis.getJson.mockResolvedValue(wallet);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const mockTx = {
          virtualWalletTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
          virtualWallet: {
            update: jest.fn().mockResolvedValue({
              ...wallet,
              balanceCents: 5000,
              stockCents: 5000,
            }),
          },
        };
        return cb(mockTx);
      });

      const result = await service.depositToStock(userId, 5000);

      expect(result.wallet.balanceCents).toBe(5000);
      expect(result.wallet.stockCents).toBe(5000);
    });

    it('rejeita depósito maior que saldo disponível', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        balanceCents: 2000,
        stockCents: 0,
        reservedCents: 0,
      };

      mockRedis.getJson.mockResolvedValue(wallet);

      expect(
        service.depositToStock(userId, 5000),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('withdrawFromStock', () => {
    it('transfere fichas do estoque para saldo', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        balanceCents: 5000,
        stockCents: 5000,
        reservedCents: 0,
      };

      mockRedis.getJson.mockResolvedValue(wallet);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const mockTx = {
          virtualWalletTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
          virtualWallet: {
            update: jest.fn().mockResolvedValue({
              ...wallet,
              balanceCents: 10000,
              stockCents: 0,
            }),
          },
        };
        return cb(mockTx);
      });

      const result = await service.withdrawFromStock(userId, 5000);

      expect(result.wallet.balanceCents).toBe(10000);
      expect(result.wallet.stockCents).toBe(0);
    });
  });

  describe('getWalletSummary', () => {
    it('retorna resumo completo da carteira', async () => {
      const userId = 'user_123';
      const wallet = {
        id: 'wallet_123',
        balanceCents: 10000,
        stockCents: 5000,
        reservedCents: 2000,
      };

      mockRedis.getJson.mockResolvedValue(wallet);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getWalletSummary(userId);

      expect(result).toMatchObject({
        balance: 10000,
        stock: 5000,
        reserved: 2000,
        available: 8000, // 10000 - 2000
        total: 15000, // 10000 + 5000
      });
    });
  });

  describe('recovery credit', () => {
    it('retorna 0 se nenhum crédito de recuperação foi aplicado', async () => {
      const userId = 'user_123';
      mockRedis.get.mockResolvedValue(null);

      const time = await service.getTimeUntilNextRecoveryCredit(userId);
      expect(time).toBe(0);
    });

    it('retorna tempo até próximo crédito se em cooldown', async () => {
      const userId = 'user_123';
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      mockRedis.get.mockResolvedValue(oneHourAgo.toString());

      const time = await service.getTimeUntilNextRecoveryCredit(userId);
      expect(time).toBeGreaterThan(3600 * 23); // 23+ horas restantes
      expect(time).toBeLessThan(3600 * 24); // menos de 24 horas
    });
  });
});

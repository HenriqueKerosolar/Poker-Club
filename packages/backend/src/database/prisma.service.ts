import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger('PrismaService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Conectado ao banco de dados PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('❌ Desconectado do banco de dados');
  }

  /**
   * Trata erros Prisma de forma legível
   */
  async handlePrismaError(error: any) {
    this.logger.error('Erro Prisma:', error);

    if (error.code === 'P2025') {
      throw new Error('Recurso não encontrado');
    }
    if (error.code === 'P2002') {
      throw new Error('Violação de constraint único');
    }

    throw error;
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Configurações globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://pokerclub.app']
      : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:8081'],
    credentials: true,
  });

  const port = process.env.BACKEND_PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`🎰 Poker Club Backend iniciado em http://localhost:${port}`);
  logger.log(`📚 Docs disponíveis em http://localhost:${port}/api`);
}

bootstrap().catch(err => {
  console.error('Erro ao iniciar aplicação:', err);
  process.exit(1);
});

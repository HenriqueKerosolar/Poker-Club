import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GameService } from '../services/game.service';
import { PlayerAction } from '../../../shared/types/poker';

/**
 * GameGateway - WebSocket para partidas ativas
 * Gerencia ações dos jogadores, sincronização, eventos
 */
@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://pokerclub.app']
      : ['http://localhost:3001', 'http://localhost:8081'],
    credentials: true,
  },
  namespace: '/games',
})
@Injectable()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('GameGateway');
  private playerTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private jwt: JwtService,
    private gameService: GameService,
  ) {}

  /**
   * Autentica socket
   */
  private extractUserFromSocket(socket: Socket): { userId: string } {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decoded = this.jwt.verify(token);
      return { userId: decoded.sub };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Jogador conectou à partida
   */
  async handleConnection(socket: Socket) {
    try {
      const { userId } = this.extractUserFromSocket(socket);
      const gameState = await this.gameService.getPlayerGame(userId);

      if (!gameState) {
        socket.disconnect();
        return;
      }

      socket.data.userId = userId;
      socket.data.gameId = gameState.id;
      socket.join(gameState.id);

      // Envia estado atual do jogo
      const safeGameState = this.sanitizeGameState(gameState, userId);
      socket.emit('game:state', safeGameState);

      // Notifica outros jogadores
      this.server.to(gameState.id).emit('game:playerJoined', {
        userId,
        gameId: gameState.id,
      });

      this.logger.log(`User ${userId} connected to game ${gameState.id}`);

      // Inicia timeout para ação (30 segundos)
      this.setActionTimeout(gameState.id, gameState.players[gameState.currentPlayerIndex].id);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  /**
   * Jogador desconectou
   */
  async handleDisconnect(socket: Socket) {
    const { userId, gameId } = socket.data;
    if (!gameId) return;

    // Notifica
    this.server.to(gameId).emit('game:playerDisconnected', {
      userId,
      gameId,
    });

    this.logger.log(`User ${userId} disconnected from game ${gameId}`);
  }

  /**
   * Processa ação do jogador
   */
  @SubscribeMessage('game:action')
  async onPlayerAction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { action: PlayerAction; amountCents?: number },
  ) {
    try {
      const { userId, gameId } = socket.data;

      const result = await this.gameService.processPlayerAction(
        gameId,
        userId,
        payload.action,
        payload.amountCents || 0,
      );

      if (!result.success) {
        socket.emit('error', result.error);
        return;
      }

      const gameState = result.gameState;

      // Emite ação para toda a sala
      this.server.to(gameId).emit('game:actionProcessed', {
        playerId: userId,
        action: payload.action,
        amount: payload.amountCents || 0,
        potSize: gameState.totalPotCents,
        gameState: this.sanitizeGameState(gameState, userId),
      });

      // Limpa timeout anterior
      this.clearActionTimeout(gameId);

      // Se jogo ainda ativo, inicia timeout para próximo jogador
      if (gameState.status === 'in_progress') {
        const nextPlayer = gameState.players[gameState.currentPlayerIndex];
        this.setActionTimeout(gameId, nextPlayer.id);
      }

      this.logger.log(
        `Player ${userId} performed ${payload.action} in game ${gameId}`,
      );
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  /**
   * Jogador pode desistir (fold automático se timeout)
   */
  @SubscribeMessage('game:fold')
  async onFold(
    @ConnectedSocket() socket: Socket,
  ) {
    const { userId } = socket.data;

    // Processa como fold
    await this.onPlayerAction(socket, {
      action: PlayerAction.FOLD,
    });
  }

  /**
   * Chat da partida
   */
  @SubscribeMessage('game:chat')
  async onChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { message: string },
  ) {
    const { userId, gameId } = socket.data;

    // Valida mensagem
    if (!payload.message || payload.message.length > 200) {
      socket.emit('error', 'Invalid message');
      return;
    }

    // Emite para toda a sala
    this.server.to(gameId).emit('game:chatMessage', {
      userId,
      message: payload.message,
      timestamp: Date.now(),
    });
  }

  /**
   * Reconexão
   */
  @SubscribeMessage('game:reconnect')
  async onReconnect(@ConnectedSocket() socket: Socket) {
    const { userId, gameId } = socket.data;

    const gameState = await this.gameService.getGame(gameId);
    if (!gameState) {
      socket.emit('error', 'Game not found');
      return;
    }

    // Reentra na sala
    socket.join(gameId);

    // Envia estado completo
    socket.emit('game:reconnected', {
      gameState: this.sanitizeGameState(gameState, userId),
      timestamp: Date.now(),
    });

    this.logger.log(`User ${userId} reconnected to game ${gameId}`);
  }

  /**
   * Sanitiza estado do jogo para cada jogador
   * (não revela cartas fechadas dos adversários)
   */
  private sanitizeGameState(gameState: any, userId: string) {
    const sanitized = { ...gameState };

    // Esconde cartas de outros jogadores
    sanitized.players = sanitized.players.map(player => ({
      ...player,
      holeCards: player.id === userId ? player.holeCards : [], // Vazio para adversários
    }));

    return sanitized;
  }

  /**
   * Define timeout para ação do jogador
   */
  private setActionTimeout(gameId: string, playerId: string) {
    const timeoutKey = `${gameId}:${playerId}`;

    const timeout = setTimeout(async () => {
      this.logger.warn(`Action timeout for player ${playerId} in game ${gameId}`);

      // Processa fold automático
      const result = await this.gameService.processPlayerAction(
        gameId,
        playerId,
        PlayerAction.FOLD,
      );

      if (result.success) {
        this.server.to(gameId).emit('game:autoFold', {
          playerId,
          reason: 'timeout',
        });
      }

      this.playerTimeouts.delete(timeoutKey);
    }, 30000); // 30 segundos

    this.playerTimeouts.set(timeoutKey, timeout);
  }

  /**
   * Limpa timeout de ação
   */
  private clearActionTimeout(gameId: string) {
    // Limpa todos os timeouts desta partida
    for (const [key, timeout] of this.playerTimeouts.entries()) {
      if (key.startsWith(`${gameId}:`)) {
        clearTimeout(timeout);
        this.playerTimeouts.delete(key);
      }
    }
  }

  /**
   * Método cleanup (quando gateway é destruído)
   */
  onModuleDestroy() {
    // Limpa todos os timeouts
    for (const timeout of this.playerTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.playerTimeouts.clear();
  }
}

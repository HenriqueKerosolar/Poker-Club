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
import { RoomService } from '../services/room.service';
import { GameService } from '../services/game.service';
import { Room } from '@shared/types/game';

/**
 * RoomGateway - WebSocket para salas de jogo
 * Gerencia conexões, juntadas, saídas, start de partida
 */
@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://pokerclub.app']
      : ['http://localhost:3001', 'http://localhost:8081'],
    credentials: true,
  },
  namespace: '/rooms',
})
@Injectable()
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('RoomGateway');

  constructor(
    private jwt: JwtService,
    private roomService: RoomService,
    private gameService: GameService,
  ) {}

  /**
   * Autentica socket com JWT
   */
  private extractUserFromSocket(socket: Socket): { userId: string; username: string } {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decoded = this.jwt.verify(token);
      return {
        userId: decoded.sub,
        username: decoded.username,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Jogador conectado ao namespace
   */
  async handleConnection(socket: Socket) {
    try {
      const { userId, username } = this.extractUserFromSocket(socket);

      // Armazena no socket
      socket.data.userId = userId;
      socket.data.username = username;

      this.logger.log(`User ${userId} connected to rooms namespace`);

      // Emite lista de salas
      const rooms = await this.roomService.getAllRooms();
      const summaries = await Promise.all(
        rooms.map(r => this.roomService.getRoomSummary(r)),
      );
      socket.emit('rooms:list', summaries);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  /**
   * Jogador desconectado
   */
  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    if (!userId) return;

    // Remove da sala
    const room = await this.roomService.getPlayerRoom(userId);
    if (room) {
      await this.roomService.removePlayerFromRoom(room.id, userId);
      this.server.emit('room:updated', room);
    }

    this.logger.log(`User ${userId} disconnected from rooms namespace`);
  }

  /**
   * Criar sala
   */
  @SubscribeMessage('room:create')
  async onCreateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { name: string; buyInCents: number; maxPlayers: number },
  ) {
    try {
      const { userId, username } = socket.data;

      const room = await this.roomService.createRoom(userId, {
        name: payload.name,
        buyInCents: payload.buyInCents,
        maxPlayers: payload.maxPlayers || 6,
        variantId: 'texas_holdem',
      } as any);

      socket.join(room.id);
      socket.emit('room:created', room);

      // Notifica todos os clientes
      this.server.emit('room:opened', await this.roomService.getRoomSummary(room));

      this.logger.log(`Room created by ${userId}: ${room.id}`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  /**
   * Entrar em sala
   */
  @SubscribeMessage('room:join')
  async onJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { joinCode: string; balanceCents: number },
  ) {
    try {
      const { userId, username } = socket.data;

      // Busca sala por código
      const room = await this.roomService.getRoomByCode(payload.joinCode);
      if (!room) {
        socket.emit('error', 'Invalid join code');
        return;
      }

      // Adiciona jogador
      const updatedRoom = await this.roomService.addPlayerToRoom(
        room.id,
        userId,
        username,
        payload.balanceCents,
      );

      socket.join(room.id);
      socket.emit('room:joined', updatedRoom);

      // Notifica outros na sala
      this.server.to(room.id).emit('room:playerJoined', {
        roomId: room.id,
        player: {
          userId,
          username,
          status: 'waiting',
          balanceCents: payload.balanceCents,
          joinedAt: Date.now(),
        },
      });

      // Atualiza lista global
      this.server.emit('room:updated', await this.roomService.getRoomSummary(updatedRoom));

      this.logger.log(`User ${userId} joined room ${room.id}`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  /**
   * Sair da sala
   */
  @SubscribeMessage('room:leave')
  async onLeaveRoom(
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { userId } = socket.data;

      const room = await this.roomService.getPlayerRoom(userId);
      if (!room) return;

      const updatedRoom = await this.roomService.removePlayerFromRoom(room.id, userId);

      socket.leave(room.id);
      socket.emit('room:left', room.id);

      // Notifica
      this.server.to(room.id).emit('room:playerLeft', {
        roomId: room.id,
        userId,
        newOwner: updatedRoom.ownerId,
      });

      this.logger.log(`User ${userId} left room ${room.id}`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  /**
   * Marcar como pronto
   */
  @SubscribeMessage('room:ready')
  async onPlayerReady(@ConnectedSocket() socket: Socket) {
    try {
      const { userId } = socket.data;

      const room = await this.roomService.getPlayerRoom(userId);
      if (!room) {
        socket.emit('error', 'Not in a room');
        return;
      }

      const updatedRoom = await this.roomService.setPlayerReady(room.id, userId);

      // Notifica sala
      this.server.to(room.id).emit('room:playerReady', {
        roomId: room.id,
        userId,
      });

      // Se todos prontos, pode começar (se owner quer)
      const allReady = await this.roomService.areAllPlayersReady(room.id);
      if (allReady && updatedRoom.players.length >= 2) {
        this.server.to(room.id).emit('room:readyToStart', {
          roomId: room.id,
          playerCount: updatedRoom.players.length,
        });
      }
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  /**
   * Iniciar partida (apenas owner)
   */
  @SubscribeMessage('room:startGame')
  async onStartGame(@ConnectedSocket() socket: Socket) {
    try {
      const { userId } = socket.data;

      const room = await this.roomService.getPlayerRoom(userId);
      if (!room || room.ownerId !== userId) {
        socket.emit('error', 'Only room owner can start game');
        return;
      }

      // Verifica se todos estão prontos
      const allReady = await this.roomService.areAllPlayersReady(room.id);
      if (!allReady) {
        socket.emit('error', 'Not all players are ready');
        return;
      }

      // Cria partida
      const playerIds = room.players.map(p => p.userId);
      const gameState = await this.gameService.createGame(
        room.id,
        room.config.variantId,
        playerIds,
      );

      // Atualiza sala
      const updatedRoom = await this.roomService.startGame(room.id, gameState.id);

      // Notifica todos
      this.server.to(room.id).emit('room:gameStarted', {
        roomId: room.id,
        gameId: gameState.id,
        gameState,
      });

      // Move jogadores para game namespace
      this.server.to(room.id).emit('navigate', {
        path: `/game/${gameState.id}`,
      });

      this.logger.log(
        `Game started in room ${room.id}: ${gameState.id}`,
      );
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  /**
   * Emite lista atualizada de salas para novos clientes
   */
  @SubscribeMessage('rooms:refresh')
  async onRefreshRooms(@ConnectedSocket() socket: Socket) {
    const rooms = await this.roomService.getAllRooms();
    const summaries = await Promise.all(
      rooms.map(r => this.roomService.getRoomSummary(r)),
    );
    socket.emit('rooms:list', summaries);
  }
}

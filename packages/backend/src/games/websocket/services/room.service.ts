import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { Room, RoomPlayer, RoomConfig } from '@shared/types/game';
import { generateId, generateInviteCode } from '@shared/utils';

/**
 * RoomService - Gerencia salas de jogo
 * Todas as salas são armazenadas em Redis (ephemeral)
 */
@Injectable()
export class RoomService {
  private logger = new Logger('RoomService');
  private roomKeyPrefix = 'room:';
  private playerRoomKeyPrefix = 'player_room:';

  constructor(private redis: RedisService) {}

  /**
   * Cria uma nova sala
   */
  async createRoom(
    ownerId: string,
    config: RoomConfig,
  ): Promise<Room> {
    const roomId = generateId();
    const joinCode = generateInviteCode();

    const room: Room = {
      id: roomId,
      name: config.name,
      ownerId,
      players: [
        {
          userId: ownerId,
          username: 'Owner', // Será preenchido com nome real
          status: 'waiting',
          balanceCents: 0,
          isBot: false,
          joinedAt: Date.now(),
        },
      ],
      config,
      status: 'open',
      createdAt: Date.now(),
      joinCode,
    };

    // Salva no Redis com TTL de 24 horas
    await this.redis.setJson(
      `${this.roomKeyPrefix}${roomId}`,
      room,
      86400, // 24 horas
    );

    // Mapeia jogador → sala
    await this.redis.set(
      `${this.playerRoomKeyPrefix}${ownerId}`,
      roomId,
      86400,
    );

    this.logger.log(`Room created: ${roomId} (code: ${joinCode})`);
    return room;
  }

  /**
   * Busca uma sala por ID
   */
  async getRoom(roomId: string): Promise<Room | null> {
    return this.redis.getJson<Room>(`${this.roomKeyPrefix}${roomId}`);
  }

  /**
   * Busca uma sala por código de convite
   */
  async getRoomByCode(joinCode: string): Promise<Room | null> {
    // Busca todas as salas
    const rooms = await this.getAllRooms();
    return rooms.find(r => r.joinCode === joinCode) || null;
  }

  /**
   * Lista todas as salas abertas
   */
  async getAllRooms(): Promise<Room[]> {
    const keys = await this.redis.getClient().keys(`${this.roomKeyPrefix}*`);

    const rooms: Room[] = [];
    for (const key of keys) {
      const room = await this.redis.getJson<Room>(key);
      if (room && room.status === 'open') {
        rooms.push(room);
      }
    }

    return rooms;
  }

  /**
   * Adiciona jogador a uma sala
   */
  async addPlayerToRoom(
    roomId: string,
    userId: string,
    username: string,
    balanceCents: number,
  ): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    // Verifica se sala está cheia
    if (room.players.length >= (room.config.maxPlayers || 6)) {
      throw new Error('Room is full');
    }

    // Verifica se jogador já está na sala
    if (room.players.some(p => p.userId === userId)) {
      throw new Error('Player already in room');
    }

    const newPlayer: RoomPlayer = {
      userId,
      username,
      status: 'waiting',
      balanceCents,
      isBot: false,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);

    // Atualiza na sala (menos de 6 players = room.status = 'full')
    if (room.players.length >= (room.config.maxPlayers || 6)) {
      room.status = 'full';
    }

    // Salva
    await this.redis.setJson(`${this.roomKeyPrefix}${roomId}`, room, 86400);

    // Mapeia jogador → sala
    await this.redis.set(
      `${this.playerRoomKeyPrefix}${userId}`,
      roomId,
      86400,
    );

    this.logger.log(`Player ${userId} joined room ${roomId}`);
    return room;
  }

  /**
   * Remove jogador da sala
   */
  async removePlayerFromRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.players = room.players.filter(p => p.userId !== userId);

    // Se sala vazia, deleta
    if (room.players.length === 0) {
      await this.redis.delete(`${this.roomKeyPrefix}${roomId}`);
      this.logger.log(`Room ${roomId} deleted (empty)`);
      return room;
    }

    // Se owner saiu, transfere ownership
    if (room.ownerId === userId && room.players.length > 0) {
      room.ownerId = room.players[0].userId;
      this.logger.log(`Room ${roomId} ownership transferred to ${room.ownerId}`);
    }

    // Room volta para 'open' se não está cheia
    if (room.status === 'full' && room.players.length < (room.config.maxPlayers || 6)) {
      room.status = 'open';
    }

    await this.redis.setJson(`${this.roomKeyPrefix}${roomId}`, room, 86400);

    // Remove mapeamento jogador → sala
    await this.redis.delete(`${this.playerRoomKeyPrefix}${userId}`);

    this.logger.log(`Player ${userId} left room ${roomId}`);
    return room;
  }

  /**
   * Marca jogador como pronto
   */
  async setPlayerReady(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const player = room.players.find(p => p.userId === userId);
    if (!player) {
      throw new Error(`Player ${userId} not in room`);
    }

    player.status = 'ready';
    player.readyAt = Date.now();

    await this.redis.setJson(`${this.roomKeyPrefix}${roomId}`, room, 86400);

    this.logger.log(`Player ${userId} ready in room ${roomId}`);
    return room;
  }

  /**
   * Marca jogador como não pronto
   */
  async setPlayerNotReady(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const player = room.players.find(p => p.userId === userId);
    if (!player) {
      throw new Error(`Player ${userId} not in room`);
    }

    player.status = 'waiting';

    await this.redis.setJson(`${this.roomKeyPrefix}${roomId}`, room, 86400);

    return room;
  }

  /**
   * Verifica se todos os jogadores estão prontos
   */
  async areAllPlayersReady(roomId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    return room.players.every(p => p.status === 'ready');
  }

  /**
   * Inicia a partida (muda status da sala)
   */
  async startGame(roomId: string, gameId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.status = 'playing';
    room.gameId = gameId;
    room.startedAt = Date.now();

    // Marca todos os jogadores como "playing"
    for (const player of room.players) {
      player.status = 'playing';
    }

    await this.redis.setJson(`${this.roomKeyPrefix}${roomId}`, room, 86400);

    this.logger.log(`Game started in room ${roomId} (gameId: ${gameId})`);
    return room;
  }

  /**
   * Fecha a sala
   */
  async closeRoom(roomId: string): Promise<void> {
    const room = await this.getRoom(roomId);
    if (room) {
      // Remove mapeamento de todos os jogadores
      for (const player of room.players) {
        await this.redis.delete(`${this.playerRoomKeyPrefix}${player.userId}`);
      }
    }

    await this.redis.delete(`${this.roomKeyPrefix}${roomId}`);
    this.logger.log(`Room ${roomId} closed`);
  }

  /**
   * Busca a sala de um jogador
   */
  async getPlayerRoom(userId: string): Promise<Room | null> {
    const roomId = await this.redis.get(`${this.playerRoomKeyPrefix}${userId}`);
    if (!roomId) return null;

    return this.getRoom(roomId);
  }

  /**
   * Retorna resumo de uma sala (para listagem)
   */
  async getRoomSummary(room: Room): Promise<{
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    status: string;
    joinCode: string;
    buy_in: number;
  }> {
    return {
      id: room.id,
      name: room.name,
      players: room.players.length,
      maxPlayers: room.config.maxPlayers || 6,
      status: room.status,
      joinCode: room.joinCode,
      buy_in: room.config.buyInCents,
    };
  }
}

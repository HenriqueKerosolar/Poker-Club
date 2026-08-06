import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  UseFilters,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';
import { FriendsService } from '../services/friends.service';
import { ChatService } from '../services/chat.service';

/**
 * SocialGateway - Chat em tempo real, status de amigos
 * WebSocket namespace: /social
 */
@WebSocketGateway({
  namespace: '/social',
  cors: { origin: '*' },
})
export class SocialGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private logger = new Logger('SocialGateway');
  private activeUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private authService: AuthService,
    private friendsService: FriendsService,
    private chatService: ChatService,
  ) {}

  /**
   * Conexão WebSocket
   */
  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      // Valida JWT
      const token = socket.handshake.auth.token;
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      socket.data.userId = userId;
      this.activeUsers.set(userId, socket.id);

      // Entra em sala pessoal
      socket.join(`user:${userId}`);

      this.logger.log(`User connected: ${userId}`);

      // Notifica amigos que está online
      const friends = await this.friendsService.getFriends(userId);
      for (const friend of friends) {
        this.server
          .to(`user:${friend.userId}`)
          .emit('friend_online', { userId, username: payload.username });
      }
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  /**
   * Desconexão WebSocket
   */
  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId;
    if (userId) {
      this.activeUsers.delete(userId);
      this.logger.log(`User disconnected: ${userId}`);

      // Notifica amigos que saiu
      this.server.emit('friend_offline', { userId });
    }
  }

  /**
   * Recebe mensagem privada em tempo real
   * Evento: message:send
   */
  @SubscribeMessage('message:send')
  async handlePrivateMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string; content: string },
  ) {
    const fromUserId = socket.data.userId;

    try {
      // Valida comprimento
      if (!data.content || data.content.length > 2000) {
        return {
          success: false,
          error: 'Invalid message length',
        };
      }

      // Envia mensagem
      const message = await this.chatService.sendPrivateMessage(
        fromUserId,
        data.toUserId,
        data.content,
      );

      // Entrega em tempo real
      this.server.to(`user:${data.toUserId}`).emit('message:receive', {
        id: message.id,
        from: fromUserId,
        content: data.content,
        timestamp: message.createdAt,
      });

      // Confirma ao remetente
      return {
        success: true,
        messageId: message.id,
        timestamp: message.createdAt,
      };
    } catch (error) {
      this.logger.error(`Message error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Marca mensagem como lida
   * Evento: message:read
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; fromUserId: string },
  ) {
    const userId = socket.data.userId;

    try {
      await this.chatService.markAsRead(userId, data.messageId);

      // Notifica remetente
      this.server.to(`user:${data.fromUserId}`).emit('message:read', {
        messageId: data.messageId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Marca conversa como lida
   * Evento: conversation:read
   */
  @SubscribeMessage('conversation:read')
  async handleConversationRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const myUserId = socket.data.userId;

    try {
      await this.chatService.markConversationAsRead(myUserId, data.userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Requisição de amizade
   * Evento: friend:request
   */
  @SubscribeMessage('friend:request')
  async handleFriendRequest(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string },
  ) {
    const fromUserId = socket.data.userId;

    try {
      await this.friendsService.sendFriendRequest(fromUserId, data.toUserId);

      // Notifica destinatário
      this.server.to(`user:${data.toUserId}`).emit('friend:request_received', {
        fromUserId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Aceita amizade
   * Evento: friend:accept
   */
  @SubscribeMessage('friend:accept')
  async handleAcceptFriend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const userId = socket.data.userId;

    try {
      await this.friendsService.acceptFriendRequest(userId, data.friendId);

      // Notifica ambos
      this.server.to(`user:${data.friendId}`).emit('friend:accepted', {
        userId,
      });
      socket.emit('friend:accepted', { userId: data.friendId });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rejeita amizade
   * Evento: friend:reject
   */
  @SubscribeMessage('friend:reject')
  async handleRejectFriend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const userId = socket.data.userId;

    try {
      await this.friendsService.rejectFriendRequest(userId, data.friendId);

      // Notifica remetente
      this.server.to(`user:${data.friendId}`).emit('friend:rejected', {
        userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove amigo
   * Evento: friend:remove
   */
  @SubscribeMessage('friend:remove')
  async handleRemoveFriend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const userId = socket.data.userId;

    try {
      await this.friendsService.removeFriend(userId, data.friendId);

      // Notifica ambos
      this.server.to(`user:${data.friendId}`).emit('friend:removed', {
        userId,
      });
      socket.emit('friend:removed', { userId: data.friendId });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Bloqueia usuário
   * Evento: user:block
   */
  @SubscribeMessage('user:block')
  async handleBlockUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const myUserId = socket.data.userId;

    try {
      await this.friendsService.blockUser(myUserId, data.userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Desbloqueia usuário
   * Evento: user:unblock
   */
  @SubscribeMessage('user:unblock')
  async handleUnblockUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const myUserId = socket.data.userId;

    try {
      await this.friendsService.unblockUser(myUserId, data.userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Typing indicator
   * Evento: typing:start
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.server.to(`user:${data.userId}`).emit('typing:start', {
      from: socket.data.userId,
    });
  }

  /**
   * Stop typing
   * Evento: typing:stop
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.server.to(`user:${data.userId}`).emit('typing:stop', {
      from: socket.data.userId,
    });
  }

  /**
   * Pede status de amigo
   * Evento: friend:status
   */
  @SubscribeMessage('friend:status')
  async handleFriendStatus(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    const isOnline = this.activeUsers.has(data.friendId);
    return {
      userId: data.friendId,
      online: isOnline,
    };
  }
}

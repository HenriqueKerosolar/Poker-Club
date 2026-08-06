import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

/**
 * ChatService - Mensagens entre jogadores
 * Chat privado (1:1), histórico, notificações
 */
@Injectable()
export class ChatService {
  private logger = new Logger('ChatService');
  private readonly MESSAGE_TTL = 7 * 24 * 60 * 60; // 7 dias em cache
  private readonly MAX_MESSAGES_PER_CONVERSATION = 100;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Envia mensagem privada
   */
  async sendPrivateMessage(
    fromUserId: string,
    toUserId: string,
    content: string,
  ): Promise<any> {
    if (fromUserId === toUserId) {
      throw new Error('Cannot message yourself');
    }

    // Verifica se está bloqueado
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        blockerUserId: toUserId,
        blockedUserId: fromUserId,
      },
    });

    if (blocked) {
      throw new Error('User has blocked you');
    }

    // Cria mensagem
    const message = await this.prisma.privateMessage.create({
      data: {
        senderUserId: fromUserId,
        recipientUserId: toUserId,
        content,
        readAt: null,
      },
    });

    // Cache (Redis)
    const conversationKey = this.getConversationKey(fromUserId, toUserId);
    await this.redis.push(conversationKey, JSON.stringify(message), this.MESSAGE_TTL);

    // Notificação (Redis pub/sub)
    const notificationKey = `notifications:${toUserId}`;
    await this.redis.publish(notificationKey, JSON.stringify({
      type: 'new_message',
      from: fromUserId,
      content: content.substring(0, 50),
      timestamp: new Date().toISOString(),
    }));

    this.logger.log(`Message: ${fromUserId} → ${toUserId}`);
    return message;
  }

  /**
   * Marca mensagem como lida
   */
  async markAsRead(userId: string, messageId: string): Promise<any> {
    const message = await this.prisma.privateMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });

    return message;
  }

  /**
   * Marca todas as mensagens de um usuário como lidas
   */
  async markConversationAsRead(userId: string, otherUserId: string): Promise<void> {
    await this.prisma.privateMessage.updateMany({
      where: {
        recipientUserId: userId,
        senderUserId: otherUserId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  /**
   * Busca histórico de conversa
   */
  async getConversationHistory(
    userId: string,
    otherUserId: string,
    limit: number = 50,
  ): Promise<any[]> {
    // Tenta cache primeiro
    const conversationKey = this.getConversationKey(userId, otherUserId);
    const cached = await this.redis.getList(conversationKey, 0, limit - 1);

    if (cached && cached.length > 0) {
      return cached.map((m) => JSON.parse(m));
    }

    // Busca DB
    const messages = await this.prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderUserId: userId, recipientUserId: otherUserId },
          { senderUserId: otherUserId, recipientUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Cacheia
    for (const message of messages.reverse()) {
      await this.redis.push(conversationKey, JSON.stringify(message), this.MESSAGE_TTL);
    }

    return messages;
  }

  /**
   * Lista conversas ativas
   */
  async getConversations(userId: string): Promise<any[]> {
    // Busca últimas mensagens de cada conversa
    const messages = await this.prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderUserId: userId },
          { recipientUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
        recipient: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    // Agrupa por conversa (remove duplicatas)
    const conversations = new Map();

    for (const msg of messages) {
      const otherUserId =
        msg.senderUserId === userId ? msg.recipientUserId : msg.senderUserId;
      const otherUser =
        msg.senderUserId === userId ? msg.recipient : msg.sender;

      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          userId: otherUser.id,
          username: otherUser.username,
          avatar: otherUser.avatar,
          status: otherUser.status,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: msg.recipientUserId === userId && !msg.readAt ? 1 : 0,
        });
      } else {
        const existing = conversations.get(otherUserId);
        if (msg.recipientUserId === userId && !msg.readAt) {
          existing.unreadCount += 1;
        }
      }
    }

    return Array.from(conversations.values());
  }

  /**
   * Conta mensagens não lidas
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.privateMessage.count({
      where: {
        recipientUserId: userId,
        readAt: null,
      },
    });

    return count;
  }

  /**
   * Conta não-lidas por usuário
   */
  async getUnreadCountByUser(
    userId: string,
    fromUserId: string,
  ): Promise<number> {
    const count = await this.prisma.privateMessage.count({
      where: {
        recipientUserId: userId,
        senderUserId: fromUserId,
        readAt: null,
      },
    });

    return count;
  }

  /**
   * Apaga mensagem
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.prisma.privateMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderUserId !== userId) {
      throw new Error('Cannot delete this message');
    }

    // Soft delete (marca como apagada, não remove do DB)
    await this.prisma.privateMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Busca conversa por usuários
   */
  private getConversationKey(userId: string, otherUserId: string): string {
    const [min, max] = [userId, otherUserId].sort();
    return `conversation:${min}:${max}`;
  }

  /**
   * Chat em sala de jogo
   */
  async sendRoomMessage(
    roomId: string,
    userId: string,
    content: string,
  ): Promise<any> {
    const message = await this.prisma.roomMessage.create({
      data: {
        roomId,
        userId,
        content,
      },
    });

    // Pub/sub para todos na sala
    const roomKey = `room:${roomId}:chat`;
    await this.redis.publish(roomKey, JSON.stringify({
      type: 'chat_message',
      userId,
      content,
      timestamp: new Date().toISOString(),
    }));

    return message;
  }

  /**
   * Busca histórico da sala
   */
  async getRoomChatHistory(roomId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.roomMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }
}

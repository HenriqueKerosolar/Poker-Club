import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

/**
 * FriendsService - Gerencia relacionamento entre jogadores
 * Amigos, bloqueios, requisições de amizade
 */
@Injectable()
export class FriendsService {
  private logger = new Logger('FriendsService');

  constructor(private prisma: PrismaService) {}

  /**
   * Envia requisição de amizade
   */
  async sendFriendRequest(
    fromUserId: string,
    toUserId: string,
  ): Promise<any> {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot send request to yourself');
    }

    // Verifica se já são amigos
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterUserId: fromUserId, recipientUserId: toUserId },
          { requesterUserId: toUserId, recipientUserId: fromUserId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Already friends or request pending');
    }

    // Verifica se está bloqueado
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        blockerUserId: toUserId,
        blockedUserId: fromUserId,
      },
    });

    if (blocked) {
      throw new BadRequestException('User has blocked you');
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterUserId: fromUserId,
        recipientUserId: toUserId,
        status: 'pending',
      },
    });

    this.logger.log(`Friend request: ${fromUserId} → ${toUserId}`);
    return friendship;
  }

  /**
   * Aceita requisição de amizade
   */
  async acceptFriendRequest(
    userId: string,
    friendId: string,
  ): Promise<any> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        recipientUserId: userId,
        requesterUserId: friendId,
        status: 'pending',
      },
    });

    if (!friendship) {
      throw new BadRequestException('No pending friend request');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    this.logger.log(`Friend accepted: ${userId} ← ${friendId}`);
    return updated;
  }

  /**
   * Rejeita requisição de amizade
   */
  async rejectFriendRequest(
    userId: string,
    friendId: string,
  ): Promise<any> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        recipientUserId: userId,
        requesterUserId: friendId,
        status: 'pending',
      },
    });

    if (!friendship) {
      throw new BadRequestException('No pending friend request');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    this.logger.log(`Friend rejected: ${userId} → ${friendId}`);
    return { success: true };
  }

  /**
   * Remove amizade
   */
  async removeFriend(userId: string, friendId: string): Promise<any> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterUserId: userId,
            recipientUserId: friendId,
            status: 'accepted',
          },
          {
            requesterUserId: friendId,
            recipientUserId: userId,
            status: 'accepted',
          },
        ],
      },
    });

    if (!friendship) {
      throw new BadRequestException('Not friends');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    this.logger.log(`Friend removed: ${userId} ↔ ${friendId}`);
    return { success: true };
  }

  /**
   * Lista amigos do usuário
   */
  async getFriends(userId: string): Promise<any[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterUserId: userId, status: 'accepted' },
          { recipientUserId: userId, status: 'accepted' },
        ],
      },
      include: {
        requester: {
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

    return friendships.map((f) => {
      const friend = f.requesterUserId === userId ? f.recipient : f.requester;
      return {
        userId: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        status: friend.status,
        friendsSince: f.acceptedAt,
      };
    });
  }

  /**
   * Lista requisições pendentes
   */
  async getPendingRequests(userId: string): Promise<any[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        recipientUserId: userId,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return friendships.map((f) => ({
      requesterUserId: f.requester.id,
      requesterUsername: f.requester.username,
      requesterAvatar: f.requester.avatar,
      requestedAt: f.createdAt,
    }));
  }

  /**
   * Bloqueia um usuário
   */
  async blockUser(userId: string, blockedUserId: string): Promise<any> {
    if (userId === blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Remove amizade se existir
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterUserId: userId,
            recipientUserId: blockedUserId,
          },
          {
            requesterUserId: blockedUserId,
            recipientUserId: userId,
          },
        ],
      },
    });

    if (friendship) {
      await this.prisma.friendship.delete({
        where: { id: friendship.id },
      });
    }

    // Cria bloqueio
    const block = await this.prisma.userBlock.create({
      data: {
        blockerUserId: userId,
        blockedUserId: blockedUserId,
      },
    });

    this.logger.log(`User blocked: ${userId} → ${blockedUserId}`);
    return block;
  }

  /**
   * Desbloqueia um usuário
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<any> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        blockerUserId: userId,
        blockedUserId: blockedUserId,
      },
    });

    if (!block) {
      throw new BadRequestException('User is not blocked');
    }

    await this.prisma.userBlock.delete({
      where: { id: block.id },
    });

    this.logger.log(`User unblocked: ${userId} ← ${blockedUserId}`);
    return { success: true };
  }

  /**
   * Lista usuários bloqueados
   */
  async getBlockedUsers(userId: string): Promise<any[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerUserId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return blocks.map((b) => ({
      userId: b.blocked.id,
      username: b.blocked.username,
      avatar: b.blocked.avatar,
      blockedAt: b.createdAt,
    }));
  }

  /**
   * Verifica se está bloqueado por usuário
   */
  async isBlockedBy(userId: string, byUserId: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        blockerUserId: byUserId,
        blockedUserId: userId,
      },
    });

    return !!block;
  }

  /**
   * Verifica status de amizade
   */
  async getFriendshipStatus(
    userId: string,
    otherUserId: string,
  ): Promise<string> {
    if (userId === otherUserId) {
      return 'self';
    }

    const blocked = await this.isBlockedBy(userId, otherUserId);
    if (blocked) {
      return 'blocked_by_user';
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterUserId: userId,
            recipientUserId: otherUserId,
          },
          {
            requesterUserId: otherUserId,
            recipientUserId: userId,
          },
        ],
      },
    });

    if (!friendship) {
      return 'stranger';
    }

    if (friendship.status === 'accepted') {
      return 'friend';
    }

    if (friendship.requesterUserId === userId) {
      return 'request_sent';
    }

    return 'request_received';
  }
}

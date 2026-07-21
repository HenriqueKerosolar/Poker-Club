import { describe, it, expect, beforeEach } from '@jest/globals';
import { FriendsService } from './friends.service';

/**
 * Testes do FriendsService
 */
describe('FriendsService', () => {
  let service: FriendsService;

  const mockPrisma = {
    friendship: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userBlock: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new FriendsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('envia requisição de amizade', async () => {
      const request = {
        id: 'req_123',
        requesterUserId: 'user_1',
        recipientUserId: 'user_2',
        status: 'pending',
      };

      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      mockPrisma.userBlock.findFirst.mockResolvedValue(null);
      mockPrisma.friendship.create.mockResolvedValue(request);

      const result = await service.sendFriendRequest('user_1', 'user_2');

      expect(result.status).toBe('pending');
      expect(result.requesterUserId).toBe('user_1');
    });

    it('rejeita requisição para si mesmo', async () => {
      expect(() =>
        service.sendFriendRequest('user_1', 'user_1'),
      ).rejects.toThrow('yourself');
    });

    it('rejeita se já são amigos', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'req_123',
        status: 'accepted',
      });

      expect(() =>
        service.sendFriendRequest('user_1', 'user_2'),
      ).rejects.toThrow('Already friends');
    });

    it('rejeita se está bloqueado', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      mockPrisma.userBlock.findFirst.mockResolvedValue({
        id: 'block_123',
      });

      expect(() =>
        service.sendFriendRequest('user_1', 'user_2'),
      ).rejects.toThrow('blocked');
    });
  });

  describe('acceptFriendRequest', () => {
    it('aceita requisição de amizade', async () => {
      const request = {
        id: 'req_123',
        recipientUserId: 'user_1',
        requesterUserId: 'user_2',
        status: 'pending',
      };

      mockPrisma.friendship.findFirst.mockResolvedValue(request);
      mockPrisma.friendship.update.mockResolvedValue({
        ...request,
        status: 'accepted',
        acceptedAt: new Date(),
      });

      const result = await service.acceptFriendRequest('user_1', 'user_2');

      expect(result.status).toBe('accepted');
      expect(mockPrisma.friendship.update).toHaveBeenCalled();
    });

    it('rejeita aceitar requisição inexistente', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);

      expect(() =>
        service.acceptFriendRequest('user_1', 'user_2'),
      ).rejects.toThrow('No pending friend request');
    });
  });

  describe('removeFriend', () => {
    it('remove amigo', async () => {
      const friendship = {
        id: 'req_123',
        requesterUserId: 'user_1',
        recipientUserId: 'user_2',
        status: 'accepted',
      };

      mockPrisma.friendship.findFirst.mockResolvedValue(friendship);
      mockPrisma.friendship.delete.mockResolvedValue(friendship);

      const result = await service.removeFriend('user_1', 'user_2');

      expect(result.success).toBe(true);
      expect(mockPrisma.friendship.delete).toHaveBeenCalled();
    });

    it('rejeita remover não-amigo', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);

      expect(() =>
        service.removeFriend('user_1', 'user_2'),
      ).rejects.toThrow('Not friends');
    });
  });

  describe('getFriends', () => {
    it('retorna lista de amigos', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([
        {
          id: 'req_1',
          requesterUserId: 'user_1',
          recipientUserId: 'user_2',
          status: 'accepted',
          acceptedAt: new Date(),
          requester: { id: 'user_1', username: 'alice', avatar: 'url', status: 'online' },
          recipient: { id: 'user_2', username: 'bob', avatar: 'url', status: 'offline' },
        },
      ]);

      const result = await service.getFriends('user_1');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user_2');
      expect(result[0].username).toBe('bob');
    });
  });

  describe('blockUser', () => {
    it('bloqueia um usuário', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      mockPrisma.userBlock.create.mockResolvedValue({
        id: 'block_123',
        blockerUserId: 'user_1',
        blockedUserId: 'user_2',
      });

      const result = await service.blockUser('user_1', 'user_2');

      expect(result.blockedUserId).toBe('user_2');
    });

    it('remove amizade ao bloquear', async () => {
      const friendship = { id: 'req_123' };

      mockPrisma.friendship.findFirst.mockResolvedValue(friendship);
      mockPrisma.friendship.delete.mockResolvedValue(friendship);
      mockPrisma.userBlock.create.mockResolvedValue({
        id: 'block_123',
      });

      await service.blockUser('user_1', 'user_2');

      expect(mockPrisma.friendship.delete).toHaveBeenCalled();
    });
  });

  describe('getFriendshipStatus', () => {
    it('retorna status de amizade', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({
        requesterUserId: 'user_1',
        recipientUserId: 'user_2',
        status: 'accepted',
      });
      mockPrisma.userBlock.findFirst.mockResolvedValue(null);

      const status = await service.getFriendshipStatus('user_1', 'user_2');

      expect(status).toBe('friend');
    });

    it('retorna "stranger" para desconhecido', async () => {
      mockPrisma.userBlock.findFirst.mockResolvedValue(null);
      mockPrisma.friendship.findFirst.mockResolvedValue(null);

      const status = await service.getFriendshipStatus('user_1', 'user_2');

      expect(status).toBe('stranger');
    });

    it('retorna "blocked_by_user" quando bloqueado', async () => {
      mockPrisma.userBlock.findFirst.mockResolvedValue({ id: 'block_123' });

      const status = await service.getFriendshipStatus('user_1', 'user_2');

      expect(status).toBe('blocked_by_user');
    });
  });
});

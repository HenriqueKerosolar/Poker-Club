import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FriendsService } from '../services/friends.service';
import { ChatService } from '../services/chat.service';

/**
 * SocialController - Amigos, bloqueios, chat
 */
@Controller('api/social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  private logger = new Logger('SocialController');

  constructor(
    private friendsService: FriendsService,
    private chatService: ChatService,
  ) {}

  // ==================== AMIGOS ====================

  /**
   * POST /api/social/friends/request
   * Envia requisição de amizade
   */
  @Post('friends/request')
  async sendFriendRequest(
    @Req() req: any,
    @Body() body: { toUserId: string },
  ) {
    const fromUserId = req.user.sub;
    return this.friendsService.sendFriendRequest(fromUserId, body.toUserId);
  }

  /**
   * POST /api/social/friends/accept/:friendId
   * Aceita requisição
   */
  @Post('friends/accept/:friendId')
  async acceptFriendRequest(@Req() req: any, @Param('friendId') friendId: string) {
    const userId = req.user.sub;
    return this.friendsService.acceptFriendRequest(userId, friendId);
  }

  /**
   * DELETE /api/social/friends/reject/:friendId
   * Rejeita requisição
   */
  @Delete('friends/reject/:friendId')
  async rejectFriendRequest(@Req() req: any, @Param('friendId') friendId: string) {
    const userId = req.user.sub;
    return this.friendsService.rejectFriendRequest(userId, friendId);
  }

  /**
   * DELETE /api/social/friends/:friendId
   * Remove amigo
   */
  @Delete('friends/:friendId')
  async removeFriend(@Req() req: any, @Param('friendId') friendId: string) {
    const userId = req.user.sub;
    return this.friendsService.removeFriend(userId, friendId);
  }

  /**
   * GET /api/social/friends
   * Lista amigos
   */
  @Get('friends')
  async getFriends(@Req() req: any) {
    const userId = req.user.sub;
    return this.friendsService.getFriends(userId);
  }

  /**
   * GET /api/social/friends/pending
   * Lista requisições pendentes
   */
  @Get('friends/pending')
  async getPendingRequests(@Req() req: any) {
    const userId = req.user.sub;
    return this.friendsService.getPendingRequests(userId);
  }

  /**
   * GET /api/social/friends/status/:userId
   * Status de amizade
   */
  @Get('friends/status/:userId')
  async getFriendshipStatus(
    @Req() req: any,
    @Param('userId') otherUserId: string,
  ) {
    const userId = req.user.sub;
    const status = await this.friendsService.getFriendshipStatus(
      userId,
      otherUserId,
    );
    return { status };
  }

  // ==================== BLOQUEIOS ====================

  /**
   * POST /api/social/block
   * Bloqueia usuário
   */
  @Post('block')
  async blockUser(@Req() req: any, @Body() body: { userId: string }) {
    const myUserId = req.user.sub;
    return this.friendsService.blockUser(myUserId, body.userId);
  }

  /**
   * DELETE /api/social/block/:userId
   * Desbloqueia usuário
   */
  @Delete('block/:userId')
  async unblockUser(@Req() req: any, @Param('userId') blockedUserId: string) {
    const myUserId = req.user.sub;
    return this.friendsService.unblockUser(myUserId, blockedUserId);
  }

  /**
   * GET /api/social/blocked
   * Lista bloqueados
   */
  @Get('blocked')
  async getBlockedUsers(@Req() req: any) {
    const userId = req.user.sub;
    return this.friendsService.getBlockedUsers(userId);
  }

  // ==================== CHAT ====================

  /**
   * POST /api/social/messages
   * Envia mensagem privada
   */
  @Post('messages')
  async sendPrivateMessage(
    @Req() req: any,
    @Body() body: { toUserId: string; content: string },
  ) {
    const fromUserId = req.user.sub;
    return this.chatService.sendPrivateMessage(
      fromUserId,
      body.toUserId,
      body.content,
    );
  }

  /**
   * GET /api/social/messages/:userId
   * Histórico com usuário
   */
  @Get('messages/:userId')
  async getConversationHistory(
    @Req() req: any,
    @Param('userId') otherUserId: string,
  ) {
    const userId = req.user.sub;
    return this.chatService.getConversationHistory(userId, otherUserId, 50);
  }

  /**
   * GET /api/social/conversations
   * Lista conversas ativas
   */
  @Get('conversations')
  async getConversations(@Req() req: any) {
    const userId = req.user.sub;
    return this.chatService.getConversations(userId);
  }

  /**
   * GET /api/social/messages/unread/count
   * Conta não-lidas
   */
  @Get('messages/unread/count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.sub;
    const count = await this.chatService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  /**
   * POST /api/social/messages/:messageId/read
   * Marca como lida
   */
  @Post('messages/:messageId/read')
  async markAsRead(@Req() req: any, @Param('messageId') messageId: string) {
    const userId = req.user.sub;
    return this.chatService.markAsRead(userId, messageId);
  }

  /**
   * POST /api/social/messages/:userId/read-all
   * Marca conversa como lida
   */
  @Post('messages/:userId/read-all')
  async markConversationAsRead(
    @Req() req: any,
    @Param('userId') otherUserId: string,
  ) {
    const userId = req.user.sub;
    await this.chatService.markConversationAsRead(userId, otherUserId);
    return { success: true };
  }

  /**
   * DELETE /api/social/messages/:messageId
   * Apaga mensagem
   */
  @Delete('messages/:messageId')
  async deleteMessage(@Req() req: any, @Param('messageId') messageId: string) {
    const userId = req.user.sub;
    await this.chatService.deleteMessage(userId, messageId);
    return { success: true };
  }
}

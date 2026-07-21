import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AvatarService } from '../services/avatar.service';
import { ThemeService } from '../services/theme.service';
import { SoundService } from '../services/sound.service';
import { ProfileService } from '../services/profile.service';

/**
 * PersonalizationController - Avatares, temas, som, perfil
 */
@Controller('api/personalization')
@UseGuards(JwtAuthGuard)
export class PersonalizationController {
  private logger = new Logger('PersonalizationController');

  constructor(
    private avatarService: AvatarService,
    private themeService: ThemeService,
    private soundService: SoundService,
    private profileService: ProfileService,
  ) {}

  // ==================== AVATAR ====================

  /**
   * POST /api/personalization/avatar/procedural
   * Gera avatar procedural
   */
  @Post('avatar/procedural')
  async generateProceduralAvatar(@Req() req: any) {
    const userId = req.user.sub;
    const username = req.user.username;
    const avatarUrl = await this.avatarService.generateProceduralAvatar(
      userId,
      username,
    );
    return { avatarUrl, type: 'procedural' };
  }

  /**
   * POST /api/personalization/avatar/upload
   * Upload de avatar customizado
   */
  @Post('avatar/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new Error('Arquivo não encontrado');
    }

    const userId = req.user.sub;
    const avatarUrl = await this.avatarService.uploadAvatar(
      userId,
      file.buffer,
      file.mimetype,
    );
    return { avatarUrl, type: 'upload' };
  }

  /**
   * POST /api/personalization/avatar/preset/:presetId
   * Seleciona avatar de preset
   */
  @Post('avatar/preset/:presetId')
  async selectPresetAvatar(
    @Req() req: any,
    @Param('presetId') presetId: string,
  ) {
    const userId = req.user.sub;
    const avatarUrl = await this.avatarService.selectPresetAvatar(
      userId,
      presetId,
    );
    return { avatarUrl, type: 'preset', presetId };
  }

  /**
   * GET /api/personalization/avatar/presets
   * Lista presets de avatar
   */
  @Get('avatar/presets')
  getAvatarPresets() {
    return { presets: this.avatarService.getAvatarPresets() };
  }

  // ==================== THEME ====================

  /**
   * POST /api/personalization/theme/:themeName
   * Define tema
   */
  @Post('theme/:themeName')
  async setTheme(@Req() req: any, @Param('themeName') themeName: string) {
    const userId = req.user.sub;
    return this.themeService.setTheme(userId, themeName);
  }

  /**
   * GET /api/personalization/theme
   * Obtém tema do usuário
   */
  @Get('theme')
  async getUserTheme(@Req() req: any) {
    const userId = req.user.sub;
    return this.themeService.getUserTheme(userId);
  }

  /**
   * GET /api/personalization/themes
   * Lista temas disponíveis
   */
  @Get('themes')
  getAvailableThemes() {
    return { themes: this.themeService.getAvailableThemes() };
  }

  /**
   * POST /api/personalization/theme/custom
   * Cria tema customizado
   */
  @Post('theme/custom')
  async createCustomTheme(
    @Req() req: any,
    @Body() body: { name: string; colors: Record<string, string> },
  ) {
    const userId = req.user.sub;
    return this.themeService.createCustomTheme(userId, body.name, body.colors);
  }

  /**
   * GET /api/personalization/theme/custom
   * Lista temas customizados
   */
  @Get('theme/custom')
  async getUserCustomThemes(@Req() req: any) {
    const userId = req.user.sub;
    const themes = await this.themeService.getUserCustomThemes(userId);
    return { customThemes: themes };
  }

  /**
   * POST /api/personalization/theme/custom/:themeId/apply
   * Aplica tema customizado
   */
  @Post('theme/custom/:themeId/apply')
  async applyCustomTheme(
    @Req() req: any,
    @Param('themeId') themeId: string,
  ) {
    const userId = req.user.sub;
    return this.themeService.applyCustomTheme(userId, themeId);
  }

  /**
   * DELETE /api/personalization/theme/custom/:themeId
   * Deleta tema customizado
   */
  @Delete('theme/custom/:themeId')
  async deleteCustomTheme(
    @Req() req: any,
    @Param('themeId') themeId: string,
  ) {
    const userId = req.user.sub;
    await this.themeService.deleteCustomTheme(userId, themeId);
    return { success: true };
  }

  // ==================== SOUND ====================

  /**
   * POST /api/personalization/sound/preferences
   * Define preferências de som
   */
  @Post('sound/preferences')
  async setSoundPreferences(
    @Req() req: any,
    @Body()
    body: {
      musicVolume?: number;
      effectsVolume?: number;
      musicEnabled?: boolean;
      effectsEnabled?: boolean;
      backgroundMusic?: string;
    },
  ) {
    const userId = req.user.sub;
    return this.soundService.setSoundPreferences(userId, body);
  }

  /**
   * GET /api/personalization/sound/preferences
   * Obtém preferências de som
   */
  @Get('sound/preferences')
  async getUserSoundPreferences(@Req() req: any) {
    const userId = req.user.sub;
    return this.soundService.getUserSoundPreferences(userId);
  }

  /**
   * GET /api/personalization/sound/music
   * Lista músicas disponíveis
   */
  @Get('sound/music')
  getAvailableBackgroundMusic() {
    return { music: this.soundService.getAvailableBackgroundMusic() };
  }

  /**
   * GET /api/personalization/sound/effects
   * Lista efeitos sonoros
   */
  @Get('sound/effects')
  getAvailableSoundEffects() {
    return { effects: this.soundService.getAvailableSoundEffects() };
  }

  /**
   * POST /api/personalization/sound/music/toggle
   * Alterna música
   */
  @Post('sound/music/toggle')
  async toggleMusic(@Req() req: any) {
    const userId = req.user.sub;
    return this.soundService.toggleMusic(userId);
  }

  /**
   * POST /api/personalization/sound/effects/toggle
   * Alterna efeitos
   */
  @Post('sound/effects/toggle')
  async toggleEffects(@Req() req: any) {
    const userId = req.user.sub;
    return this.soundService.toggleEffects(userId);
  }

  /**
   * POST /api/personalization/sound/music/volume
   * Define volume de música
   */
  @Post('sound/music/volume')
  async setMusicVolume(
    @Req() req: any,
    @Body() body: { volume: number },
  ) {
    const userId = req.user.sub;
    return this.soundService.setMusicVolume(userId, body.volume);
  }

  /**
   * POST /api/personalization/sound/effects/volume
   * Define volume de efeitos
   */
  @Post('sound/effects/volume')
  async setEffectsVolume(
    @Req() req: any,
    @Body() body: { volume: number },
  ) {
    const userId = req.user.sub;
    return this.soundService.setEffectsVolume(userId, body.volume);
  }

  /**
   * POST /api/personalization/sound/music/:musicId
   * Define música de fundo
   */
  @Post('sound/music/:musicId')
  async setBackgroundMusic(
    @Req() req: any,
    @Param('musicId') musicId: string,
  ) {
    const userId = req.user.sub;
    return this.soundService.setBackgroundMusic(userId, musicId);
  }

  // ==================== PROFILE ====================

  /**
   * GET /api/personalization/profile
   * Obtém perfil completo
   */
  @Get('profile')
  async getUserProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.profileService.getUserProfile(userId);
  }

  /**
   * PUT /api/personalization/profile
   * Atualiza perfil
   */
  @Put('profile')
  async updateProfile(
    @Req() req: any,
    @Body()
    body: {
      displayName?: string;
      bio?: string;
      location?: string;
      website?: string;
    },
  ) {
    const userId = req.user.sub;
    return this.profileService.updateProfile(userId, body);
  }

  /**
   * POST /api/personalization/profile/bio
   * Atualiza bio
   */
  @Post('profile/bio')
  async updateBio(@Req() req: any, @Body() body: { bio: string }) {
    const userId = req.user.sub;
    return this.profileService.updateBio(userId, body.bio);
  }

  /**
   * POST /api/personalization/profile/location
   * Atualiza localização
   */
  @Post('profile/location')
  async updateLocation(
    @Req() req: any,
    @Body() body: { location: string },
  ) {
    const userId = req.user.sub;
    return this.profileService.updateLocation(userId, body.location);
  }

  /**
   * POST /api/personalization/profile/website
   * Atualiza website
   */
  @Post('profile/website')
  async updateWebsite(@Req() req: any, @Body() body: { website: string }) {
    const userId = req.user.sub;
    return this.profileService.updateWebsite(userId, body.website);
  }

  /**
   * GET /api/personalization/profile/:userId/public
   * Obtém perfil público
   */
  @Get('profile/:userId/public')
  async getPublicProfile(@Param('userId') userId: string) {
    return this.profileService.getPublicProfile(userId);
  }

  /**
   * GET /api/personalization/profile/:userId/stats
   * Obtém estatísticas
   */
  @Get('profile/:userId/stats')
  async getPlayerStats(@Param('userId') userId: string) {
    return this.profileService.getPlayerStats(userId);
  }
}

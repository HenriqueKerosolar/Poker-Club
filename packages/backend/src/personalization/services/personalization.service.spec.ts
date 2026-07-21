import { describe, it, expect, beforeEach } from '@jest/globals';
import { AvatarService } from './avatar.service';
import { ThemeService } from './theme.service';
import { SoundService } from './sound.service';
import { ProfileService } from './profile.service';

/**
 * Testes de Personalización
 */
describe('PersonalizationServices', () => {
  let avatarService: AvatarService;
  let themeService: ThemeService;
  let soundService: SoundService;
  let profileService: ProfileService;

  const mockPrisma = {
    userProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customTheme: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    game: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    avatarService = new AvatarService(mockPrisma as any);
    themeService = new ThemeService(mockPrisma as any);
    soundService = new SoundService(mockPrisma as any);
    profileService = new ProfileService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('AvatarService', () => {
    it('gera avatar procedural', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({
        userId: 'user_1',
        avatarUrl: 'data:image/svg+xml;base64,...',
        avatarType: 'procedural',
      });

      const result = await avatarService.generateProceduralAvatar(
        'user_1',
        'alice',
      );

      expect(result).toContain('data:image/svg+xml');
      expect(mockPrisma.userProfile.upsert).toHaveBeenCalled();
    });

    it('retorna presets de avatar', () => {
      const presets = avatarService.getAvatarPresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
      expect(presets[0]).toHaveProperty('url');
    });

    it('seleciona preset de avatar', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({
        userId: 'user_1',
        avatarUrl: 'https://api.dicebear.com/...',
      });

      const result = await avatarService.selectPresetAvatar(
        'user_1',
        'avatar_cat',
      );

      expect(result).toBeTruthy();
    });

    it('rejeita preset inválido', async () => {
      expect(() =>
        avatarService.selectPresetAvatar('user_1', 'invalid_preset'),
      ).rejects.toThrow('não encontrado');
    });
  });

  describe('ThemeService', () => {
    it('define tema do usuário', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({
        userId: 'user_1',
        theme: 'dark',
      });

      const result = await themeService.setTheme('user_1', 'dark');

      expect(result.theme).toBe('dark');
    });

    it('obtém tema do usuário', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        theme: 'dark',
      });

      const result = await themeService.getUserTheme('user_1');

      expect(result).toHaveProperty('colors');
      expect(result.isDark).toBe(true);
    });

    it('retorna temas disponíveis', () => {
      const themes = themeService.getAvailableThemes();

      expect(themes.length).toBeGreaterThan(0);
      expect(themes[0]).toHaveProperty('id');
      expect(themes[0]).toHaveProperty('colors');
    });

    it('cria tema customizado', async () => {
      mockPrisma.customTheme.create.mockResolvedValue({
        id: 'custom_1',
        userId: 'user_1',
        name: 'Meu Tema',
        colors: { background: '#fff', primary: '#000', surface: '#f5f5f5', text: '#000' },
      });

      const result = await themeService.createCustomTheme('user_1', 'Meu Tema', {
        background: '#fff',
        primary: '#000',
        surface: '#f5f5f5',
        text: '#000',
      });

      expect(result.id).toBe('custom_1');
    });

    it('rejeita tema customizado incompleto', async () => {
      expect(() =>
        themeService.createCustomTheme('user_1', 'Meu Tema', {
          background: '#fff',
          // Faltam cores obrigatórias
        } as any),
      ).rejects.toThrow('obrigatória');
    });
  });

  describe('SoundService', () => {
    it('define preferências de som', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({
        userId: 'user_1',
        musicVolume: 80,
        effectsVolume: 60,
      });

      const result = await soundService.setSoundPreferences('user_1', {
        musicVolume: 80,
        effectsVolume: 60,
      });

      expect(result.musicVolume).toBe(80);
    });

    it('valida volume entre 0-100', async () => {
      expect(() =>
        soundService.setSoundPreferences('user_1', { musicVolume: 150 }),
      ).rejects.toThrow('0-100');
    });

    it('retorna músicas disponíveis', () => {
      const musics = soundService.getAvailableBackgroundMusic();

      expect(musics.length).toBeGreaterThan(0);
      expect(musics[0]).toHaveProperty('id');
      expect(musics[0]).toHaveProperty('name');
    });

    it('retorna efeitos sonoros', () => {
      const effects = soundService.getAvailableSoundEffects();

      expect(effects.length).toBeGreaterThan(0);
      expect(effects[0]).toHaveProperty('id');
      expect(effects[0]).toHaveProperty('url');
    });

    it('alterna música de fundo', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        musicEnabled: true,
      });
      mockPrisma.userProfile.update.mockResolvedValue({
        musicEnabled: false,
      });

      const result = await soundService.toggleMusic('user_1');

      expect(result.musicEnabled).toBe(false);
    });
  });

  describe('ProfileService', () => {
    it('atualiza perfil do usuário', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({
        userId: 'user_1',
        displayName: 'Alice',
        bio: 'Amante de poker',
      });

      const result = await profileService.updateProfile('user_1', {
        displayName: 'Alice',
        bio: 'Amante de poker',
      });

      expect(result.displayName).toBe('Alice');
    });

    it('valida comprimento de bio', async () => {
      const longBio = 'a'.repeat(501);

      expect(() =>
        profileService.updateProfile('user_1', { bio: longBio }),
      ).rejects.toThrow('muito longa');
    });

    it('obtém estatísticas do jogador', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        {
          id: 'game_1',
          finalResult: { user_1: 100 },
        },
        {
          id: 'game_2',
          finalResult: { user_1: -50 },
        },
      ]);

      const stats = await profileService.getPlayerStats('user_1');

      expect(stats.gamesPlayed).toBe(2);
      expect(stats.gamesWon).toBe(1);
      expect(stats.winRate).toBe(50);
    });

    it('obtém perfil público', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        displayName: 'Alice',
        bio: 'Jogadora',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        username: 'alice',
      });
      mockPrisma.game.findMany.mockResolvedValue([]);

      const profile = await profileService.getPublicProfile('user_1');

      expect(profile.user.username).toBe('alice');
      expect(profile.profile.displayName).toBe('Alice');
      expect(profile).not.toHaveProperty('email');
    });
  });
});

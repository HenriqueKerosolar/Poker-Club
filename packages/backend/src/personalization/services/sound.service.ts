import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * SoundService - Música, efeitos sonoros, preferências de áudio
 * Suporta: background music, sound effects, volume control
 */
@Injectable()
export class SoundService {
  private logger = new Logger('SoundService');

  constructor(private prisma: PrismaService) {}

  /**
   * Define configurações de som
   */
  async setSoundPreferences(
    userId: string,
    preferences: {
      musicVolume?: number; // 0-100
      effectsVolume?: number; // 0-100
      musicEnabled?: boolean;
      effectsEnabled?: boolean;
      backgroundMusic?: string;
    },
  ): Promise<any> {
    // Valida volumes
    if (
      preferences.musicVolume !== undefined &&
      (preferences.musicVolume < 0 || preferences.musicVolume > 100)
    ) {
      throw new BadRequestException('Volume deve estar entre 0-100');
    }

    if (
      preferences.effectsVolume !== undefined &&
      (preferences.effectsVolume < 0 || preferences.effectsVolume > 100)
    ) {
      throw new BadRequestException('Volume deve estar entre 0-100');
    }

    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        musicVolume: preferences.musicVolume,
        effectsVolume: preferences.effectsVolume,
        musicEnabled: preferences.musicEnabled,
        effectsEnabled: preferences.effectsEnabled,
        backgroundMusic: preferences.backgroundMusic,
      },
      create: {
        userId,
        musicVolume: preferences.musicVolume ?? 70,
        effectsVolume: preferences.effectsVolume ?? 70,
        musicEnabled: preferences.musicEnabled ?? true,
        effectsEnabled: preferences.effectsEnabled ?? true,
        backgroundMusic: preferences.backgroundMusic || 'casino_jazz',
      },
    });

    this.logger.log(`Preferências de som atualizado: ${userId}`);

    return this.formatSoundPreferences(userProfile);
  }

  /**
   * Obtém preferências de som do usuário
   */
  async getUserSoundPreferences(userId: string): Promise<any> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    return this.formatSoundPreferences(profile);
  }

  /**
   * Lista músicas de fundo disponíveis
   */
  getAvailableBackgroundMusic(): Array<{
    id: string;
    name: string;
    artist: string;
    url: string;
    duration: number;
  }> {
    return [
      {
        id: 'casino_jazz',
        name: 'Casino Jazz',
        artist: 'Poker Ambience',
        url: 'https://assets.pokergame.com/music/casino_jazz.mp3',
        duration: 180,
      },
      {
        id: 'night_lounge',
        name: 'Night Lounge',
        artist: 'Poker Ambience',
        url: 'https://assets.pokergame.com/music/night_lounge.mp3',
        duration: 200,
      },
      {
        id: 'digital_vibes',
        name: 'Digital Vibes',
        artist: 'Poker Ambience',
        url: 'https://assets.pokergame.com/music/digital_vibes.mp3',
        duration: 220,
      },
      {
        id: 'epic_stakes',
        name: 'Epic Stakes',
        artist: 'Poker Ambience',
        url: 'https://assets.pokergame.com/music/epic_stakes.mp3',
        duration: 240,
      },
      {
        id: 'silent',
        name: 'Silencioso',
        artist: 'Poker Ambience',
        url: '',
        duration: 0,
      },
    ];
  }

  /**
   * Lista efeitos sonoros disponíveis
   */
  getAvailableSoundEffects(): Array<{
    id: string;
    name: string;
    url: string;
    description: string;
  }> {
    return [
      {
        id: 'card_flip',
        name: 'Card Flip',
        url: 'https://assets.pokergame.com/sounds/card_flip.mp3',
        description: 'Som ao virar carta',
      },
      {
        id: 'chip_slide',
        name: 'Chip Slide',
        url: 'https://assets.pokergame.com/sounds/chip_slide.mp3',
        description: 'Som ao mover fichas',
      },
      {
        id: 'chip_drop',
        name: 'Chip Drop',
        url: 'https://assets.pokergame.com/sounds/chip_drop.mp3',
        description: 'Som ao descartar fichas',
      },
      {
        id: 'bell_chime',
        name: 'Bell Chime',
        url: 'https://assets.pokergame.com/sounds/bell_chime.mp3',
        description: 'Som de notificação',
      },
      {
        id: 'victory_chime',
        name: 'Victory Chime',
        url: 'https://assets.pokergame.com/sounds/victory_chime.mp3',
        description: 'Som de vitória',
      },
      {
        id: 'lose_sound',
        name: 'Lose Sound',
        url: 'https://assets.pokergame.com/sounds/lose.mp3',
        description: 'Som de derrota',
      },
      {
        id: 'bet_confirm',
        name: 'Bet Confirm',
        url: 'https://assets.pokergame.com/sounds/bet_confirm.mp3',
        description: 'Som de confirmação de aposta',
      },
      {
        id: 'all_in',
        name: 'All In',
        url: 'https://assets.pokergame.com/sounds/all_in.mp3',
        description: 'Som de all-in',
      },
      {
        id: 'timer_warning',
        name: 'Timer Warning',
        url: 'https://assets.pokergame.com/sounds/timer_warning.mp3',
        description: 'Som de aviso de tempo',
      },
    ];
  }

  /**
   * Alterna som de efeitos
   */
  async toggleEffects(userId: string): Promise<any> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const newState = !profile?.effectsEnabled;

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: { effectsEnabled: newState },
    });

    this.logger.log(`Efeitos sonoros: ${userId} → ${newState}`);

    return { effectsEnabled: newState };
  }

  /**
   * Alterna música de fundo
   */
  async toggleMusic(userId: string): Promise<any> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const newState = !profile?.musicEnabled;

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: { musicEnabled: newState },
    });

    this.logger.log(`Música de fundo: ${userId} → ${newState}`);

    return { musicEnabled: newState };
  }

  /**
   * Define volume de música
   */
  async setMusicVolume(userId: string, volume: number): Promise<any> {
    if (volume < 0 || volume > 100) {
      throw new BadRequestException('Volume deve estar entre 0-100');
    }

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: { musicVolume: volume },
    });

    this.logger.log(`Volume de música: ${userId} → ${volume}`);

    return { musicVolume: volume };
  }

  /**
   * Define volume de efeitos
   */
  async setEffectsVolume(userId: string, volume: number): Promise<any> {
    if (volume < 0 || volume > 100) {
      throw new BadRequestException('Volume deve estar entre 0-100');
    }

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: { effectsVolume: volume },
    });

    this.logger.log(`Volume de efeitos: ${userId} → ${volume}`);

    return { effectsVolume: volume };
  }

  /**
   * Define música de fundo padrão
   */
  async setBackgroundMusic(userId: string, musicId: string): Promise<any> {
    const musics = this.getAvailableBackgroundMusic();
    const music = musics.find((m) => m.id === musicId);

    if (!music) {
      throw new BadRequestException('Música não encontrada');
    }

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: { backgroundMusic: musicId },
    });

    this.logger.log(`Música de fundo: ${userId} → ${musicId}`);

    return {
      backgroundMusic: musicId,
      name: music.name,
      artist: music.artist,
    };
  }

  /**
   * Formata preferências para resposta
   */
  private formatSoundPreferences(profile: any): any {
    return {
      musicVolume: profile?.musicVolume ?? 70,
      effectsVolume: profile?.effectsVolume ?? 70,
      musicEnabled: profile?.musicEnabled ?? true,
      effectsEnabled: profile?.effectsEnabled ?? true,
      backgroundMusic: profile?.backgroundMusic || 'casino_jazz',
    };
  }
}

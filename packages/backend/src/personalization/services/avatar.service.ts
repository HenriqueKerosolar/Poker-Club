import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

/**
 * AvatarService - Geração e gerenciamento de avatares
 * Suporta: upload, geração procedural, presets
 */
@Injectable()
export class AvatarService {
  private logger = new Logger('AvatarService');
  private readonly MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

  constructor(private prisma: PrismaService) {}

  /**
   * Gera avatar procedural baseado em username
   * Usa hash para gerar cores consistentes
   */
  async generateProceduralAvatar(userId: string, username: string): Promise<string> {
    // Hash do username gera número consistente
    const hash = crypto
      .createHash('sha256')
      .update(username)
      .digest('hex');

    const colors = this.extractColorPalette(hash);
    const pattern = this.selectPattern(hash);

    // SVG avatar procedural
    const avatarSvg = this.createProceduralSvg(colors, pattern, username);

    // Base64 encode
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(avatarSvg).toString('base64')}`;

    // Salva no banco
    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl: dataUrl },
      create: {
        userId,
        avatarUrl: dataUrl,
        avatarType: 'procedural',
      },
    });

    this.logger.log(`Avatar gerado: ${userId} (procedural)`);
    return dataUrl;
  }

  /**
   * Upload de avatar customizado
   */
  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    if (buffer.length > this.MAX_AVATAR_SIZE) {
      throw new BadRequestException('Avatar muito grande (máx 2MB)');
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) {
      throw new BadRequestException('Formato inválido (jpeg, png, webp)');
    }

    // Base64 encode
    const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;

    // Salva no banco
    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl: dataUrl },
      create: {
        userId,
        avatarUrl: dataUrl,
        avatarType: 'upload',
      },
    });

    this.logger.log(`Avatar upado: ${userId} (upload)`);
    return dataUrl;
  }

  /**
   * Seleciona avatar de preset
   */
  async selectPresetAvatar(userId: string, presetId: string): Promise<string> {
    const presets = this.getAvatarPresets();
    const preset = presets.find((p) => p.id === presetId);

    if (!preset) {
      throw new BadRequestException('Preset não encontrado');
    }

    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl: preset.url },
      create: {
        userId,
        avatarUrl: preset.url,
        avatarType: 'preset',
      },
    });

    this.logger.log(`Avatar preset: ${userId} (${presetId})`);
    return preset.url;
  }

  /**
   * Lista avatares disponíveis (presets)
   */
  getAvatarPresets(): Array<{ id: string; name: string; url: string }> {
    return [
      {
        id: 'avatar_cat',
        name: 'Gatinho',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cat',
      },
      {
        id: 'avatar_dog',
        name: 'Cachorrinho',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dog',
      },
      {
        id: 'avatar_robot',
        name: 'Robô',
        url: 'https://api.dicebear.com/7.x/bottts/svg',
      },
      {
        id: 'avatar_alien',
        name: 'Alien',
        url: 'https://api.dicebear.com/7.x/aliens/svg',
      },
      {
        id: 'avatar_monster',
        name: 'Monstro',
        url: 'https://api.dicebear.com/7.x/monsters/svg',
      },
      {
        id: 'avatar_pixel',
        name: 'Pixel Art',
        url: 'https://api.dicebear.com/7.x/pixel-art/svg',
      },
    ];
  }

  /**
   * Obtém avatar do usuário
   */
  async getUserAvatar(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    return profile?.avatarUrl || '';
  }

  /**
   * Extrai paleta de cores de hash
   */
  private extractColorPalette(hash: string): {
    primary: string;
    secondary: string;
    accent: string;
  } {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];

    const hash1 = parseInt(hash.substring(0, 8), 16) % colors.length;
    const hash2 = parseInt(hash.substring(8, 16), 16) % colors.length;
    const hash3 = parseInt(hash.substring(16, 24), 16) % colors.length;

    return {
      primary: colors[hash1],
      secondary: colors[hash2],
      accent: colors[hash3],
    };
  }

  /**
   * Seleciona padrão baseado em hash
   */
  private selectPattern(hash: string): string {
    const patterns = ['circles', 'stripes', 'grid', 'waves', 'dots'];
    const index = parseInt(hash.substring(24, 32), 16) % patterns.length;
    return patterns[index];
  }

  /**
   * Cria SVG procedural
   */
  private createProceduralSvg(
    colors: any,
    pattern: string,
    username: string,
  ): string {
    const size = 200;
    const initial = username.charAt(0).toUpperCase();

    return `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="${colors.secondary}" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="${size}" height="${size}" fill="${colors.primary}"/>
        <rect width="${size}" height="${size}" fill="url(#pat)"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="${colors.secondary}"/>
        <text
          x="${size / 2}"
          y="${size / 2 + 20}"
          font-size="80"
          font-weight="bold"
          text-anchor="middle"
          fill="white"
          font-family="Arial, sans-serif"
        >
          ${initial}
        </text>
      </svg>
    `;
  }
}

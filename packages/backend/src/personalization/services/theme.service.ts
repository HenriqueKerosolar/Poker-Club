import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

/**
 * ThemeService - Temas de interface (light, dark, custom)
 * Salva preferências por usuário
 */
@Injectable()
export class ThemeService {
  private logger = new Logger('ThemeService');

  constructor(private prisma: PrismaService) {}

  /**
   * Define tema do usuário
   */
  async setTheme(
    userId: string,
    themeName: string,
  ): Promise<any> {
    const themes = this.getAvailableThemes();
    const theme = themes.find((t) => t.id === themeName);

    if (!theme) {
      throw new BadRequestException('Tema não encontrado');
    }

    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { theme: themeName },
      create: {
        userId,
        theme: themeName,
      },
    });

    this.logger.log(`Tema atualizado: ${userId} → ${themeName}`);
    return { theme: themeName, colors: theme.colors };
  }

  /**
   * Obtém tema do usuário
   */
  async getUserTheme(userId: string): Promise<any> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const themeName = profile?.theme || 'light';
    const themes = this.getAvailableThemes();
    const theme = themes.find((t) => t.id === themeName);

    return {
      id: theme.id,
      name: theme.name,
      colors: theme.colors,
      isDark: theme.isDark,
    };
  }

  /**
   * Lista temas disponíveis
   */
  getAvailableThemes(): Array<{
    id: string;
    name: string;
    isDark: boolean;
    colors: Record<string, string>;
  }> {
    return [
      {
        id: 'light',
        name: 'Claro',
        isDark: false,
        colors: {
          background: '#FFFFFF',
          surface: '#F5F5F5',
          primary: '#007AFF',
          secondary: '#5AC8FA',
          text: '#000000',
          textSecondary: '#666666',
          border: '#E0E0E0',
          success: '#34C759',
          warning: '#FF9500',
          error: '#FF3B30',
        },
      },
      {
        id: 'dark',
        name: 'Escuro',
        isDark: true,
        colors: {
          background: '#1A1A1A',
          surface: '#2D2D2D',
          primary: '#0A84FF',
          secondary: '#30B0C0',
          text: '#FFFFFF',
          textSecondary: '#A0A0A0',
          border: '#404040',
          success: '#30B0C0',
          warning: '#FF9500',
          error: '#FF453A',
        },
      },
      {
        id: 'highcontrast',
        name: 'Alto Contraste',
        isDark: true,
        colors: {
          background: '#000000',
          surface: '#1A1A1A',
          primary: '#FFFF00',
          secondary: '#00FFFF',
          text: '#FFFFFF',
          textSecondary: '#CCCCCC',
          border: '#FFFFFF',
          success: '#00FF00',
          warning: '#FFFF00',
          error: '#FF0000',
        },
      },
      {
        id: 'forest',
        name: 'Floresta',
        isDark: false,
        colors: {
          background: '#EBF4E8',
          surface: '#D4E8CF',
          primary: '#2D5016',
          secondary: '#4A7C3F',
          text: '#1B3A0C',
          textSecondary: '#3D5925',
          border: '#A8C89C',
          success: '#2D5016',
          warning: '#D4932F',
          error: '#C83C3C',
        },
      },
      {
        id: 'midnight',
        name: 'Meia-Noite',
        isDark: true,
        colors: {
          background: '#0F1419',
          surface: '#16202F',
          primary: '#00D9FF',
          secondary: '#7C3AED',
          text: '#E0E8FF',
          textSecondary: '#9CA3AF',
          border: '#2D3748',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      {
        id: 'sunset',
        name: 'Pôr do Sol',
        isDark: false,
        colors: {
          background: '#FFF7F0',
          surface: '#FFE8D6',
          primary: '#D97706',
          secondary: '#F59E0B',
          text: '#78350F',
          textSecondary: '#A16207',
          border: '#FED7AA',
          success: '#92400E',
          warning: '#D97706',
          error: '#DC2626',
        },
      },
    ];
  }

  /**
   * Customiza cores de um tema
   */
  async createCustomTheme(
    userId: string,
    themeName: string,
    colors: Record<string, string>,
  ): Promise<any> {
    if (!themeName || themeName.length < 3) {
      throw new BadRequestException('Nome do tema inválido');
    }

    // Valida cores (deve ter as cores essenciais)
    const requiredColors = [
      'background',
      'surface',
      'primary',
      'text',
    ];
    for (const color of requiredColors) {
      if (!colors[color]) {
        throw new BadRequestException(`Cor obrigatória: ${color}`);
      }
    }

    // Salva tema customizado
    const customTheme = await this.prisma.customTheme.create({
      data: {
        userId,
        name: themeName,
        colors: colors as any,
      },
    });

    this.logger.log(`Tema customizado criado: ${userId} → ${themeName}`);

    return {
      id: customTheme.id,
      name: customTheme.name,
      colors: customTheme.colors,
    };
  }

  /**
   * Lista temas customizados do usuário
   */
  async getUserCustomThemes(userId: string): Promise<any[]> {
    const themes = await this.prisma.customTheme.findMany({
      where: { userId },
    });

    return themes.map((t) => ({
      id: t.id,
      name: t.name,
      colors: t.colors,
    }));
  }

  /**
   * Aplica tema customizado
   */
  async applyCustomTheme(userId: string, themeId: string): Promise<any> {
    const theme = await this.prisma.customTheme.findUnique({
      where: { id: themeId },
    });

    if (!theme || theme.userId !== userId) {
      throw new BadRequestException('Tema não encontrado');
    }

    const userProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { customThemeId: themeId },
      create: {
        userId,
        customThemeId: themeId,
      },
    });

    this.logger.log(`Tema customizado aplicado: ${userId} → ${themeId}`);

    return {
      id: themeId,
      name: theme.name,
      colors: theme.colors,
    };
  }

  /**
   * Deleta tema customizado
   */
  async deleteCustomTheme(userId: string, themeId: string): Promise<void> {
    const theme = await this.prisma.customTheme.findUnique({
      where: { id: themeId },
    });

    if (!theme || theme.userId !== userId) {
      throw new BadRequestException('Tema não encontrado');
    }

    await this.prisma.customTheme.delete({
      where: { id: themeId },
    });

    this.logger.log(`Tema customizado deletado: ${userId} → ${themeId}`);
  }
}

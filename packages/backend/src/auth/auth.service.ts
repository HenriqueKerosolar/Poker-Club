import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, displayName?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email já registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName: displayName || email.split('@')[0],
        authProvider: 'email',
      },
    });

    const wallet = await this.prisma.wallet.create({
      data: {
        userId: user.id,
        saldoCents: 10000, // R$ 100 inicial
      },
    });

    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amountCents: 10000,
        description: 'Bônus de boas-vindas',
        beforeBalanceCents: 0,
        afterBalanceCents: 10000,
      },
    });

    return this.generateToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.authProvider !== 'email') {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const isValidPassword = await bcrypt.compare(password, user.password || '');
    if (!isValidPassword) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return this.generateToken(user);
  }

  async validateOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    displayName: string;
    avatar?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (user && user.authProvider !== 'google') {
      throw new BadRequestException(
        'Email já registrado com outro método de autenticação',
      );
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          displayName: profile.displayName,
          avatar: profile.avatar,
          googleId: profile.googleId,
          authProvider: 'google',
        },
      });

      const wallet = await this.prisma.wallet.create({
        data: {
          userId: user.id,
          saldoCents: 10000, // R$ 100 inicial
        },
      });

      await this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amountCents: 10000,
          description: 'Bônus de boas-vindas',
          beforeBalanceCents: 0,
          afterBalanceCents: 10000,
        },
      });
    }

    return user;
  }

  generateToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      return this.generateToken(user);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}

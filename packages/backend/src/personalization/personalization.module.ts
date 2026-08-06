import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

// Services
import { AvatarService } from './services/avatar.service';
import { ThemeService } from './services/theme.service';
import { SoundService } from './services/sound.service';
import { ProfileService } from './services/profile.service';

// Controllers
import { PersonalizationController } from './controllers/personalization.controller';

/**
 * PersonalizationModule - Avatares, temas, som, perfil
 */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PersonalizationController],
  providers: [AvatarService, ThemeService, SoundService, ProfileService],
  exports: [AvatarService, ThemeService, SoundService, ProfileService],
})
export class PersonalizationModule {}

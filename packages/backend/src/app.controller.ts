import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return this.appService.getHealth();
  }

  @Get('version')
  version() {
    return {
      version: '0.0.1',
      name: 'Poker Club API',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

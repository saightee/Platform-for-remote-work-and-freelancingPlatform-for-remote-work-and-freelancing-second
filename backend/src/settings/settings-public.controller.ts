import { Controller, Get } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Controller('settings')
export class SettingsPublicController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('registration-avatar')
  async getRequireAvatarOnRegistration() {
    return this.settingsService.getRequireAvatarOnRegistration();
  }
}

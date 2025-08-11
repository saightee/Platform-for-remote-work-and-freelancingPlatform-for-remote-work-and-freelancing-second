import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  async getGlobalApplicationLimit(): Promise<{ globalApplicationLimit: number | null }> {
    const setting = await this.settingsRepository.findOne({ where: { key: 'global_application_limit' } });
    let limit: number | null = setting ? parseInt(setting.value, 10) : null; 
    if (isNaN(limit) || !Number.isFinite(limit) || limit < 0) {
      limit = null; 
    }
    return { globalApplicationLimit: limit };
  }

  async setGlobalApplicationLimit(value: number): Promise<void> {
    let setting = await this.settingsRepository.findOne({ where: { key: 'global_application_limit' } });
    if (!setting) {
      setting = this.settingsRepository.create({ key: 'global_application_limit', value: value.toString() });
    } else {
      setting.value = value.toString();
    }
    await this.settingsRepository.save(setting);
  }
}
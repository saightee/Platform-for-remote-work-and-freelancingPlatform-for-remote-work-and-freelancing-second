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

  async getGlobalApplicationLimit(): Promise<number> {
    const setting = await this.settingsRepository.findOne({ where: { key: 'global_application_limit' } });
    return setting ? parseInt(setting.value, 10) : Infinity; // Если лимит не установлен, считаем его бесконечным
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
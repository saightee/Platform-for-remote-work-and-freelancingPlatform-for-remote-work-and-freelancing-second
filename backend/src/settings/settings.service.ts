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

  private CHAT_KEY = 'chat_notifications';

  async getChatNotificationSettings() {
    const row = await this.settingsRepository.findOne({ where: { key: this.CHAT_KEY } });
  
    const defaults = {
      enabled: true,
      onEmployerMessage: {
        immediate: true,
        delayedIfUnread: { enabled: true, minutes: 60 },
        after24hIfUnread: { enabled: true, hours: 24 },
        onlyFirstMessageInThread: false,
      },
      throttle: { perChatCount: 2, perMinutes: 60 },
    };

    if (!row?.value) return defaults;

    try {
      const parsed = JSON.parse(row.value) || {};
      return {
        ...defaults,
        ...parsed,
        onEmployerMessage: {
          ...defaults.onEmployerMessage,
          ...(parsed.onEmployerMessage || {}),
          delayedIfUnread: {
            ...defaults.onEmployerMessage.delayedIfUnread,
            ...(parsed.onEmployerMessage?.delayedIfUnread || {}),
          },
          after24hIfUnread: {
            ...defaults.onEmployerMessage.after24hIfUnread,
            ...(parsed.onEmployerMessage?.after24hIfUnread || {}),
          },
        },
        throttle: { ...defaults.throttle, ...(parsed.throttle || {}) },
      };
    } catch {
      return defaults;
    }
  }

  async setChatNotificationSettings(value: any) {
    const row = await this.settingsRepository.findOne({ where: { key: this.CHAT_KEY } });
    const toSave = row
      ? { ...row, value: JSON.stringify(value ?? {}) }
      : this.settingsRepository.create({ key: this.CHAT_KEY, value: JSON.stringify(value ?? {}) });
    await this.settingsRepository.save(toSave);
  }

  private REQUIRE_AVATAR_KEY = 'require_avatar_on_registration';

  async getRequireAvatarOnRegistration(): Promise<{ required: boolean }> {
    const row = await this.settingsRepository.findOne({ where: { key: this.REQUIRE_AVATAR_KEY } });
    if (!row) return { required: false };
    const v = (row.value || '').toLowerCase().trim();
    return { required: v === 'true' || v === '1' || v === 'yes' };
  }

  async setRequireAvatarOnRegistration(required: boolean): Promise<{ required: boolean }> {
    let row = await this.settingsRepository.findOne({ where: { key: this.REQUIRE_AVATAR_KEY } });
    if (!row) {
      row = this.settingsRepository.create({ key: this.REQUIRE_AVATAR_KEY, value: String(!!required) });
    } else {
      row.value = String(!!required);
    }
    await this.settingsRepository.save(row);
    return { required: !!required };
  }
}

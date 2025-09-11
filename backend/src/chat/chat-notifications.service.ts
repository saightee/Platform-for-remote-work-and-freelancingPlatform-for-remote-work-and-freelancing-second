import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Message } from './entities/message.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { User } from '../users/entities/user.entity';
import { SettingsService } from '../settings/settings.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

export interface ChatNotificationSettings {
  enabled: boolean;
  onEmployerMessage: {
    immediate: boolean;
    delayedIfUnread: { enabled: boolean; minutes: number };
    onlyFirstMessageInThread?: boolean;
  };
  throttle: { perChatCount: number; perMinutes: number };
}

@Injectable()
export class ChatNotificationsService {
  private readonly ZSET_KEY = 'chat:notif:zset';
  private readonly PENDING_KEY = (appId: string, userId: string) =>
    `chat:notif:pending:${appId}:${userId}`;
  private readonly THROTTLE_KEY = (appId: string, userId: string) =>
    `chat:notif:throttle:${appId}:${userId}`;

  private readonly QUEUE_POLL_MS = 20_000;

  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(JobApplication)
    private readonly jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly settingsService: SettingsService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {
    setInterval(() => this.processDueJobs().catch(() => {}), this.QUEUE_POLL_MS);
  }

  /** Вызывать из ChatService.createMessage сразу после save() */
  async onNewMessage(saved: Message, application: JobApplication) {
    const settings = await this.settingsService.getChatNotificationSettings();
    if (!settings.enabled) return;

    // уведомляем только при направлении работодатель -> соискатель
    const senderIsEmployer = saved.sender_id === application.job_post.employer_id;
    const recipientIsJobSeeker = saved.recipient_id === application.job_seeker_id;
    if (!senderIsEmployer || !recipientIsJobSeeker) return;

    if (settings.onEmployerMessage.onlyFirstMessageInThread) {
      // если это не первое сообщение в чате — пропускаем (отложенное всё равно можем поставить)
      const cnt = await this.messagesRepository.count({
        where: { job_application_id: saved.job_application_id },
      });
      if (cnt > 1 && !settings.onEmployerMessage.delayedIfUnread.enabled) return;
    }

    const employerName =
      application.job_post?.employer?.username || 'Employer'; // ← У нас employer — User, без company_name/user. :contentReference[oaicite:2]{index=2}
    const jobTitle = application.job_post?.title || 'Job';

    const online = await this.isRecipientOnline(saved.recipient_id); // если онлайн — не шлём email (экономим нервы) :contentReference[oaicite:3]{index=3}

    // Мгновенно
    if (settings.onEmployerMessage.immediate && !online) {
      const ok = await this.maybeSendEmailWithThrottle(
        saved.job_application_id,
        saved.recipient_id,
        async () => {
          const recipient = await this.usersRepository.findOne({ where: { id: saved.recipient_id } });
          if (!recipient?.email) return;
          await this.emailService.sendChatNewMessageNotification({
            toEmail: recipient.email,
            username: recipient.username || 'there',
            employerName,
            jobTitle,
            messageSnippet: this.snippet(saved.content),
          });
        },
        settings,
      );
      if (!ok) {
        // дросселирование — молча выходим
      }
    }

    // Отложенно
    if (settings.onEmployerMessage.delayedIfUnread.enabled) {
      const dueAtMs =
        Date.now() + settings.onEmployerMessage.delayedIfUnread.minutes * 60_000;
      await this.enqueueDelayedIfUnread(saved, dueAtMs);
    }
  }

  private async enqueueDelayedIfUnread(saved: Message, dueAtMs: number) {
    const client = this.redis.getClient();
    const pendingKey = this.PENDING_KEY(saved.job_application_id, saved.recipient_id);

    // === заменили небезопасный типами SET NX PX на setnx + pexpire
    const created = await client.setnx(pendingKey, '1');
    if (!created) return; // уже есть задача
    const ttlMs = Math.max(dueAtMs - Date.now(), 60_000);
    await client.pexpire(pendingKey, ttlMs + 300_000);

    const payload = JSON.stringify({
      type: 'delayedIfUnread',
      jobApplicationId: saved.job_application_id,
      recipientId: saved.recipient_id,
      messageId: saved.id,
      createdAt: saved.created_at?.toISOString() || new Date().toISOString(),
    });
    await client.zadd(this.ZSET_KEY, String(dueAtMs), payload);
  }

  private async processDueJobs() {
    const client = this.redis.getClient();
    const now = Date.now();
    const due = await client.zrangebyscore(this.ZSET_KEY, 0, now, 'LIMIT', 0, 100);
    if (!due?.length) return;

    for (const payload of due) {
      try {
        const job = JSON.parse(payload) as {
          type: 'delayedIfUnread';
          jobApplicationId: string;
          recipientId: string;
          messageId: string;
          createdAt: string;
        };

        await client.zrem(this.ZSET_KEY, payload);
        await client.del(this.PENDING_KEY(job.jobApplicationId, job.recipientId));

        // есть ли непрочитанные?
        const unreadCount = await this.messagesRepository.count({
          where: {
            job_application_id: job.jobApplicationId,
            recipient_id: job.recipientId,
            is_read: false,
            sender_id: Not(job.recipientId),
          },
        });
        if (unreadCount <= 0) continue;

        const app = await this.jobApplicationsRepository.findOne({
          where: { id: job.jobApplicationId },
          relations: ['job_post', 'job_post.employer', 'job_seeker'],
        });
        if (!app) continue;

        const recipient = await this.usersRepository.findOne({ where: { id: job.recipientId } });
        if (!recipient?.email) continue;

        const settings = await this.settingsService.getChatNotificationSettings();
        if (!settings.enabled || !settings.onEmployerMessage.delayedIfUnread.enabled) continue;

        const online = await this.isRecipientOnline(job.recipientId);
        if (online) continue;

        await this.maybeSendEmailWithThrottle(
          job.jobApplicationId,
          job.recipientId,
          async () => {
            const employerName = app.job_post?.employer?.username || 'Employer'; // ← фикс
            const jobTitle = app.job_post?.title || 'Job';

            await this.emailService.sendChatNewMessageNotification({
              toEmail: recipient.email,
              username: recipient.username || 'there',
              employerName,
              jobTitle,
              messageSnippet: 'You have unread messages in the chat.',
            });
          },
          settings,
        );
      } catch {
        // проглатываем единичные сбои
      }
    }
  }

  private async maybeSendEmailWithThrottle(
    jobApplicationId: string,
    recipientId: string,
    sendFn: () => Promise<void>,
    settings: ChatNotificationSettings,
  ): Promise<boolean> {
    const client = this.redis.getClient();
    const key = this.THROTTLE_KEY(jobApplicationId, recipientId);
    const nowCount = await client.incr(key);
    if (nowCount === 1) {
      await client.expire(key, settings.throttle.perMinutes * 60);
    }
    if (nowCount > settings.throttle.perChatCount) {
      return false; // дросселирование
    }
    await sendFn();
    return true;
  }

  private snippet(text: string, maxLen = 140) {
    const s = (text || '').replace(/\s+/g, ' ').trim();
    return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
  }

  private async isRecipientOnline(userId: string): Promise<boolean> {
    // ключ ставится/снимается гейтвеем: set(`socket:${userId}`, socketId, 3600) / del(...) — используем это как «онлайн» признак
    const client = this.redis.getClient();
    const socketId = await client.get(`socket:${userId}`); // ← ChatGateway пишет этот ключ :contentReference[oaicite:4]{index=4}
    return Boolean(socketId);
  }
}
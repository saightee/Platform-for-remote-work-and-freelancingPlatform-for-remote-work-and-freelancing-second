import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Message } from './entities/message.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { User } from '../users/entities/user.entity';
import { SettingsService } from '../settings/settings.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';

export interface ChatNotificationSettings {
  enabled: boolean;
  onEmployerMessage: {
    immediate: boolean;
    delayedIfUnread: { enabled: boolean; minutes: number };
    after24hIfUnread: { enabled: boolean; hours: number };
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
  ) {
    setInterval(() => this.processDueJobs().catch(() => {}), this.QUEUE_POLL_MS);
  }

  async onNewMessage(saved: Message, application: JobApplication) {
    const settings = await this.settingsService.getChatNotificationSettings();
    if (!settings.enabled) return;

    const senderIsEmployer = saved.sender_id === application.job_post.employer_id;
    const recipientIsJobSeeker = saved.recipient_id === application.job_seeker_id;
    if (!senderIsEmployer || !recipientIsJobSeeker) return;

    if (settings.onEmployerMessage.onlyFirstMessageInThread) {
      const cnt = await this.messagesRepository.count({ where: { job_application_id: saved.job_application_id } });
      if (cnt > 1 && !settings.onEmployerMessage.delayedIfUnread.enabled && !settings.onEmployerMessage.after24hIfUnread.enabled) {
        return;
      }
    }

    if (settings.onEmployerMessage.immediate) {
      await this.maybeSendEmailWithThrottle(
        saved.job_application_id,
        saved.recipient_id,
        async () => {
          const recipient = await this.usersRepository.findOne({ where: { id: saved.recipient_id } });
          if (!recipient?.email) return;
          const employerName = application.job_post?.employer?.username || 'Employer';
          const jobTitle = application.job_post?.title || 'Job';
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
    }

    if (settings.onEmployerMessage.delayedIfUnread.enabled) {
      const dueAtMs = Date.now() + settings.onEmployerMessage.delayedIfUnread.minutes * 60_000;
      await this.enqueueReminder(saved, dueAtMs, 'delayedIfUnread');
    }

    if (settings.onEmployerMessage.after24hIfUnread.enabled) {
      const dueAtMs = Date.now() + settings.onEmployerMessage.after24hIfUnread.hours * 3_600_000;
      await this.enqueueReminder(saved, dueAtMs, 'after24hIfUnread');
    }
  }

  private async enqueueReminder(
    saved: Message,
    dueAtMs: number,
    type: 'delayedIfUnread' | 'after24hIfUnread',
  ) {
    const client = this.redis.getClient();
    const base = this.PENDING_KEY(saved.job_application_id, saved.recipient_id);
    const pendingKey = `${base}:${type}`;

    const created = await client.setnx(pendingKey, '1');
    if (!created) return;
    const ttlMs = Math.max(dueAtMs - Date.now(), 60_000);
    await client.pexpire(pendingKey, ttlMs + 300_000);

    const payload = JSON.stringify({
      type,
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
          type: 'delayedIfUnread' | 'after24hIfUnread';
          jobApplicationId: string;
          recipientId: string;
          messageId: string;
          createdAt: string;
        };

        await client.zrem(this.ZSET_KEY, payload);
        await client.del(`${this.PENDING_KEY(job.jobApplicationId, job.recipientId)}:${job.type}`);

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
        if (!settings.enabled) continue;

        if (job.type === 'delayedIfUnread' && !settings.onEmployerMessage.delayedIfUnread.enabled) continue;
        if (job.type === 'after24hIfUnread' && !settings.onEmployerMessage.after24hIfUnread.enabled) continue;

        await this.maybeSendEmailWithThrottle(
          job.jobApplicationId,
          job.recipientId,
          async () => {
            const employerName = app.job_post?.employer?.username || 'Employer';
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
      return false;
    }
    await sendFn();
    return true;
  }

  private snippet(text: string, maxLen = 140) {
    const s = (text || '').replace(/\s+/g, ' ').trim();
    return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
  }

  private async isRecipientOnline(userId: string): Promise<boolean> {
    const client = this.redis.getClient();
    const socketId = await client.get(`socket:${userId}`);
    return Boolean(socketId);
  }
}
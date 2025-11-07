import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message } from './entities/message.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { ChatNotificationsService } from './chat-notifications.service';


@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    private readonly chatNotifications: ChatNotificationsService,
  ) {}

  async hasChatAccess(userId: string, jobApplicationId: string): Promise<JobApplication> {
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: jobApplicationId },
      relations: ['job_post', 'job_seeker', 'job_post.employer'],
    });
    if (!application) throw new NotFoundException('Job application not found');

    if (!['Pending', 'Accepted'].includes(application.status)) {
      throw new UnauthorizedException('Chat is available only for pending/accepted applications');
    }

    if (
      application.job_seeker_id !== userId &&
      application.job_post.employer_id !== userId
    ) {
      throw new UnauthorizedException('No access to this chat');
    }

    return application;
  }

  async createMessage(senderId: string, jobApplicationId: string, content: string): Promise<Message> {
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: jobApplicationId },
      relations: ['job_post', 'job_seeker', 'job_post.employer'],
    });
    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    const recipientId =
      senderId === application.job_seeker_id
        ? application.job_post.employer_id
        : application.job_seeker_id;

    const message = this.messagesRepository.create({
      job_application_id: jobApplicationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      is_read: false,
    });

    const saved = await this.messagesRepository.save(message);

    this.chatNotifications.onNewMessage(saved, application).catch(() => {});

    return saved;
  }

  async getChatHistory(jobApplicationId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { job_application_id: jobApplicationId },
      relations: ['sender', 'recipient'],
      order: { created_at: 'ASC' },
    });
  }

  async getChatHistoryForAdmin(
    jobApplicationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ total: number; data: any[] }> {
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: jobApplicationId },
      relations: ['job_post', 'job_post.employer', 'job_seeker'],
    });
    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    const qb = this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .where('message.job_application_id = :jobApplicationId', { jobApplicationId })
      .orderBy('message.created_at', 'ASC');

    const total = await qb.getCount();
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    qb.skip(skip).take(Math.max(1, limit));

    const rawMessages = await qb.getMany();

    const data = rawMessages.map(m => ({
      id: m.id,
      job_application_id: m.job_application_id,
      sender_id: m.sender_id,
      recipient_id: m.recipient_id,
      content: m.content,
      created_at: m.created_at,
      is_read: m.is_read,
      sender: m.sender ? {
        id: m.sender.id,
        username: m.sender.username,
        email: m.sender.email,
        role: m.sender.role,
      } : null,
      recipient: m.recipient ? {
        id: m.recipient.id,
        username: m.recipient.username,
        email: m.recipient.email,
        role: m.recipient.role,
      } : null,
    }));

    return { total, data };
  }

  async getChatHistoryForUser(userId: string, jobApplicationId: string, page: number = 1, limit: number = 10): Promise<{ total: number; data: Message[] }> {
    await this.hasChatAccess(userId, jobApplicationId);

    const query = this.messagesRepository.createQueryBuilder('message')
      .where('message.job_application_id = :jobApplicationId', { jobApplicationId })
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .orderBy('message.created_at', 'ASC');

    const total = await query.getCount();
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const messages = await query.getMany();

    return { total, data: messages };
  }

  async markMessagesAsRead(jobApplicationId: string, userId: string): Promise<Message[]> {
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: jobApplicationId },
      relations: ['job_post', 'job_seeker', 'job_post.employer'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    const messages = await this.messagesRepository.find({
      where: {
        job_application_id: jobApplicationId,
        recipient_id: userId,
        is_read: false,
      },
    });

    for (const message of messages) {
      message.is_read = true;
      await this.messagesRepository.save(message);
    }

    return messages;
  }

  async broadcastToApplicants(
    employerId: string,
    jobPostId: string,
    content: string,
  ): Promise<Message[]> {
    const jobPost = await this.jobApplicationsRepository.manager
      .getRepository(JobPost)
      .findOne({ where: { id: jobPostId, employer_id: employerId } });
    if (!jobPost) throw new UnauthorizedException('You do not own this job post');

    const applications = await this.jobApplicationsRepository.find({
      where: { job_post_id: jobPostId },
      select: ['id', 'job_seeker_id', 'status'],
    });

    const targets = applications.filter(a => ['Pending', 'Accepted'].includes(a.status));
    if (!targets.length) return [];

    const toSave = targets.map(app =>
      this.messagesRepository.create({
        job_application_id: app.id,
        sender_id: employerId,
        recipient_id: app.job_seeker_id,
        content,
        is_read: false,
      }),
    );

    const saved = await this.messagesRepository.save(toSave);

    const appIds = saved.map(m => m.job_application_id);
    const fullApps = await this.jobApplicationsRepository.find({
      where: appIds.map(id => ({ id })),
      relations: ['job_post', 'job_post.employer', 'job_seeker'],
    });
    const byId = new Map(fullApps.map(a => [a.id, a]));

    await Promise.allSettled(
      saved.map(msg => {
        const app = byId.get(msg.job_application_id);
        if (!app) return Promise.resolve();
        return this.chatNotifications.onNewMessage(msg, app);
      }),
    );

    return saved;
  }

  async broadcastToSelectedApplicants(
    employerId: string,
    jobPostId: string,
    applicationIds: string[],
    content: string,
  ): Promise<Message[]> {
    if (!content || !content.trim()) return [];

    const jobPost = await this.jobApplicationsRepository.manager
      .getRepository(JobPost)
      .findOne({ where: { id: jobPostId, employer_id: employerId } });
    if (!jobPost) throw new UnauthorizedException('You do not own this job post');

    const apps = await this.jobApplicationsRepository.find({
      where: { id: In([...new Set(applicationIds)]), job_post_id: jobPostId },
      select: ['id', 'job_seeker_id', 'status'],
    });

    const targets = apps.filter(a => ['Pending', 'Accepted'].includes(a.status));
    if (!targets.length) return [];

    const toSave = targets.map(app =>
      this.messagesRepository.create({
        job_application_id: app.id,
        sender_id: employerId,
        recipient_id: app.job_seeker_id,
        content: content.trim(),
        is_read: false,
      }),
    );

    const saved = await this.messagesRepository.save(toSave);

    const appIds = saved.map(m => m.job_application_id);
    const fullApps = await this.jobApplicationsRepository.find({
      where: appIds.map(id => ({ id })),
      relations: ['job_post', 'job_post.employer', 'job_seeker'],
    });
    const byId = new Map(fullApps.map(a => [a.id, a]));

    await Promise.allSettled(
      saved.map(msg => {
        const app = byId.get(msg.job_application_id);
        if (!app) return Promise.resolve();
        return this.chatNotifications.onNewMessage(msg, app);
      }),
    );

    return saved;
  }
}
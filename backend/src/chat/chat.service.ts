import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { ChatNotificationsService } from './chat-notifications.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
      relations: ['job_post', 'job_seeker', 'job_post.employer', 'job_post.employer.user'],
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

  async getChatHistoryForAdmin(jobApplicationId: string, page: number = 1, limit: number = 10): Promise<{ total: number; data: Message[] }> {
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
    return saved;
  }
}
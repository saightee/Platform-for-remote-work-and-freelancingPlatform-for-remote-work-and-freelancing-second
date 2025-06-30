import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async hasChatAccess(userId: string, jobApplicationId: string): Promise<boolean> {
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: jobApplicationId },
      relations: ['job_post', 'job_seeker', 'job_post.employer'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    if (application.status !== 'Accepted') {
      throw new UnauthorizedException('Chat is only available for accepted applications');
    }

    return (
      application.job_seeker_id === userId ||
      application.job_post.employer_id === userId
    );
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

    return this.messagesRepository.save(message);
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
}
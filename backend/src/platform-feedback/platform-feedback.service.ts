import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformFeedback } from './platform-feedback.entity';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PlatformFeedbackService {
  constructor(
    @InjectRepository(PlatformFeedback)
    private platformFeedbackRepository: Repository<PlatformFeedback>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async createFeedback(userId: string, rating: number, description: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker' && user.role !== 'employer') {
      throw new UnauthorizedException('Only jobseekers and employers can submit platform feedback');
    }
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    if (!description) {
      throw new BadRequestException('Description is required');
    }
    const feedback = this.platformFeedbackRepository.create({
      user_id: userId,
      rating,
      description,
    });
    return this.platformFeedbackRepository.save(feedback);
  }

  async getPublicFeedback(page: number = 1, limit: number = 10) {
    const [feedback, total] = await this.platformFeedbackRepository.findAndCount({
      relations: ['user'],
      select: {
        id: true,
        rating: true,
        description: true,
        created_at: true,
        updated_at: true,
        user: { id: true, username: true, role: true },
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { total, data: feedback };
  }

  async deleteFeedback(feedbackId: string) {
    const feedback = await this.platformFeedbackRepository.findOne({ where: { id: feedbackId } });
    if (!feedback) {
      throw new NotFoundException('Platform feedback not found');
    }
    await this.platformFeedbackRepository.delete(feedbackId);
    return { message: 'Platform feedback deleted successfully' };
  }
}
import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';
import { User } from '../users/entities/user.entity';
import { SubmitTechFeedbackDto } from './dto/submit-tech-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async submitFeedback(userId: string, dto: SubmitTechFeedbackDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker' && user.role !== 'employer') {
      throw new UnauthorizedException('Only jobseekers and employers can submit feedback');
    }

    const feedback = this.feedbackRepository.create({
      user_id: userId,
      category: dto.category,
      summary: dto.summary,
      steps_to_reproduce: dto.steps_to_reproduce ?? null,
      expected_result: dto.expected_result ?? null,
      actual_result: dto.actual_result ?? null,
      role: user.role as 'jobseeker' | 'employer',
    });

    return this.feedbackRepository.save(feedback);
  }

  async getFeedback(adminId: string) {
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('Only admins can view feedback');
    }
    return this.feedbackRepository.find({ relations: ['user'], order: { created_at: 'DESC' } });
  }
}
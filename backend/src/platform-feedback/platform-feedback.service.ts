import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformFeedback } from './platform-feedback.entity';
import { User } from '../users/entities/user.entity';
import { SubmitSuccessStoryDto } from './dto/submit-success-story.dto';

@Injectable()
export class PlatformFeedbackService {
  constructor(
    @InjectRepository(PlatformFeedback)
    private platformFeedbackRepository: Repository<PlatformFeedback>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createSuccessStory(userId: string, dto: SubmitSuccessStoryDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'jobseeker' && user.role !== 'employer') {
      throw new UnauthorizedException('Only jobseekers and employers can submit platform feedback');
    }

    if (!dto.story?.trim()) throw new BadRequestException('Story is required');
    if (!dto.headline?.trim()) throw new BadRequestException('Headline is required');

    const entity = this.platformFeedbackRepository.create({
      user_id: userId,
      role: user.role as 'jobseeker' | 'employer',
      headline: dto.headline,
      story: dto.story,
      rating: dto.rating,
      allowed_to_publish: dto.allow_publish,
      is_public: !!dto.allow_publish,
      company: dto.company ?? null,
      country: dto.country ?? null,
    });

    return this.platformFeedbackRepository.save(entity);
  }

  async getPublicStories(page = 1, limit = 10) {
    const [data, total] = await this.platformFeedbackRepository.findAndCount({
      where: { is_public: true },
      relations: ['user'],
      select: {
        id: true, headline: true, story: true, rating: true,
        company: true, country: true, created_at: true, updated_at: true,
        user: { id: true, username: true, role: true },
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { total, data };
  }

  async getAllStoriesForModeration(page = 1, limit = 10) {
    const [data, total] = await this.platformFeedbackRepository.findAndCount({
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, data };
  }

  async publishStory(id: string) {
    const fb = await this.platformFeedbackRepository.findOne({ where: { id } });
    if (!fb) throw new NotFoundException('Platform feedback not found');
    if (!fb.allowed_to_publish) {
      throw new BadRequestException('User did not allow publishing this story');
    }
    fb.is_public = true;
    return this.platformFeedbackRepository.save(fb);
  }

  async unpublishStory(id: string) {
    const fb = await this.platformFeedbackRepository.findOne({ where: { id } });
    if (!fb) throw new NotFoundException('Platform feedback not found');
    fb.is_public = false;
    return this.platformFeedbackRepository.save(fb);
  }

  async deleteFeedback(id: string) {
    const exists = await this.platformFeedbackRepository.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Platform feedback not found');
    await this.platformFeedbackRepository.delete(id);
    return { message: 'Platform feedback deleted successfully' };
  }
}
import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { ReviewsService } from '../reviews/reviews.service';
import { SkillCategory } from '../skill-categories/skill-category.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
    @InjectRepository(SkillCategory)
    private skillCategoriesRepository: Repository<SkillCategory>,
    private reviewsService: ReviewsService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reviews = await this.reviewsService.getReviewsForUser(userId);

    if (user.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({
        where: { user_id: userId },
        relations: ['skillCategories'],
      });
      if (!jobSeeker) {
        throw new NotFoundException('JobSeeker profile not found');
      }
      return {
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        skills: jobSeeker.skills,
        skillCategories: jobSeeker.skillCategories,
        experience: jobSeeker.experience,
        portfolio: jobSeeker.portfolio,
        video_intro: jobSeeker.video_intro,
        timezone: jobSeeker.timezone,
        currency: jobSeeker.currency,
        average_rating: jobSeeker.average_rating,
        reviews,
        avatar: user.avatar,
        identity_verified: user.identity_verified,
      };
    } else if (user.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (!employer) {
        throw new NotFoundException('Employer profile not found');
      }
      return {
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        company_name: employer.company_name,
        company_info: employer.company_info,
        referral_link: employer.referral_link,
        timezone: employer.timezone,
        currency: employer.currency,
        average_rating: employer.average_rating,
        reviews,
        avatar: user.avatar,
        identity_verified: user.identity_verified,
      };
    } else {
      throw new UnauthorizedException('User role not supported');
    }
  }

  async updateProfile(userId: string, updateData: any) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.role && updateData.role !== user.role) {
      throw new UnauthorizedException('User role mismatch');
    }

    if (user.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({
        where: { user_id: userId },
        relations: ['skillCategories'],
      });
      if (!jobSeeker) {
        throw new NotFoundException('JobSeeker profile not found');
      }

      if (updateData.skills && Array.isArray(updateData.skills)) {
        jobSeeker.skills = updateData.skills;
      }
      if (updateData.skillCategoryIds && Array.isArray(updateData.skillCategoryIds)) {
        const skillCategories = await this.skillCategoriesRepository.find({
          where: { id: In(updateData.skillCategoryIds) },
        });
        jobSeeker.skillCategories = skillCategories;
      }
      if (updateData.experience) {
        jobSeeker.experience = updateData.experience;
      }
      if (updateData.portfolio) {
        jobSeeker.portfolio = updateData.portfolio;
      }
      if (updateData.video_intro) {
        jobSeeker.video_intro = updateData.video_intro;
      }
      if (updateData.timezone) {
        jobSeeker.timezone = updateData.timezone;
      }
      if (updateData.currency) {
        jobSeeker.currency = updateData.currency;
      }

      await this.jobSeekerRepository.save(jobSeeker);
      return this.getProfile(userId);
    } else if (user.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (!employer) {
        throw new NotFoundException('Employer profile not found');
      }

      if (updateData.company_name) {
        employer.company_name = updateData.company_name;
      }
      if (updateData.company_info) {
        employer.company_info = updateData.company_info;
      }
      if (updateData.referral_link) {
        employer.referral_link = updateData.referral_link;
      }
      if (updateData.timezone) {
        employer.timezone = updateData.timezone;
      }
      if (updateData.currency) {
        employer.currency = updateData.currency;
      }

      await this.employerRepository.save(employer);
      return this.getProfile(userId);
    } else {
      throw new UnauthorizedException('User role not supported');
    }
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!avatarUrl) {
      throw new BadRequestException('Avatar URL is required');
    }

    user.avatar = avatarUrl;
    await this.usersRepository.save(user);
    return this.getProfile(userId);
  }

  async uploadIdentityDocument(userId: string, documentUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!documentUrl) {
      throw new BadRequestException('Document URL is required');
    }

    user.identity_document = documentUrl;
    await this.usersRepository.save(user);
    return this.getProfile(userId);
  }
}
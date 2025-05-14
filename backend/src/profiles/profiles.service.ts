import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
    private reviewsService: ReviewsService, // Добавляем ReviewsService
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const reviews = await this.reviewsService.getReviewsForUser(userId);
  
    if (user.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: userId } });
      if (!jobSeeker) {
        throw new NotFoundException('JobSeeker profile not found');
      }
      return {
        id: user.id, // Добавляем id
        role: user.role,
        email: user.email,
        username: user.username,
        skills: jobSeeker.skills,
        experience: jobSeeker.experience,
        portfolio: jobSeeker.portfolio,
        video_intro: jobSeeker.video_intro,
        timezone: jobSeeker.timezone,
        currency: jobSeeker.currency,
        average_rating: jobSeeker.average_rating,
        reviews,
      };
    } else if (user.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (!employer) {
        throw new NotFoundException('Employer profile not found');
      }
      return {
        id: user.id, // Добавляем id
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
      };
    } else if (user.role === 'admin') {
      return {
        id: user.id, // Добавляем id
        role: user.role,
        email: user.email,
        username: user.username,
        reviews,
      };
    } else {
      throw new UnauthorizedException('Invalid user role');
    }
  }

  async updateProfile(userId: string, role: 'employer' | 'jobseeker', updates: any) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== role) {
      throw new UnauthorizedException('User role mismatch');
    }

    if (role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: userId } });
      if (!jobSeeker) {
        throw new NotFoundException('JobSeeker profile not found');
      }
      const updatedJobSeeker = {
        ...jobSeeker,
        skills: updates.skills || jobSeeker.skills,
        experience: updates.experience || jobSeeker.experience,
        portfolio: updates.portfolio || jobSeeker.portfolio,
        video_intro: updates.video_intro || jobSeeker.video_intro,
        timezone: updates.timezone || jobSeeker.timezone,
        currency: updates.currency || jobSeeker.currency,
      };
      await this.jobSeekerRepository.save(updatedJobSeeker);
      return this.getProfile(userId);
    } else if (role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (!employer) {
        throw new NotFoundException('Employer profile not found');
      }
      const updatedEmployer = {
        ...employer,
        company_name: updates.company_name || employer.company_name,
        company_info: updates.company_info || employer.company_info,
        referral_link: updates.referral_link || employer.referral_link,
        timezone: updates.timezone || employer.timezone,
        currency: updates.currency || employer.currency,
      };
      await this.employerRepository.save(updatedEmployer);
      return this.getProfile(userId);
    } else {
      throw new UnauthorizedException('Invalid user role');
    }
  }
}
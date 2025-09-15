import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { ReviewsService } from '../reviews/reviews.service';
import { Category } from '../categories/category.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private reviewsService: ReviewsService,
  ) {}

  async getProfile(userId: string, isAuthenticated: boolean = false) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reviews = await this.reviewsService.getReviewsForUser(userId);

    if (user.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({
        where: { user_id: userId },
        relations: ['skills'],
      });
      if (!jobSeeker) {
        throw new NotFoundException('JobSeeker profile not found');
      }
      return {
        id: user.id,
        role: user.role,
        email: isAuthenticated ? user.email : undefined,
        username: user.username,
        skills: jobSeeker.skills,
        experience: jobSeeker.experience,
        description: jobSeeker.description,
        portfolio: jobSeeker.portfolio,
        video_intro: jobSeeker.video_intro,
        resume: jobSeeker.resume,
        timezone: jobSeeker.timezone,
        currency: jobSeeker.currency,
        expected_salary: (jobSeeker as any).expected_salary ?? null,
        average_rating: jobSeeker.average_rating,
        profile_views: jobSeeker.profile_views,
        job_search_status: (jobSeeker as any).job_search_status,
        linkedin: jobSeeker.linkedin,
        instagram: jobSeeker.instagram,
        facebook: jobSeeker.facebook,
        whatsapp: (jobSeeker as any).whatsapp ?? null,
        telegram: (jobSeeker as any).telegram ?? null,
        reviews,
        avatar: user.avatar,
        identity_verified: user.identity_verified,
      };
    } else if (user.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (!employer) throw new NotFoundException('Employer profile not found');
      return {
        id: user.id,
        role: user.role,
        email: isAuthenticated ? user.email : undefined,
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
    if (!user) throw new NotFoundException('User not found');

    if (updateData.role && updateData.role !== user.role) {
      throw new UnauthorizedException('User role mismatch');
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'username')) {
      if (typeof updateData.username !== 'string') throw new BadRequestException('Username must be a string');
      const newUsername = updateData.username.trim();
      if (!newUsername) throw new BadRequestException('Username cannot be empty');
      if (newUsername.length > 100) throw new BadRequestException('Username is too long (max 100)');
      user.username = newUsername;
      await this.usersRepository.save(user);
    }

    if (user.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({
        where: { user_id: userId },
        relations: ['skills'],
      });
      if (!jobSeeker) throw new NotFoundException('JobSeeker profile not found');

      if (updateData.resume) jobSeeker.resume = updateData.resume;

      if (updateData.skillIds && Array.isArray(updateData.skillIds)) {
        const skills = await this.categoriesRepository.find({ where: { id: In(updateData.skillIds) } });
        jobSeeker.skills = skills;
      }

      if (updateData.experience) jobSeeker.experience = updateData.experience;

      if (Object.prototype.hasOwnProperty.call(updateData, 'description')) {
        const d = String(updateData.description || '');
        const limited = d.trim().split(/\s+/).slice(0, 150).join(' ');
        jobSeeker.description = limited || null;
      }

      if (updateData.portfolio) jobSeeker.portfolio = updateData.portfolio;
      if (updateData.video_intro) jobSeeker.video_intro = updateData.video_intro;
      if (updateData.timezone) jobSeeker.timezone = updateData.timezone;
      if (updateData.currency) jobSeeker.currency = updateData.currency;

      if (Object.prototype.hasOwnProperty.call(updateData, 'job_search_status')) {
        const allowed = ['actively_looking', 'open_to_offers', 'hired'] as const;
        if (!allowed.includes(updateData.job_search_status)) {
          throw new BadRequestException('job_search_status must be one of: actively_looking | open_to_offers | hired');
        }
        (jobSeeker as any).job_search_status = updateData.job_search_status;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'expected_salary')) {
        const v = Number(updateData.expected_salary);
        if (Number.isNaN(v) || v < 0) throw new BadRequestException('expected_salary must be a non-negative number');
        (jobSeeker as any).expected_salary = v;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'linkedin'))  jobSeeker.linkedin  = updateData.linkedin  || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'instagram')) jobSeeker.instagram = updateData.instagram || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'facebook'))  jobSeeker.facebook  = updateData.facebook  || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'whatsapp')) jobSeeker.whatsapp = updateData.whatsapp || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'telegram')) jobSeeker.telegram = updateData.telegram || null;

      await this.jobSeekerRepository.save(jobSeeker);
      return this.getProfile(userId, true);
    }

    if (user.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (!employer) throw new NotFoundException('Employer profile not found');

      if (updateData.company_name) employer.company_name = updateData.company_name;
      if (updateData.company_info) employer.company_info = updateData.company_info;
      if (updateData.referral_link) employer.referral_link = updateData.referral_link;
      if (updateData.timezone) employer.timezone = updateData.timezone;
      if (updateData.currency) employer.currency = updateData.currency;

      await this.employerRepository.save(employer);
      return this.getProfile(userId, true);
    }

    throw new UnauthorizedException('User role not supported');
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
    return this.getProfile(userId, true);
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
    return this.getProfile(userId, true);
  }

  async uploadResume(userId: string, resumeUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      throw new BadRequestException('Only jobseekers can upload resumes');
    }
    if (!resumeUrl) {
      throw new BadRequestException('Resume URL is required');
    }
    
    const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: userId } });
    if (!jobSeeker) {
      throw new NotFoundException('JobSeeker profile not found');
    }
    
    jobSeeker.resume = resumeUrl;
    await this.jobSeekerRepository.save(jobSeeker);
    return this.getProfile(userId, true);
    }

  async incrementProfileView(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      throw new BadRequestException('Profile views can only be incremented for jobseekers');
    }
    
    const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: userId } });
    if (!jobSeeker) {
      throw new NotFoundException('JobSeeker profile not found');
    }
    
    jobSeeker.profile_views = (jobSeeker.profile_views || 0) + 1;
    await this.jobSeekerRepository.save(jobSeeker);
    return { message: 'Profile view count incremented', profile_views: jobSeeker.profile_views };
  }
}
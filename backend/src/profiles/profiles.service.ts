import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { ReviewsService } from '../reviews/reviews.service';
import { Category } from '../categories/category.entity';
import { JobApplication } from '../job-applications/job-application.entity';

function isValidUsername(username: string): boolean {
  // Только буквы (латиница и кириллица), цифры и пробелы
  return /^[a-zA-Zа-яА-ЯёЁ0-9\s]+$/.test(username);
}

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
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    private reviewsService: ReviewsService,
  ) {}

  private countryNameFromISO(code?: string | null): string | null {
    const c = (code || '').toString().trim().toUpperCase();
    if (!c) return null;
    try {
      const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
      return dn?.of?.(c) || c;
    } catch {
      return c;
    }
  }

  

  async getProfile(
    userId: string,
    viewer?: {
      isAuthenticated?: boolean;
      viewerId?: string | null;
      viewerRole?: 'employer' | 'jobseeker' | 'admin' | 'moderator' | 'affiliate' | null;
    },
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reviews = await this.reviewsService.getReviewsForUser(userId);
    const isAuthenticated = !!viewer?.isAuthenticated;
    const viewerId = viewer?.viewerId || null;
    const viewerRole = viewer?.viewerRole || null;
    const isOwner = viewerId === userId;

    if (user.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({
        where: { user_id: userId },
        relations: ['skills'],
      });
      if (!jobSeeker) {
        throw new NotFoundException('JobSeeker profile not found');
      }

      let canSeePrivateContacts = false;

      if (isOwner) {
        canSeePrivateContacts = true;
      }
      else if (viewerRole === 'admin' || viewerRole === 'moderator') {
        canSeePrivateContacts = true;
      }

      else if (viewerRole === 'employer' && viewerId) {
        const count = await this.jobApplicationsRepository
          .createQueryBuilder('app')
          .innerJoin('app.job_post', 'jp')
          .where('app.job_seeker_id = :jobSeekerId', { jobSeekerId: userId })
          .andWhere('jp.employer_id = :employerId', { employerId: viewerId })
          .getCount();
        canSeePrivateContacts = count > 0;
      }

      const jobExperienceItems = ((jobSeeker as any).job_experience_items || []).sort((a: any, b: any) => {
        const aYear = a.end_year ?? a.start_year ?? 0;
        const bYear = b.end_year ?? b.start_year ?? 0;
        return bYear - aYear;
      });

      const educationItems = ((jobSeeker as any).education_items || []).sort((a: any, b: any) => {
        const aYear = a.end_year ?? a.start_year ?? 0;
        const bYear = b.end_year ?? b.start_year ?? 0;
        return bYear - aYear;
      });

      return {
        id: user.id,
        role: user.role,
        email: canSeePrivateContacts ? user.email : undefined,
        username: user.username,
        country: user.country,
        country_name: this.countryNameFromISO(user.country),
        skills: jobSeeker.skills,
        experience: jobSeeker.experience,
        job_experience: (jobSeeker as any).job_experience || null,
        current_position: (jobSeeker as any).current_position || null,
        education: (jobSeeker as any).education || null,
        job_experience_items: jobExperienceItems,
        education_items: educationItems,
        description: jobSeeker.description,
        portfolio: jobSeeker.portfolio,
        portfolio_files: jobSeeker.portfolio_files || [],
        video_intro: jobSeeker.video_intro,
        resume: canSeePrivateContacts ? jobSeeker.resume : undefined,
        timezone: jobSeeker.timezone,
        currency: jobSeeker.currency,
        expected_salary: (jobSeeker as any).expected_salary ?? null,
        expected_salary_max: (jobSeeker as any).expected_salary_max ?? null,
        expected_salary_type: (jobSeeker as any).expected_salary_type ?? null,
        average_rating: jobSeeker.average_rating,
        profile_views: jobSeeker.profile_views,
        job_search_status: (jobSeeker as any).job_search_status,
        preferred_job_types: (jobSeeker as any).preferred_job_types ?? [],
        linkedin: canSeePrivateContacts ? jobSeeker.linkedin : undefined,
        instagram: canSeePrivateContacts ? jobSeeker.instagram : undefined,
        facebook: canSeePrivateContacts ? jobSeeker.facebook : undefined,
        whatsapp: canSeePrivateContacts ? (jobSeeker as any).whatsapp ?? null : undefined,
        telegram: canSeePrivateContacts ? (jobSeeker as any).telegram ?? null : undefined,
        languages: jobSeeker.languages || [],
        date_of_birth: (jobSeeker as any).date_of_birth || null,
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
        country_name: this.countryNameFromISO(user.country),
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
      if (typeof updateData.username !== 'string')
        throw new BadRequestException('Username must be a string');
      const newUsername = updateData.username.trim();
      if (!newUsername) throw new BadRequestException('Username cannot be empty');
      if (newUsername.length > 100)
        throw new BadRequestException('Username is too long (max 100)');

      if (!isValidUsername(newUsername)) {
        throw new BadRequestException('Username can only contain letters, numbers, and spaces');
      }

      user.username = newUsername;
      await this.usersRepository.save(user);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'country')) {
      const c = (updateData.country ?? '').toString().trim().toUpperCase();
      (user as any).country = c || null;
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
        const skills = await this.categoriesRepository.find({
          where: { id: In(updateData.skillIds) },
        });
        jobSeeker.skills = skills;
      }

      if (updateData.experience) jobSeeker.experience = updateData.experience;

      if (Object.prototype.hasOwnProperty.call(updateData, 'job_experience')) {
        const v = String(updateData.job_experience || '').trim();
        (jobSeeker as any).job_experience = v || null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'date_of_birth')) {
        const dob = String(updateData.date_of_birth || '').trim();
        if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
          throw new BadRequestException(
            'date_of_birth must be in format YYYY-MM-DD',
          );
        }
        (jobSeeker as any).date_of_birth = dob || null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'description')) {
        const d = String(updateData.description || '');
        const limited = d.trim().split(/\s+/).slice(0, 150).join(' ');
        jobSeeker.description = limited || null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'portfolio')) {
        jobSeeker.portfolio = updateData.portfolio;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'portfolio_files')) {
        const arr = Array.isArray(updateData.portfolio_files)
          ? updateData.portfolio_files.filter(
              (v: any) => typeof v === 'string' && v.trim(),
            )
          : [];
        jobSeeker.portfolio_files = arr;
      }

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
        const v = updateData.expected_salary === null ? null : Number(updateData.expected_salary);
        if (v !== null && (Number.isNaN(v) || v < 0)) {
          throw new BadRequestException('expected_salary must be a non-negative number or null');
        }
        (jobSeeker as any).expected_salary = v;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'expected_salary_max')) {
        const v = updateData.expected_salary_max === null ? null : Number(updateData.expected_salary_max);
        if (v !== null && (Number.isNaN(v) || v < 0)) {
          throw new BadRequestException('expected_salary_max must be a non-negative number or null');
        }
        (jobSeeker as any).expected_salary_max = v;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'expected_salary_type')) {
        const allowed = ['per month', 'per day'];
        if (updateData.expected_salary_type && !allowed.includes(updateData.expected_salary_type)) {
          throw new BadRequestException('expected_salary_type must be: per month | per day');
        }
        (jobSeeker as any).expected_salary_type = updateData.expected_salary_type || null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'linkedin'))  jobSeeker.linkedin  = updateData.linkedin  || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'instagram')) jobSeeker.instagram = updateData.instagram || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'facebook'))  jobSeeker.facebook  = updateData.facebook  || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'whatsapp')) jobSeeker.whatsapp = updateData.whatsapp || null;
      if (Object.prototype.hasOwnProperty.call(updateData, 'telegram')) jobSeeker.telegram = updateData.telegram || null;

      if (Object.prototype.hasOwnProperty.call(updateData, 'languages')) {
        const langs = Array.isArray(updateData.languages) ? updateData.languages : [];
        jobSeeker.languages = langs;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'preferred_job_types')) {
        const arr = Array.isArray(updateData.preferred_job_types)
          ? updateData.preferred_job_types
          : [];

        const allowed = ['Full-time', 'Part-time', 'Project-based'];
        const invalid = arr.filter(v => !allowed.includes(v));

        if (invalid.length > 0) {
          throw new BadRequestException(
            'preferred_job_types must contain only: Full-time | Part-time | Project-based'
          );
        }

        const unique = [...new Set(arr)];
        (jobSeeker as any).preferred_job_types = unique;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'current_position')) {
        const v = (updateData.current_position ?? '').toString().trim();
        if (v.length > 200) {
          throw new BadRequestException('current_position is too long (max 200 chars)');
        }
        (jobSeeker as any).current_position = v || null;
      }
    
      if (Object.prototype.hasOwnProperty.call(updateData, 'education')) {
        const v = (updateData.education ?? '').toString().trim();
        if (v.length > 200) {
          throw new BadRequestException('education is too long (max 200 chars)');
        }
        (jobSeeker as any).education = v || null;
      }
    
      if (Object.prototype.hasOwnProperty.call(updateData, 'job_experience_items')) {
        const arr = Array.isArray(updateData.job_experience_items)
          ? updateData.job_experience_items
          : [];
      
        const normalized = arr.map((item: any) => {
          if (!item) return null;
          const title = (item.title ?? '').toString().trim();
          const company = (item.company ?? '').toString().trim();
          const startYear = Number(item.start_year);
          const endYear =
            item.end_year === null || item.end_year === undefined
              ? null
              : Number(item.end_year);
        
          if (!title || !company || Number.isNaN(startYear)) {
            throw new BadRequestException(
              'Each job_experience_items item must have title, company, start_year',
            );
          }
        
          const description =
            (item.description ?? '').toString().trim().split(/\s+/).slice(0, 100).join(' ') || null;
        
          return {
            title,
            company,
            start_year: startYear,
            end_year: Number.isNaN(endYear as any) ? null : endYear,
            description,
          };
        }).filter(Boolean);
      
        (jobSeeker as any).job_experience_items = normalized;
      }
    
      if (Object.prototype.hasOwnProperty.call(updateData, 'education_items')) {
        const arr = Array.isArray(updateData.education_items)
          ? updateData.education_items
          : [];
      
        const normalized = arr.map((item: any) => {
          if (!item) return null;
          const degree = (item.degree ?? '').toString().trim();
          const institution = (item.institution ?? '').toString().trim();
          const startYear = Number(item.start_year);
          const endYear =
            item.end_year === null || item.end_year === undefined
              ? null
              : Number(item.end_year);
        
          if (!degree || !institution || Number.isNaN(startYear)) {
            throw new BadRequestException(
              'Each education_items item must have degree, institution, start_year',
            );
          }
        
          return {
            degree,
            institution,
            start_year: startYear,
            end_year: Number.isNaN(endYear as any) ? null : endYear,
          };
        }).filter(Boolean);
      
        (jobSeeker as any).education_items = normalized;
      }
    
      await this.jobSeekerRepository.save(jobSeeker);
      return this.getProfile(userId, {
        isAuthenticated: true,
        viewerId: userId,
        viewerRole: user.role,
      });
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
      return this.getProfile(userId, {
        isAuthenticated: true,
        viewerId: userId,
        viewerRole: user.role,
      });
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
    return this.getProfile(userId, {
      isAuthenticated: true,
      viewerId: userId,
      viewerRole: user.role,
    });
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
    return this.getProfile(userId, {
      isAuthenticated: true,
      viewerId: userId,
      viewerRole: user.role,
    });
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
    return this.getProfile(userId, {
      isAuthenticated: true,
      viewerId: userId,
      viewerRole: user.role,
    });
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

  async uploadPortfolioFiles(userId: string, newUrls: string[]) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      throw new BadRequestException('Only jobseekers can upload portfolio files');
    }
  
    const jobSeeker = await this.jobSeekerRepository.findOne({
      where: { user_id: userId },
    });
    if (!jobSeeker) {
      throw new NotFoundException('JobSeeker profile not found');
    }
  
    const existing = jobSeeker.portfolio_files || [];
    if (existing.length + newUrls.length > 10) {
      throw new BadRequestException('You can have up to 10 portfolio files');
    }
  
    jobSeeker.portfolio_files = [...existing, ...newUrls];
    await this.jobSeekerRepository.save(jobSeeker);
  
    return this.getProfile(userId, {
      isAuthenticated: true,
      viewerId: userId,
      viewerRole: user.role,
    });
  }
}
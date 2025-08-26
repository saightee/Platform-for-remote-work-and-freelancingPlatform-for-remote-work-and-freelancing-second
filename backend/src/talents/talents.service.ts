import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class TalentsService {
  constructor(
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private categoriesService: CategoriesService,
  ) {}

  async searchTalents(filters: {
    skills?: string[];
    experience?: string;
    description?: string;
    rating?: number;
    timezone?: string;
    job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired';
    page?: number;
    limit?: number;
    sort_by?: 'average_rating' | 'profile_views';
    sort_order?: 'ASC' | 'DESC';
  }) {
    const query = this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoinAndSelect('jobSeeker.user', 'user')
      .leftJoinAndSelect('jobSeeker.skills', 'skills')
      .where('user.role = :role', { role: 'jobseeker' })
      .andWhere('user.status = :status', { status: 'active' });

    if (filters.skills?.length) {
      const expandedSkills = await this.categoriesService.expandCategoryIdsWithDescendants(filters.skills);
      query.andWhere('skills.id IN (:...skills)', { skills: expandedSkills });
    }

    if (filters.experience) {
      query.andWhere('jobSeeker.experience ILIKE :experience', {
        experience: `%${filters.experience}%`,
      });
    }

    if (filters.description) {
      query.andWhere('jobSeeker.description ILIKE :description', {
        description: `%${filters.description}%`,
      });
    }

    if (filters.rating !== undefined) {
      query.andWhere('jobSeeker.average_rating >= :rating', {
        rating: filters.rating,
      });
    }

    if (filters.timezone) {
      query.andWhere('jobSeeker.timezone = :timezone', {
        timezone: filters.timezone,
      });
    }

    if (filters.job_search_status) {
      query.andWhere('jobSeeker.job_search_status = :js', { js: filters.job_search_status });
    }

    const total = await query.getCount();

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const sortBy = filters.sort_by || 'average_rating';
    const sortOrder = filters.sort_order || 'DESC';
    query.orderBy(`jobSeeker.${sortBy}`, sortOrder);

    const jobSeekers = await query.getMany();

    return {
      total,
      data: jobSeekers.map((jobSeeker) => ({
        id: jobSeeker.user_id,
        username: jobSeeker.user.username,
        email: jobSeeker.user.email,
        skills: jobSeeker.skills.map((cat) => ({
          id: cat.id,
          name: cat.name,
          parent_id: (cat as any).parent_id,
        })),
        experience: jobSeeker.experience,
        description: jobSeeker.description,
        portfolio: jobSeeker.portfolio,
        video_intro: jobSeeker.video_intro,
        timezone: jobSeeker.timezone,
        currency: jobSeeker.currency,
        average_rating: jobSeeker.average_rating,
        profile_views: jobSeeker.profile_views,
        job_search_status: (jobSeeker as any).job_search_status,
        identity_verified: jobSeeker.user.identity_verified,
        avatar: jobSeeker.user.avatar,
      })),
    };
  }
}
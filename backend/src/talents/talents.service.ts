import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesService } from '../categories/categories.service';
type JobSearchStatus = 'actively_looking' | 'open_to_offers' | 'hired';

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
    job_search_status?: JobSearchStatus;
    expected_salary_min?: number;
    expected_salary_max?: number;
    expected_salary_type?: 'per month' | 'per day'; 
    preferred_job_types?: string[];
    page?: number;
    limit?: number;
    sort_by?: 'average_rating' | 'profile_views';
    sort_order?: 'ASC' | 'DESC';
    country?: string;
    countries?: string[];
    languages?: string[];
    languages_mode?: 'any' | 'all';
    has_resume?: boolean;
    has_avatar?: string;
  }) {
    const qb = this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoinAndSelect('jobSeeker.user', 'user')
      .leftJoinAndSelect('jobSeeker.skills', 'skills')
      .where('user.role = :role', { role: 'jobseeker' })
      .andWhere('user.status = :status', { status: 'active' });

    if (filters.has_avatar === 'true') {
      qb.andWhere("user.avatar IS NOT NULL");
      qb.andWhere("user.avatar != ''");
      qb.andWhere("user.avatar != 'null'");
    }

    if (filters.skills?.length) {
      const expandedSkills = await this.categoriesService.expandCategoryIdsWithDescendants(filters.skills);
      qb.andWhere('skills.id IN (:...skills)', { skills: expandedSkills });
    }

    if (filters.experience) {
      qb.andWhere('jobSeeker.experience ILIKE :experience', { experience: `%${filters.experience}%` });
    }
    if (filters.description) {
      qb.andWhere('jobSeeker.description ILIKE :description', { description: `%${filters.description}%` });
    }
    if (filters.rating !== undefined) {
      qb.andWhere('jobSeeker.average_rating >= :rating', { rating: filters.rating });
    }
    if (filters.timezone) {
      qb.andWhere('jobSeeker.timezone = :timezone', { timezone: filters.timezone });
    }
    if (filters.job_search_status) {
      qb.andWhere('jobSeeker.job_search_status = :js', { js: filters.job_search_status });
    }
    if (filters.expected_salary_min !== undefined) {
      qb.andWhere('jobSeeker.expected_salary >= :es_min', { es_min: filters.expected_salary_min });
    }
    if (filters.expected_salary_max !== undefined) {
      qb.andWhere('COALESCE(jobSeeker.expected_salary_max, jobSeeker.expected_salary) <= :es_max', { 
        es_max: filters.expected_salary_max 
      });
    }
    if (filters.expected_salary_type) {
      qb.andWhere('jobSeeker.expected_salary_type = :est', { est: filters.expected_salary_type });
    }

    if (filters.country) {
      qb.andWhere('user.country = :c1', { c1: filters.country.toUpperCase() });
    } else if (filters.countries?.length) {
      qb.andWhere('user.country IN (:...cList)', { cList: filters.countries.map(c => c.toUpperCase()) });
    }

    if (filters.languages?.length) {
      if (filters.languages_mode === 'all') {
        qb.andWhere(`jobSeeker.languages @> ARRAY[:...langs]`, { langs: filters.languages });
      } else {
        qb.andWhere(`jobSeeker.languages && ARRAY[:...langs]`, { langs: filters.languages });
      }
    }

    if (typeof filters.has_resume === 'boolean') {
      if (filters.has_resume) {
        qb.andWhere("(jobSeeker.resume IS NOT NULL AND jobSeeker.resume <> '')");
      } else {
        qb.andWhere("(jobSeeker.resume IS NULL OR jobSeeker.resume = '')");
      }
    }

    if (filters.preferred_job_types?.length) {
      qb.andWhere('jobSeeker.preferred_job_types && ARRAY[:...jobTypes]', { 
        jobTypes: filters.preferred_job_types 
      });
    }

    const total = await qb.getCount();

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    qb.skip((page - 1) * limit).take(limit);

    const sortBy = filters.sort_by || 'average_rating';
    const sortOrder = filters.sort_order || 'DESC';
    qb.orderBy(`jobSeeker.${sortBy}`, sortOrder);

    const jobSeekers = await qb.getMany();

    return {
      total,
      data: jobSeekers.map(js => ({
        id: js.user_id,
        username: js.user.username,
        email: js.user.email,
        slug: js.user.slug ?? null,
        slug_id: js.user.slug_id ?? null,
        skills: js.skills.map(cat => ({
          id: cat.id,
          name: cat.name,
          parent_id: (cat as any).parent_id,
        })),
        experience: js.experience,
        description: js.description,
        portfolio: js.portfolio,
        video_intro: js.video_intro,
        timezone: js.timezone,
        currency: js.currency,
        expected_salary: (js as any).expected_salary ?? null,
        expected_salary_max: (js as any).expected_salary_max ?? null,
        expected_salary_type: (js as any).expected_salary_type ?? null,
        preferred_job_types: (js as any).preferred_job_types ?? [],
        average_rating: js.average_rating,
        profile_views: js.profile_views,
        job_search_status: (js as any).job_search_status,
        identity_verified: js.user.identity_verified,
        avatar: js.user.avatar,
        country: js.user.country,
        languages: js.languages ?? null,
        has_resume: !!js.resume,
        date_of_birth: js.date_of_birth ?? null,
        current_position: js.current_position ?? null,
      })),
    };
  }
}
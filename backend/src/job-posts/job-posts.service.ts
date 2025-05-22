import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPost } from './job-post.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesService } from '../categories/categories.service';
import { JobApplication } from '../job-applications/job-application.entity';
import { ApplicationLimitsService } from '../application-limits/application-limits.service';
import { SettingsService } from '../settings/settings.service'; // Добавляем

@Injectable()
export class JobPostsService {
  constructor(
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    private categoriesService: CategoriesService,
    private applicationLimitsService: ApplicationLimitsService,
    private settingsService: SettingsService, // Добавляем
  ) {}

  async createJobPost(userId: string, jobPostData: { title: string; description: string; location: string; salary: number; status: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based'; applicationLimit?: number }) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can create job posts');
    }

    if (jobPostData.category_id) {
      await this.categoriesService.getCategoryById(jobPostData.category_id);
    }

    const globalLimit = await this.settingsService.getGlobalApplicationLimit();
    const applicationLimit = jobPostData.applicationLimit || 100;
    if (applicationLimit > globalLimit) {
      throw new BadRequestException(`Application limit cannot exceed global limit of ${globalLimit}`);
    }

    const jobPost = this.jobPostsRepository.create({
      ...jobPostData,
      employer_id: userId,
      pending_review: true,
      applicationLimit,
    });
    const savedJobPost = await this.jobPostsRepository.save(jobPost);

    // Инициализируем распределение по дням
    await this.applicationLimitsService.initializeLimits(savedJobPost.id, savedJobPost.applicationLimit);

    return savedJobPost;
  }

  async updateJobPost(userId: string, jobPostId: string, updates: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based'; applicationLimit?: number }) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to update it');
    }

    if (updates.category_id) {
      await this.categoriesService.getCategoryById(updates.category_id);
    }

    const globalLimit = await this.settingsService.getGlobalApplicationLimit();

    if (updates.title) jobPost.title = updates.title;
    if (updates.description) jobPost.description = updates.description;
    if (updates.location) jobPost.location = updates.location;
    if (updates.salary) jobPost.salary = updates.salary;
    if (updates.status) jobPost.status = updates.status;
    if (updates.category_id) jobPost.category_id = updates.category_id;
    if (updates.job_type) jobPost.job_type = updates.job_type;
    if (updates.applicationLimit !== undefined) {
      if (updates.applicationLimit > globalLimit) {
        throw new BadRequestException(`Application limit cannot exceed global limit of ${globalLimit}`);
      }
      jobPost.applicationLimit = updates.applicationLimit;
      await this.applicationLimitsService.initializeLimits(jobPostId, updates.applicationLimit);
    }

    return this.jobPostsRepository.save(jobPost);
  }

  async getJobPost(jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId }, relations: ['employer', 'category'] });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    return jobPost;
  }

  async getJobPostsByEmployer(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can view their job posts');
    }

    const jobPosts = await this.jobPostsRepository.find({
      where: { employer_id: userId },
      relations: ['category'],
    });

    console.log('Job Posts:', JSON.stringify(jobPosts, null, 2));
    return jobPosts;
  }

  async searchJobPosts(filters: { title?: string; location?: string; salaryMin?: string; salaryMax?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based'; category_id?: string }) {
    try {
      console.log('Search filters:', filters);

      const salaryMin = filters.salaryMin ? parseInt(filters.salaryMin, 10) : undefined;
      const salaryMax = filters.salaryMax ? parseInt(filters.salaryMax, 10) : undefined;

      if (filters.salaryMin && isNaN(salaryMin!)) {
        throw new BadRequestException('salaryMin must be a valid number');
      }
      if (filters.salaryMax && isNaN(salaryMax!)) {
        throw new BadRequestException('salaryMax must be a valid number');
      }

      const query = this.jobPostsRepository.createQueryBuilder('job_post')
        .leftJoinAndSelect('job_post.employer', 'employer')
        .leftJoinAndSelect('job_post.category', 'category')
        .where('job_post.status = :status', { status: 'Active' });

      if (filters.title) {
        query.andWhere('job_post.title ILIKE :title', { title: `%${filters.title}%` });
      }

      if (filters.location) {
        query.andWhere('job_post.location ILIKE :location', { location: `%${filters.location}%` });
      }

      if (salaryMin !== undefined) {
        query.andWhere('job_post.salary >= :salaryMin', { salaryMin });
      }

      if (salaryMax !== undefined) {
        query.andWhere('job_post.salary <= :salaryMax', { salaryMax });
      }

      if (filters.job_type) {
        query.andWhere('job_post.job_type = :job_type', { job_type: filters.job_type });
      }

      if (filters.category_id) {
        query.andWhere('job_post.category_id = :category_id', { category_id: filters.category_id });
      }

      console.log('Executing query:', query.getQueryAndParameters());
      const results = await query.getMany();
      console.log('Search results:', results);
      return results;
    } catch (error) {
      console.error('Error in searchJobPosts:', error);
      throw new BadRequestException(error.message || 'Failed to search job posts');
    }
  }

  async applyToJob(userId: string, jobPostId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      throw new UnauthorizedException('Only jobseekers can apply to job posts');
    }

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Cannot apply to a job post that is not active');
    }

    const existingApplication = await this.jobApplicationsRepository.findOne({
      where: { job_post_id: jobPostId, job_seeker_id: userId },
    });
    if (existingApplication) {
      throw new BadRequestException('You have already applied to this job post');
    }

    const { canApply, message } = await this.applicationLimitsService.canApply(jobPostId);
    if (!canApply) {
      throw new BadRequestException(message || 'Cannot apply to this job post');
    }

    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
    });
    const savedApplication = await this.jobApplicationsRepository.save(application);

    await this.applicationLimitsService.incrementApplicationCount(jobPostId);

    return savedApplication;
  }

  async closeJobPost(userId: string, jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to close it');
    }
    if (jobPost.status === 'Closed') {
      throw new BadRequestException('Job post is already closed');
    }

    jobPost.status = 'Closed';
    return this.jobPostsRepository.save(jobPost);
  }

  async setApplicationLimit(userId: string, jobPostId: string, limit: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can set application limits');
    }

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to update it');
    }

    const globalLimit = await this.settingsService.getGlobalApplicationLimit();
    if (limit > globalLimit) {
      throw new BadRequestException(`Application limit cannot exceed global limit of ${globalLimit}`);
    }

    jobPost.applicationLimit = limit;
    await this.jobPostsRepository.save(jobPost);

    await this.applicationLimitsService.initializeLimits(jobPostId, limit);

    return { message: 'Application limit updated successfully', limit };
  }

  async incrementJobView(jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    jobPost.views = (jobPost.views || 0) + 1;
    await this.jobPostsRepository.save(jobPost);
    return { message: 'View count incremented', views: jobPost.views };
    }
}
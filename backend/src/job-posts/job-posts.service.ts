import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPost } from './job-post.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesService } from '../categories/categories.service';
import { JobApplication } from '../job-applications/job-application.entity'; // Импортируем JobApplication

@Injectable()
export class JobPostsService {
  constructor(
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobApplication) // Внедряем JobApplicationRepository
    private jobApplicationsRepository: Repository<JobApplication>,
    private categoriesService: CategoriesService,
  ) {}

  async createJobPost(userId: string, jobPostData: { title: string; description: string; location: string; salary: number; status: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based' }) {
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

    const jobPost = this.jobPostsRepository.create({
      ...jobPostData,
      employer_id: userId,
    });
    const savedJobPost = await this.jobPostsRepository.save(jobPost);
    return savedJobPost;
  }

  async updateJobPost(userId: string, jobPostId: string, updates: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based' }) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to update it');
    }

    if (updates.category_id) {
      await this.categoriesService.getCategoryById(updates.category_id);
    }

    const updatedJobPost = {
      ...jobPost,
      ...updates,
    };
    return this.jobPostsRepository.save(updatedJobPost);
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

    return this.jobPostsRepository.find({ where: { employer_id: userId }, relations: ['employer', 'category'] });
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

    const applicationCount = await this.jobApplicationsRepository.count({ where: { job_post_id: jobPostId } });
    if (applicationCount >= jobPost.applicationLimit) {
      throw new BadRequestException('Application limit reached for this job post');
    }

    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
    });
    return this.jobApplicationsRepository.save(application);
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
}
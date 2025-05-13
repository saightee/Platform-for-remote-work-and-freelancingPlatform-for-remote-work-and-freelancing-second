import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPost } from './job-post.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class JobPostsService {
  constructor(
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private categoriesService: CategoriesService, // Добавляем CategoriesService
  ) {}

  async createJobPost(userId: string, jobPostData: { title: string; description: string; location: string; salary: number; status: 'Active' | 'Draft' | 'Closed'; category_id?: string }) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can create job posts');
    }

    // Проверяем, существует ли категория, если указан category_id
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

  async updateJobPost(userId: string, jobPostId: string, updates: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; category_id?: string }) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to update it');
    }

    // Проверяем, существует ли категория, если указан category_id
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
}
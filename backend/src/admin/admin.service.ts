import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { Review } from '../reviews/review.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
  ) {}

  async getUsers(adminId: string) {
    console.log('Getting users for adminId:', adminId);
    await this.checkAdminRole(adminId);
    const users = await this.usersRepository.find();
    console.log('Fetched users:', users);
    return users;
  }

  async getUser(adminId: string, userId: string) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(adminId: string, userId: string, updates: { email?: string; username?: string; role?: 'employer' | 'jobseeker' | 'admin' }) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updatedUser = { ...user, ...updates };
    return this.usersRepository.save(updatedUser);
  }

  async deleteUser(adminId: string, userId: string) {
    console.log('Deleting user with ID:', userId);
    await this.checkAdminRole(adminId);
  
    // Проверка, что userId - это корректный UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }
  
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    try {
      // Удаляем связанные записи
      if (user.role === 'jobseeker') {
        await this.jobSeekerRepository.delete({ user_id: userId });
      } else if (user.role === 'employer') {
        await this.employerRepository.delete({ user_id: userId });
      }
    
      // Удаляем заявки, где пользователь - job_seeker
      await this.jobApplicationsRepository.delete({ job_seeker_id: userId });
    
      // Удаляем заявки, связанные с вакансиями, созданными пользователем (employer)
      await this.jobApplicationsRepository.createQueryBuilder()
        .delete()
        .from(JobApplication)
        .where('job_post_id IN (SELECT id FROM job_posts WHERE employer_id = :userId)', { userId })
        .execute();
    
      // Удаляем связанные отзывы
      await this.reviewsRepository.delete({ reviewer_id: userId });
      await this.reviewsRepository.delete({ reviewed_id: userId });
    
      // Удаляем связанные вакансии (job_posts), если пользователь - employer
      if (user.role === 'employer') {
        await this.jobPostsRepository.delete({ employer_id: userId });
      }
    
      // Удаляем пользователя
      await this.usersRepository.delete(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new BadRequestException('Failed to delete user: ' + error.message);
    }
  }

  async getJobPosts(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.jobPostsRepository.find({ relations: ['employer', 'category'] });
  }

  async updateJobPost(adminId: string, jobPostId: string, updates: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; job_type?: 'Full-time' | 'Part-time' | 'Project-based'; category_id?: string; applicationLimit?: number }) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    const updatedJobPost = { ...jobPost, ...updates };
    return this.jobPostsRepository.save(updatedJobPost);
  }

  async deleteJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    await this.jobPostsRepository.delete(jobPostId);
    return { message: 'Job post deleted successfully' };
  }

  async getReviews(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.reviewsRepository.find({ relations: ['reviewer', 'reviewed', 'job_application'] });
  }

  async deleteReview(adminId: string, reviewId: string) {
    await this.checkAdminRole(adminId);
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    await this.reviewsRepository.delete(reviewId);

    // Обновляем средний рейтинг для пользователя
    const reviewedUser = await this.usersRepository.findOne({ where: { id: review.reviewed_id } });
    if (reviewedUser) {
      const reviews = await this.reviewsRepository.find({ where: { reviewed_id: reviewedUser.id } });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

      if (reviewedUser.role === 'jobseeker') {
        const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: reviewedUser.id } });
        if (jobSeeker) {
          jobSeeker.average_rating = averageRating;
          await this.jobSeekerRepository.save(jobSeeker);
        }
      } else if (reviewedUser.role === 'employer') {
        const employer = await this.employerRepository.findOne({ where: { user_id: reviewedUser.id } });
        if (employer) {
          employer.average_rating = averageRating;
          await this.employerRepository.save(employer);
        }
      }
    }

    return { message: 'Review deleted successfully' };
  }

  async getAnalytics(adminId: string) {
    await this.checkAdminRole(adminId);

    const totalUsers = await this.usersRepository.count();
    const employers = await this.usersRepository.count({ where: { role: 'employer' } });
    const jobSeekers = await this.usersRepository.count({ where: { role: 'jobseeker' } });
    const totalJobPosts = await this.jobPostsRepository.count();
    const activeJobPosts = await this.jobPostsRepository.count({ where: { status: 'Active' } });
    const totalApplications = await this.jobApplicationsRepository.count();
    const totalReviews = await this.reviewsRepository.count();

    return {
      totalUsers,
      employers,
      jobSeekers,
      totalJobPosts,
      activeJobPosts,
      totalApplications,
      totalReviews,
    };
  }

  async setApplicationLimit(adminId: string, jobPostId: string, limit: number) {
    await this.checkAdminRole(adminId);
    if (limit < 0) {
      throw new BadRequestException('Application limit must be a non-negative number');
    }
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    // Сохраняем лимит в базе (поле applicationLimit добавим позже)
    jobPost.applicationLimit = limit;
    await this.jobPostsRepository.save(jobPost);
    return { message: 'Application limit updated successfully', limit };
  }

  private async checkAdminRole(userId: string) {
    console.log('Checking admin role for userId:', userId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    console.log('Found user:', user);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admins can access this resource');
    }
  }
}
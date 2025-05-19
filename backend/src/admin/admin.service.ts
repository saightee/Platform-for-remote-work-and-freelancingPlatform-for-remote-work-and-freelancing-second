import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { Review } from '../reviews/review.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { UsersService } from '../users/users.service';
import { BlockedCountriesService } from '../blocked-countries/blocked-countries.service';
import { SettingsService } from '../settings/settings.service'; 
import { ApplicationLimitsService } from '../application-limits/application-limits.service'; 
import * as bcrypt from 'bcrypt';

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
    private usersService: UsersService,
    private blockedCountriesService: BlockedCountriesService,
    private settingsService: SettingsService, 
    private applicationLimitsService: ApplicationLimitsService, 
  ) {}

  private async checkAdminRole(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admins can access this resource');
    }
  }

  async getUsers(adminId: string, filters: { username?: string; email?: string; createdAfter?: string }) {
    console.log('Getting users for adminId:', adminId);
    await this.checkAdminRole(adminId);

    const query = this.usersRepository.createQueryBuilder('user');

    if (filters.username) {
      query.andWhere('user.username ILIKE :username', { username: `%${filters.username}%` });
    }

    if (filters.email) {
      query.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    }

    if (filters.createdAfter) {
      query.andWhere('user.created_at >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    const users = await query.getMany();
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

  async updateUser(adminId: string, userId: string, updates: { email?: string; username?: string; role?: 'employer' | 'jobseeker' }) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updates.email) user.email = updates.email;
    if (updates.username) user.username = updates.username;
    if (updates.role) {
      user.role = updates.role;

      // Обновляем связанные таблицы в зависимости от роли
      if (updates.role === 'jobseeker') {
        await this.employerRepository.delete({ user_id: userId });
        const jobSeeker = this.jobSeekerRepository.create({ user_id: userId });
        await this.jobSeekerRepository.save(jobSeeker);
      } else if (updates.role === 'employer') {
        await this.jobSeekerRepository.delete({ user_id: userId });
        const employer = this.employerRepository.create({ user_id: userId });
        await this.employerRepository.save(employer);
      }
    }

    return this.usersRepository.save(user);
  }

  async deleteUser(adminId: string, userId: string) {
    console.log('Deleting user with ID:', userId);
    await this.checkAdminRole(adminId);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // 1. Находим все заявки, где пользователь является job_seeker
      const applicationsAsSeeker = await this.jobApplicationsRepository.find({ where: { job_seeker_id: userId } });

      // 2. Находим все вакансии пользователя (если он employer) и связанные с ними заявки
      const postsAsEmployer = await this.jobPostsRepository.find({ where: { employer_id: userId } });
      const postIds = postsAsEmployer.map(post => post.id);
      const applicationsAsEmployer = postIds.length > 0
        ? await this.jobApplicationsRepository.find({ where: { job_post_id: In(postIds) } })
        : [];

      // 3. Собираем все ID заявок (как job_seeker и как employer)
      const allApplicationIds = [
        ...applicationsAsSeeker.map(app => app.id),
        ...applicationsAsEmployer.map(app => app.id)
      ];

      // 4. Удаляем все отзывы, связанные с этими заявками
      if (allApplicationIds.length > 0) {
        await this.reviewsRepository.createQueryBuilder()
          .delete()
          .from(Review)
          .where('job_application_id IN (:...applicationIds)', { applicationIds: allApplicationIds })
          .execute();
      }

      // 5. Удаляем все заявки, где пользователь является job_seeker
      await this.jobApplicationsRepository.delete({ job_seeker_id: userId });

      // 6. Удаляем заявки, связанные с вакансиями пользователя (если он employer)
      if (postIds.length > 0) {
        await this.jobApplicationsRepository.delete({ job_post_id: In(postIds) });
      }

      // 7. Удаляем все отзывы, где пользователь является reviewer или reviewed
      await this.reviewsRepository.delete({ reviewer_id: userId });
      await this.reviewsRepository.delete({ reviewed_id: userId });

      // 8. Удаляем вакансии пользователя (если он employer)
      if (user.role === 'employer') {
        await this.jobPostsRepository.delete({ employer_id: userId });
      }

      // 9. Удаляем профиль пользователя
      if (user.role === 'jobseeker') {
        await this.jobSeekerRepository.delete({ user_id: userId });
      } else if (user.role === 'employer') {
        await this.employerRepository.delete({ user_id: userId });
      }

      // 10. Удаляем самого пользователя
      await this.usersRepository.delete(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new BadRequestException('Failed to delete user: ' + error.message);
    }
  }

  async getJobPosts(adminId: string, filters: { status?: 'Active' | 'Draft' | 'Closed'; pendingReview?: boolean }) {
    await this.checkAdminRole(adminId);

    const query = this.jobPostsRepository.createQueryBuilder('job_post')
      .leftJoinAndSelect('job_post.employer', 'employer')
      .leftJoinAndSelect('job_post.category', 'category');

    if (filters.status) {
      query.andWhere('job_post.status = :status', { status: filters.status });
    }

    if (filters.pendingReview !== undefined) {
      query.andWhere('job_post.pending_review = :pendingReview', { pendingReview: filters.pendingReview });
    }

    return query.getMany();
  }

  async approveJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    jobPost.pending_review = false;
    return this.jobPostsRepository.save(jobPost);
  }

  async flagJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    jobPost.pending_review = true;
    return this.jobPostsRepository.save(jobPost);
  }

  async getJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId }, relations: ['employer', 'category'] });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    return jobPost;
  }

  async updateJobPost(adminId: string, jobPostId: string, updates: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based'; applicationLimit?: number }) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
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

  async deleteJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    try {
      // Находим все заявки, связанные с вакансией
      const applications = await this.jobApplicationsRepository.find({ where: { job_post_id: jobPostId } });

      // Удаляем все отзывы, связанные с этими заявками
      if (applications.length > 0) {
        const applicationIds = applications.map(app => app.id);
        await this.reviewsRepository.createQueryBuilder()
          .delete()
          .from(Review)
          .where('job_application_id IN (:...applicationIds)', { applicationIds })
          .execute();
      }

      // Удаляем связанные заявки
      await this.jobApplicationsRepository.delete({ job_post_id: jobPostId });

      // Удаляем саму вакансию
      await this.jobPostsRepository.delete(jobPostId);
      return { message: 'Job post deleted successfully' };
    } catch (error) {
      console.error('Error deleting job post:', error);
      throw new BadRequestException('Failed to delete job post: ' + error.message);
    }
  }

  async getReviews(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.reviewsRepository.find({ relations: ['reviewer', 'reviewed', 'job_application'] });
  }

  async deleteReview(adminId: string, reviewId: string) {
    await this.checkAdminRole(adminId);
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId }, relations: ['reviewed', 'job_application'] });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const reviewedUser = review.reviewed;
    await this.reviewsRepository.delete(reviewId);

    const remainingReviews = await this.reviewsRepository.find({ where: { reviewed_id: reviewedUser.id } });
    const averageRating = remainingReviews.length
      ? remainingReviews.reduce((sum, rev) => sum + rev.rating, 0) / remainingReviews.length
      : 0;

    if (review.job_application.job_seeker_id === reviewedUser.id) {
      await this.jobSeekerRepository.update(review.job_application.job_seeker_id, { average_rating: averageRating });
    } else {
      await this.employerRepository.update(review.job_application.job_seeker_id, { average_rating: averageRating });
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
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    const globalLimit = await this.settingsService.getGlobalApplicationLimit();
    if (limit > globalLimit) {
      throw new BadRequestException(`Application limit cannot exceed global limit of ${globalLimit}`);
    }

    jobPost.applicationLimit = limit;
    await this.jobPostsRepository.save(jobPost);

    // Инициализируем распределение по дням
    await this.applicationLimitsService.initializeLimits(jobPostId, limit);

    return { message: 'Application limit updated successfully', limit };
  }

  async setGlobalApplicationLimit(adminId: string, limit: number) {
    await this.checkAdminRole(adminId);
    if (limit < 0) {
      throw new BadRequestException('Global application limit must be a non-negative number');
    }
    await this.settingsService.setGlobalApplicationLimit(limit);
    return { message: 'Global application limit updated successfully', limit };
  }

  async getGlobalApplicationLimit(adminId: string) {
    await this.checkAdminRole(adminId);
    const limit = await this.settingsService.getGlobalApplicationLimit();
    return { globalApplicationLimit: limit };
  }

  async resetPassword(adminId: string, userId: string, newPassword: string) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('New hashed password:', hashedPassword);
    await this.usersService.updatePassword(userId, hashedPassword);

    const updatedUser = await this.usersRepository.findOne({ where: { id: userId } });
    console.log('Updated user password:', updatedUser?.password);

    return { message: 'Password reset successful' };
  }

  async addBlockedCountry(adminId: string, countryCode: string) {
    await this.checkAdminRole(adminId);
    return this.blockedCountriesService.addBlockedCountry(adminId, countryCode);
  }

  async removeBlockedCountry(adminId: string, countryCode: string) {
    await this.checkAdminRole(adminId);
    await this.blockedCountriesService.removeBlockedCountry(adminId, countryCode);
    return { message: 'Country removed from blocked list' };
  }

  async getBlockedCountries(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.blockedCountriesService.getBlockedCountries(adminId);
  }

  async getRegistrationStats(adminId: string, startDate: string, endDate: string, interval: 'day' | 'week' | 'month') {
    await this.checkAdminRole(adminId);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.usersService.getRegistrationStats(start, end, interval);
  }

  async getGeographicDistribution(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.usersService.getGeographicDistribution();
  }
}
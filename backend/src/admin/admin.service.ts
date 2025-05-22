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
import { ApplicationLimit } from '../application-limits/application-limit.entity';
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
    @InjectRepository(ApplicationLimit)
    private applicationLimitsRepository: Repository<ApplicationLimit>,
    private usersService: UsersService,
    private blockedCountriesService: BlockedCountriesService,
    private settingsService: SettingsService,
    private applicationLimitsService: ApplicationLimitsService,
  ) {}

  async checkAdminRole(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Only admins can access this resource');
    }
  }

  async getUsers(adminId: string, filters: { username?: string; email?: string; createdAfter?: string }) {
    await this.checkAdminRole(adminId);

    const query = this.usersRepository.createQueryBuilder('user');

    if (filters.username) {
      query.andWhere('user.username ILIKE :username', { username: `%${filters.username}%` });
    }
    if (filters.email) {
      query.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    }
    if (filters.createdAfter) {
      const createdAfterDate = new Date(filters.createdAfter);
      if (isNaN(createdAfterDate.getTime())) {
        throw new BadRequestException('Invalid createdAfter date format');
      }
      query.andWhere('user.created_at >= :createdAfter', { createdAfter: createdAfterDate });
    }

    return query.getMany();
  }

  async getUserById(adminId: string, userId: string) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(adminId: string, userId: string, updateData: { email?: string; username?: string; role?: 'employer' | 'jobseeker' | 'admin' }) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.email) {
      user.email = updateData.email;
    }
    if (updateData.username) {
      user.username = updateData.username;
    }
    if (updateData.role) {
      user.role = updateData.role;
      if (user.role === 'jobseeker') {
        const existingJobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: userId } });
        if (!existingJobSeeker) {
          const jobSeeker = this.jobSeekerRepository.create({ user_id: userId });
          await this.jobSeekerRepository.save(jobSeeker);
        }
        await this.employerRepository.delete({ user_id: userId });
      } else if (user.role === 'employer') {
        const existingEmployer = await this.employerRepository.findOne({ where: { user_id: userId } });
        if (!existingEmployer) {
          const employer = this.employerRepository.create({ user_id: userId });
          await this.employerRepository.save(employer);
        }
        await this.jobSeekerRepository.delete({ user_id: userId });
      }
    }

    return this.usersRepository.save(user);
  }

  async deleteUser(adminId: string, userId: string) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Удаляем связанные записи
      if (user.role === 'employer') {
        // Удаляем вакансии работодателя
        const jobPosts = await this.jobPostsRepository.find({ where: { employer_id: userId } });
        for (const jobPost of jobPosts) {
          const applications = await this.jobApplicationsRepository.find({ where: { job_post_id: jobPost.id } });
          if (applications.length > 0) {
            const applicationIds = applications.map(app => app.id);
            await this.reviewsRepository.createQueryBuilder()
              .delete()
              .from(Review)
              .where('job_application_id IN (:...applicationIds)', { applicationIds })
              .execute();
          }
          await this.jobApplicationsRepository.delete({ job_post_id: jobPost.id });
          await this.applicationLimitsRepository.delete({ job_post_id: jobPost.id });
          await this.jobPostsRepository.delete(jobPost.id);
        }
      } else if (user.role === 'jobseeker') {
        // Удаляем заявки фрилансера
        const applications = await this.jobApplicationsRepository.find({ where: { job_seeker_id: userId } });
        if (applications.length > 0) {
          const applicationIds = applications.map(app => app.id);
          await this.reviewsRepository.createQueryBuilder()
            .delete()
            .from(Review)
            .where('job_application_id IN (:...applicationIds)', { applicationIds })
            .execute();
        }
        await this.jobApplicationsRepository.delete({ job_seeker_id: userId });
      }

      // Удаляем отзывы, где пользователь — reviewer или reviewed
      await this.reviewsRepository.delete({ reviewer_id: userId });
      await this.reviewsRepository.delete({ reviewed_id: userId });

      // Удаляем обратную связь
      await this.usersRepository.manager.getRepository('Feedback').delete({ user_id: userId });

      // Удаляем профиль (JobSeeker или Employer)
      if (user.role === 'jobseeker') {
        await this.jobSeekerRepository.delete({ user_id: userId });
      } else if (user.role === 'employer') {
        await this.employerRepository.delete({ user_id: userId });
      }

      // Удаляем пользователя
      await this.usersRepository.delete(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new BadRequestException('Failed to delete user: ' + error.message);
    }
  }

  async resetPassword(adminId: string, userId: string, newPassword: string) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await this.usersService.updatePassword(userId, hashedPassword);
    return { message: 'Password reset successful' };
  }

  async getJobPosts(adminId: string, filters: { status?: string; pendingReview?: boolean }) {
    await this.checkAdminRole(adminId);

    const query = this.jobPostsRepository.createQueryBuilder('jobPost')
      .leftJoinAndSelect('jobPost.category', 'category')
      .leftJoinAndSelect('jobPost.employer', 'employer');

    if (filters.status) {
      query.andWhere('jobPost.status = :status', { status: filters.status });
    }
    if (filters.pendingReview !== undefined) {
      query.andWhere('jobPost.pending_review = :pendingReview', { pendingReview: filters.pendingReview });
    }

    return query.getMany();
  }

  async updateJobPost(adminId: string, jobPostId: string, updateData: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed' }) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    if (updateData.title) {
      jobPost.title = updateData.title;
    }
    if (updateData.description) {
      jobPost.description = updateData.description;
    }
    if (updateData.location) {
      jobPost.location = updateData.location;
    }
    if (updateData.salary) {
      jobPost.salary = updateData.salary;
    }
    if (updateData.status) {
      jobPost.status = updateData.status;
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

      // Удаляем связанные лимиты заявок
      await this.applicationLimitsRepository.delete({ job_post_id: jobPostId });

      // Удаляем саму вакансию
      await this.jobPostsRepository.delete(jobPostId);
      return { message: 'Job post deleted successfully' };
    } catch (error) {
      console.error('Error deleting job post:', error);
      throw new BadRequestException('Failed to delete job post: ' + error.message);
    }
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

    const reviewedUserId = review.reviewed_id;
    const reviewedUser = await this.usersRepository.findOne({ where: { id: reviewedUserId } });
    if (!reviewedUser) {
      return { message: 'Review deleted successfully' };
    }

    const reviews = await this.reviewsRepository.find({ where: { reviewed_id: reviewedUserId } });
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    if (reviewedUser.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: reviewedUserId } });
      if (jobSeeker) {
        jobSeeker.average_rating = averageRating;
        await this.jobSeekerRepository.save(jobSeeker);
      }
    } else if (reviewedUser.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: reviewedUserId } });
      if (employer) {
        employer.average_rating = averageRating;
        await this.employerRepository.save(employer);
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

    await this.applicationLimitsService.initializeLimits(jobPostId, limit);

    return { message: 'Application limit updated successfully', limit };
  }

  async verifyIdentity(userId: string, verify: boolean, authHeader: string) {
    if (typeof verify !== 'boolean') {
      throw new BadRequestException('Verify parameter must be a boolean');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.identity_document) {
      throw new NotFoundException('No identity document uploaded');
    }

    user.identity_verified = verify;
    await this.usersRepository.save(user);

    return { message: 'Identity verification status updated', identity_verified: user.identity_verified };
  }

  async addBlockedCountry(adminId: string, countryCode: string) {
    await this.checkAdminRole(adminId);
    return this.blockedCountriesService.addBlockedCountry(countryCode);
  }

  async removeBlockedCountry(adminId: string, countryCode: string) {
    await this.checkAdminRole(adminId);
    return this.blockedCountriesService.removeBlockedCountry(countryCode);
  }

  async getBlockedCountries(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.blockedCountriesService.getBlockedCountries();
  }

  async getRegistrationStats(adminId: string, startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month') {
    await this.checkAdminRole(adminId);
    return this.usersService.getRegistrationStats(startDate, endDate, interval);
  }

  async getGeographicDistribution(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.usersService.getGeographicDistribution();
  }
}
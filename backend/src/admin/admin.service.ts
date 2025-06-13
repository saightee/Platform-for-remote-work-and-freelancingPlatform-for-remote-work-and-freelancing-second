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
import { LeaderboardsService } from '../leaderboards/leaderboards.service';
import { RedisService } from '../redis/redis.service';
import { createObjectCsvStringifier } from 'csv-writer';
import * as bcrypt from 'bcrypt';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service'; 
import { UserFingerprint } from '../anti-fraud/entities/user-fingerprint.entity';
import { EmailService } from '../email/email.service';

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
    @InjectRepository(UserFingerprint)
    private fingerprintRepository: Repository<UserFingerprint>,
    private usersService: UsersService,
    private blockedCountriesService: BlockedCountriesService,
    private settingsService: SettingsService,
    private applicationLimitsService: ApplicationLimitsService,
    private leaderboardsService: LeaderboardsService,
    private redisService: RedisService,
    private antiFraudService: AntiFraudService,
    private emailService: EmailService,
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
          if (user.role === 'employer') {
              const jobPosts = await this.jobPostsRepository.find({ where: { employer_id: userId } });
              for (const jobPost of jobPosts) {
                  const applications = await this.jobApplicationsRepository.find({ where: { job_post_id: jobPost.id } });
                  if (applications.length > 0) {
                      const applicationIds = applications.map(app => app.id);
                      await this.reviewsRepository.delete({ job_application_id: In(applicationIds) });
                  }
                  await this.jobApplicationsRepository.delete({ job_post_id: jobPost.id });
                  await this.applicationLimitsRepository.delete({ job_post_id: jobPost.id });
                  await this.jobPostsRepository.delete(jobPost.id);
              }
              await this.employerRepository.delete({ user_id: userId });
          } else if (user.role === 'jobseeker') {
              const applications = await this.jobApplicationsRepository.find({ where: { job_seeker_id: userId } });
              if (applications.length > 0) {
                  const applicationIds = applications.map(app => app.id);
                  await this.reviewsRepository.delete({ job_application_id: In(applicationIds) });
              }
              await this.jobApplicationsRepository.delete({ job_seeker_id: userId });
              await this.jobSeekerRepository.delete({ user_id: userId });
          }
        
          await this.reviewsRepository.delete({ reviewer_id: userId });
          await this.reviewsRepository.delete({ reviewed_id: userId });
        
          await this.fingerprintRepository.delete({ user_id: userId });
        
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

  async getJobPosts(adminId: string, filters: { 
    status?: 'Active' | 'Draft' | 'Closed'; 
    pendingReview?: boolean; 
    title?: string; 
    page?: number; 
    limit?: number; 
  }) {
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
    if (filters.title) {
      query.andWhere('jobPost.title ILIKE :title', { title: `%${filters.title}%` });
    }

    const total = await query.getCount();

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    query.orderBy('jobPost.created_at', 'DESC');

    const jobPosts = await query.getMany();

    return {
      total,
      data: jobPosts,
    };
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

      const applications = await this.jobApplicationsRepository.find({ where: { job_post_id: jobPostId } });

      if (applications.length > 0) {
        const applicationIds = applications.map(app => app.id);
        await this.reviewsRepository.createQueryBuilder()
          .delete()
          .from(Review)
          .where('job_application_id IN (:...applicationIds)', { applicationIds })
          .execute();
      }

      await this.jobApplicationsRepository.delete({ job_post_id: jobPostId });
      await this.applicationLimitsRepository.delete({ job_post_id: jobPostId });
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
  
  async blockUser(adminId: string, userId: string) {
  await this.checkAdminRole(adminId);
  const user = await this.usersRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  if (user.status === 'blocked') {
    throw new BadRequestException('User is already blocked');
  }
  
  user.status = 'blocked';
  await this.usersRepository.save(user);
  return { message: 'User blocked successfully' };
  }

  async unblockUser(adminId: string, userId: string) {
    await this.checkAdminRole(adminId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'active') {
      throw new BadRequestException('User is already active');
    }

    user.status = 'active';
    await this.usersRepository.save(user);
    return { message: 'User unblocked successfully' };
  }

  async getTopJobseekersByViews(adminId: string, limit: number = 10) {
    await this.checkAdminRole(adminId);
    return this.leaderboardsService.getTopJobseekersByViews(adminId, limit);
  }

  async exportUsersToCsv(adminId: string): Promise<string> {
    await this.checkAdminRole(adminId);
    
    const users = await this.usersRepository.find();
    
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'User ID' },
        { id: 'email', title: 'Email' },
        { id: 'username', title: 'Username' },
        { id: 'role', title: 'Role' },
        { id: 'status', title: 'Status' },
        { id: 'created_at', title: 'Created At' },
        { id: 'updated_at', title: 'Updated At' },
      ],
    });
  
    const records = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    }));
  
    const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    return csvData;
  }

  async getGrowthTrends(adminId: string, period: '7d' | '30d') {
    await this.checkAdminRole(adminId);
    const days = period === '7d' ? 7 : 30;
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);

    const registrations = await this.usersService.getRegistrationStats(startDate, endDate, 'day');
    const jobPosts = await this.jobPostsRepository
      .createQueryBuilder('jobPost')
      .select(`DATE_TRUNC('day', jobPost.created_at) as period`)
      .addSelect('COUNT(*) as count')
      .where('jobPost.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return {
      registrations: registrations.map(r => ({ period: r.period, count: r.count })),
      jobPosts: jobPosts.map(j => ({ period: j.period, count: parseInt(j.count, 10) })),
    };
  }

  async getRecentRegistrations(adminId: string, limit: number = 5) {
    await this.checkAdminRole(adminId);
    const users = await this.usersRepository.find({
      where: [{ role: 'jobseeker' }, { role: 'employer' }],
      order: { created_at: 'DESC' },
      take: limit * 2,
    });
    return {
      jobseekers: users.filter(u => u.role === 'jobseeker').slice(0, limit).map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        created_at: u.created_at,
      })),
      employers: users.filter(u => u.role === 'employer').slice(0, limit).map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        created_at: u.created_at,
      })),
    };
  }

  async getJobPostsWithApplications(adminId: string) {
      await this.checkAdminRole(adminId);
      const jobPosts = await this.jobPostsRepository
          .createQueryBuilder('jobPost')
          .leftJoin('jobPost.applications', 'application')
          .addSelect('COUNT(application.id) as applicationCount')
          .groupBy('jobPost.id')
          .getRawAndEntities();
  
      return jobPosts.entities.map((post, index) => ({
          id: post.id,
          title: post.title,
          status: post.status,
          applicationCount: parseInt(jobPosts.raw[index].applicationCount) || 0,
          created_at: post.created_at,
      }));
  }

  async getOnlineUsers(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.redisService.getOnlineUsers();
  }

  async getUserRiskScore(adminId: string, userId: string) {
    await this.checkAdminRole(adminId);
    return this.antiFraudService.getRiskScore(userId);
  }

  async notifyJobSeekers(
      adminId: string,
      jobPostId: string,
      limit: number,
      orderBy: 'beginning' | 'end' | 'random',
    ) {
      await this.checkAdminRole(adminId);

      const jobPost = await this.jobPostsRepository.findOne({ 
        where: { id: jobPostId }, 
        relations: ['employer', 'category'] 
      });
      if (!jobPost) {
        throw new NotFoundException('Job post not found');
      }
      if (!jobPost.category_id) {
        throw new BadRequestException('Job post has no category assigned');
      }

      const query = this.jobSeekerRepository
        .createQueryBuilder('jobSeeker')
        .leftJoinAndSelect('jobSeeker.user', 'user')
        .leftJoinAndSelect('jobSeeker.categories', 'categories')
        .where('user.role = :role', { role: 'jobseeker' })
        .andWhere('user.status = :status', { status: 'active' })
        .andWhere('user.is_email_verified = :isEmailVerified', { isEmailVerified: true })
        .andWhere('categories.id = :categoryId', { categoryId: jobPost.category_id });

      const total = await query.getCount();

      // Ограничение количества и сортировка
      query.take(limit);
      if (orderBy === 'beginning') {
        query.orderBy('user.created_at', 'ASC');
      } else if (orderBy === 'end') {
        query.orderBy('user.created_at', 'DESC');
      } else if (orderBy === 'random') {
        query.orderBy('RANDOM()');
      }

      const jobSeekers = await query.getMany();

      for (const jobSeeker of jobSeekers) {
        try {
          await this.emailService.sendJobNotification(
            jobSeeker.user.email,
            jobSeeker.user.username,
            jobPost.title,
            jobPost.description,
            `${process.env.BASE_URL}/job-posts/${jobPost.id}`
          );
        } catch (error) {
          console.error(`Failed to send email to ${jobSeeker.user.email}:`, error.message);
        }
      }

      return {
        total,
        sent: jobSeekers.length,
        jobPostId,
      };
    }
}
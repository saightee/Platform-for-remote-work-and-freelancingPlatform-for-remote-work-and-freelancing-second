import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
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
import { Complaint } from '../complaints/complaint.entity';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.entity';
import { Feedback } from '../feedback/feedback.entity';
import { PlatformFeedback } from '../platform-feedback/platform-feedback.entity';
import { Message } from '../chat/entities/message.entity';
import { EmailNotification } from '../email-notifications/email-notification.entity';
import { ReferralRegistration } from '../referrals/entities/referral-registration.entity';
import { ReferralLink } from '../referrals/entities/referral-link.entity';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';


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
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private categoriesService: CategoriesService,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(PlatformFeedback)
    private platformFeedbackRepository: Repository<PlatformFeedback>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(EmailNotification)
    private emailNotificationsRepository: Repository<EmailNotification>,
    @InjectRepository(ReferralLink)
    private referralLinksRepository: Repository<ReferralLink>,
    @InjectRepository(ReferralRegistration)
    private referralRegistrationsRepository: Repository<ReferralRegistration>,
    private configService: ConfigService,
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

  async getUsers(
    adminId: string,
    filters: {
      username?: string;
      email?: string;
      id?: string;
      createdAfter?: string;
      role?: 'employer' | 'jobseeker' | 'admin' | 'moderator';
      status?: 'active' | 'blocked';
      page?: number;
      limit?: number;
    }
  ) {
    await this.checkAdminRole(adminId);

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.role',
        'user.status',
        'user.risk_score',
        'user.created_at',
        'user.last_seen_at',
      ]);

    let hasSearch = false;
    const conditions: string[] = [];
    if (filters.username) conditions.push('user.username ILIKE :username');
    if (filters.email)    conditions.push('user.email ILIKE :email');
    if (filters.id)       conditions.push('user.id = :id');
    if (conditions.length) {
      qb.andWhere(`(${conditions.join(' OR ')})`);
      hasSearch = true;
    }

    if (filters.role)   qb.andWhere('user.role = :role', { role: filters.role });
    if (filters.status) qb.andWhere('user.status = :status', { status: filters.status });

    if (filters.createdAfter) {
      const createdAfterDate = new Date(filters.createdAfter);
      if (isNaN(createdAfterDate.getTime())) {
        throw new BadRequestException('Invalid createdAfter date format');
      }
      qb.andWhere('user.created_at >= :createdAfter', { createdAfter: createdAfterDate });
    }

    const params: any = {};
    if (filters.username) params.username = `%${filters.username}%`;
    if (filters.email)    params.email    = `%${filters.email}%`;
    if (filters.id)       params.id       = filters.id;
    if (hasSearch) qb.setParameters(params);

    const total = await qb.getCount();
    const page  = filters.page  || 1;
    const limit = filters.limit || 10;
    const skip  = (page - 1) * limit;

    qb.orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const data = await qb.getMany();
    return { total, data };
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
            await this.messagesRepository.delete({ job_application_id: In(applicationIds) });
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
          await this.messagesRepository.delete({ job_application_id: In(applicationIds) });
        }
        await this.jobApplicationsRepository.delete({ job_seeker_id: userId });
        await this.jobSeekerRepository.delete({ user_id: userId });
      }

      await this.reviewsRepository.delete({ reviewer_id: userId });
      await this.reviewsRepository.delete({ reviewed_id: userId });

      await this.complaintsRepository.delete({ complainant_id: userId });
      await this.complaintsRepository.delete({ profile_id: userId });

      await this.feedbackRepository.delete({ user_id: userId });
      await this.fingerprintRepository.delete({ user_id: userId });
      await this.platformFeedbackRepository.delete({ user_id: userId });
      await this.referralRegistrationsRepository.delete({ user: { id: userId } });

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
    employer_id?: string;
    employer_username?: string; 
    category_id?: string;
    page?: number;
    limit?: number;
    id?: string;
    salary_type?: 'per hour' | 'per month' | 'negotiable';
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
    if (filters.employer_id) {
      query.andWhere('jobPost.employer_id = :employer_id', { employer_id: filters.employer_id });
    }
    if (filters.employer_username) {
      query.andWhere('employer.username ILIKE :employer_username', { employer_username: `%${filters.employer_username}%` });
    }
    if (filters.category_id) {
      query.andWhere('jobPost.category_id = :category_id', { category_id: filters.category_id });
    }
    if (filters.title) {
      query.andWhere('jobPost.title ILIKE :title', { title: `%${filters.title}%` });
    }
    if (filters.id) {
      query.andWhere('jobPost.id = :id', { id: filters.id });
    }
    if (filters.salary_type) {
      query.andWhere('jobPost.salary_type = :salary_type', { salary_type: filters.salary_type });
    }

    const total = await query.getCount();

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    query.orderBy('jobPost.created_at', 'DESC');

    const jobPosts = await query.getMany();

    const enhancedJobPosts = await Promise.all(jobPosts.map(async (post) => {
      const stats = await this.emailNotificationsRepository.createQueryBuilder('n')
        .select('COUNT(*) as sent, SUM(CASE WHEN n.opened THEN 1 ELSE 0 END) as opened, SUM(CASE WHEN n.clicked THEN 1 ELSE 0 END) as clicked')
        .where('n.job_post_id = :id', { id: post.id })
        .getRawOne();
      return {
        ...post,
        emailStats: {
          sent: parseInt(stats.sent) || 0,
          opened: parseInt(stats.opened) || 0,
          clicked: parseInt(stats.clicked) || 0,
        },
      };
    }));

    return {
      total,
      data: enhancedJobPosts,
    };
  }

  async updateJobPost(adminId: string, jobPostId: string, updates: { 
    title?: string; 
    description?: string; 
    location?: string; 
    salary?: number; 
    status?: 'Active' | 'Draft' | 'Closed'; 
    salary_type?: 'per hour' | 'per month' | 'negotiable';  
    excluded_locations?: string[];  
  }) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
  
  const effectiveSalaryType = updates.salary_type ?? jobPost.salary_type;

  if (effectiveSalaryType === 'negotiable') {
    jobPost.salary = null;
  } else if (updates.salary === undefined && jobPost.salary === null) {
    throw new BadRequestException('Salary is required unless salary_type is negotiable');
  }

    if (updates.title) jobPost.title = updates.title;
    if (updates.description) jobPost.description = updates.description;
    if (updates.location) jobPost.location = updates.location;
    if (updates.salary !== undefined) jobPost.salary = updates.salary;
    if (updates.status) jobPost.status = updates.status;
    if (updates.salary_type) jobPost.salary_type = updates.salary_type;
    if (updates.excluded_locations) jobPost.excluded_locations = updates.excluded_locations;

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
        await this.messagesRepository.delete({ job_application_id: In(applicationIds) });
      }
      await this.jobApplicationsRepository.delete({ job_post_id: jobPostId });
      await this.applicationLimitsRepository.delete({ job_post_id: jobPostId });
      await this.complaintsRepository.delete({ job_post_id: jobPostId });
      await this.referralLinksRepository.delete({ job_post: { id: jobPostId } });
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
    return this.reviewsRepository.find({
      relations: ['reviewer', 'reviewed', 'job_application', 'job_application.job_post', 'job_application.job_seeker'],
    });
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

  async setApplicationLimit(adminId: string, limit: number) {
    await this.checkAdminRole(adminId);
    if (limit < 0) {
      throw new BadRequestException('Application limit must be a non-negative number');
    }
    await this.settingsService.setGlobalApplicationLimit(limit);
    const jobPosts = await this.jobPostsRepository.find();
    for (const jobPost of jobPosts) {
      await this.applicationLimitsService.initializeLimits(jobPost.id, limit);
    }
    return { message: 'Global application limit updated successfully for all job posts', limit };
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

  async getRegistrationStats(
    adminId: string,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month',
    role: 'jobseeker' | 'employer' | 'all' = 'all', 
  ) {
    await this.checkAdminRole(adminId);
    return this.usersService.getRegistrationStats(startDate, endDate, interval, role); 
  }

  async getGeographicDistribution(
    adminId: string,
    role: 'jobseeker' | 'employer' | 'all' = 'all',
    startDate?: Date,
    endDate?: Date,
  ) {
    await this.checkAdminRole(adminId);
  
    let adjustedEndDate = endDate;
    if (endDate) {
      adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);  
    }
  
    const query = this.usersRepository
      .createQueryBuilder('user')
      .select('user.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.country');
  
    if (role !== 'all') {
      query.andWhere('user.role = :role', { role });
    }
  
    if (startDate) {
      query.andWhere('user.created_at >= :startDate', { startDate });
    }
  
    if (adjustedEndDate) {
      query.andWhere('user.created_at <= :adjustedEndDate', { adjustedEndDate });
    }
  
    const result = await query.getRawMany();
  
    return result.map(item => ({
      country: item.country || 'Unknown',
      count: parseInt(item.count, 10),
    }));
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

  async getJobPostsWithApplications(adminId: string, status?: string, limit: number = 5) {
    await this.checkAdminRole(adminId);
    const query = this.jobPostsRepository
      .createQueryBuilder('jobPost')
      .leftJoin('jobPost.applications', 'application')
      .leftJoin('jobPost.employer', 'user')
      .leftJoin('employers', 'employer', 'employer.user_id = user.id')
      .select([
        'jobPost.id AS id',
        'jobPost.title AS title',
        'jobPost.status AS status',
        'jobPost.created_at AS created_at',
        'user.id AS user_id',
        'user.username AS username',
        'employer.company_name AS company_name',
        'COUNT(application.id) AS application_count',
      ])
      .groupBy('jobPost.id, user.id, user.username, employer.company_name, employer.user_id')
      .take(limit);

    if (status) {
      query.andWhere('jobPost.status = :status', { status });
    }

    const jobPosts = await query.getRawMany();
    console.log('Raw query result:', JSON.stringify(jobPosts, null, 2));
    console.log('Query:', query.getSql());

    return jobPosts.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      applicationCount: parseInt(row.application_count) || 0, 
      created_at: row.created_at,
      employer: {
        id: row.user_id,
        username: row.username,
        company_name: row.company_name || null,
      },
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
      relations: ['employer', 'category'],
    });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    if (!jobPost.category_id) {
      throw new BadRequestException('Job post has no category assigned');
    }
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Notifications can only be sent for active job posts');
    }

    // Подзапрос для получения jobSeeker с нужной категорией
    const subQuery = this.jobSeekerRepository
      .createQueryBuilder('js')
      .leftJoin('js.skills', 'skills')
      .where('skills.id = :categoryId', { categoryId: jobPost.category_id })
      .select('js.user_id');

    const query = this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoinAndSelect('jobSeeker.user', 'user')
      .where('jobSeeker.user_id IN (' + subQuery.getQuery() + ')')
      .andWhere('user.role = :role', { role: 'jobseeker' })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.is_email_verified = :isEmailVerified', { isEmailVerified: true })
      .setParameters(subQuery.getParameters()); // Передаем параметры из subQuery

    const total = await query.getCount();

    query.take(limit);
    if (orderBy === 'beginning') {
      query.orderBy('user.created_at', 'ASC');
    } else if (orderBy === 'end') {
      query.orderBy('user.created_at', 'DESC');
    } else if (orderBy === 'random') {
      query.addSelect('RANDOM()', 'randomOrder').orderBy('randomOrder', 'ASC'); // Добавляем RANDOM() в SELECT
    }

    const jobSeekers = await query.getMany();

    let sentCount = 0;
    const sentEmails = [];

    for (const jobSeeker of jobSeekers) {
      try {
        const response = await this.emailService.sendJobNotification(
          jobSeeker.user.email,
          jobSeeker.user.username,
          jobPost.title,
          jobPost.description,
          `${this.configService.get('BASE_URL')}/jobs/${jobPost.id}`,
        );

        // Сохраняем уведомление в БД
        const notification = this.emailNotificationsRepository.create({
          job_post_id: jobPostId,
          recipient_email: jobSeeker.user.email,
          recipient_username: jobSeeker.user.username,
          message_id: response.messageId,
          sent_at: new Date(),
        });
        await this.emailNotificationsRepository.save(notification);

        sentEmails.push(jobSeeker.user.email);
        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to ${jobSeeker.user.email}:`, error.message);
      }
    }

    return {
      total,
      sent: sentCount,
      emails: sentEmails,
      jobPostId,
    };
  }

  async notifyReferralApplicants(
    adminId: string,
    jobPostId: string,
    limit: number,
    orderBy: 'beginning' | 'end' | 'random',
  ) {
    await this.checkAdminRole(adminId);
  
    const jobPost = await this.jobPostsRepository.findOne({
      where: { id: jobPostId },
      relations: ['employer', 'category'],
    });
    if (!jobPost) throw new NotFoundException('Job post not found');
    if (!jobPost.category_id) throw new BadRequestException('Job post has no category assigned');
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Notifications can only be sent for active job posts');
    }
  
    // подберём пользователей, у кого были ЗАЯВКИ по реф-ссылке в этой категории
    const subAppliedViaReferral = this.jobApplicationsRepository
      .createQueryBuilder('a')
      .leftJoin('a.job_post', 'prev')
      .where('a.referral_link_id IS NOT NULL')
      .andWhere('prev.category_id = :catId', { catId: jobPost.category_id })
      .select('a.job_seeker_id');
  
    const qb = this.jobSeekerRepository
      .createQueryBuilder('js')
      .leftJoinAndSelect('js.user', 'user')
      .where(`js.user_id IN (${subAppliedViaReferral.getQuery()})`)
      .andWhere('user.role = :role', { role: 'jobseeker' })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.is_email_verified = :isEmailVerified', { isEmailVerified: true })
      // исключаем тех, кто УЖЕ подался на эту вакансию
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM job_applications a2
        WHERE a2.job_post_id = :thisJob AND a2.job_seeker_id = js.user_id
      )`, { thisJob: jobPostId })
      // и тех, кому уже слали письмо по этой вакансии (не обязательно, но полезно)
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM email_notifications en
        WHERE en.job_post_id = :thisJob AND en.recipient_email = user.email
      )`, { thisJob: jobPostId })
      .setParameters(subAppliedViaReferral.getParameters());
      
    const total = await qb.getCount();
      
    qb.take(limit);
    if (orderBy === 'beginning') qb.orderBy('user.created_at', 'ASC');
    else if (orderBy === 'end') qb.orderBy('user.created_at', 'DESC');
    else qb.addSelect('RANDOM()', 'r').orderBy('r', 'ASC');
      
    const jobSeekers = await qb.getMany();
      
    let sent = 0;
    for (const js of jobSeekers) {
      try {
        const resp = await this.emailService.sendJobNotification(
          js.user.email,
          js.user.username,
          jobPost.title,
          jobPost.description,
          `${this.configService.get('BASE_URL')}/jobs/${jobPost.id}`,
        );
        await this.emailNotificationsRepository.save(
          this.emailNotificationsRepository.create({
            job_post_id: jobPostId,
            recipient_email: js.user.email,
            recipient_username: js.user.username,
            message_id: resp.messageId,
            sent_at: new Date(),
          }),
        );
        sent++;
      } catch (e) {
        console.error(`Failed to send email to ${js.user.email}:`, (e as Error).message);
      }
    }
  
    return { total, sent, jobPostId };
  }

  async getEmailStatsForJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);

    const notifications = await this.emailNotificationsRepository.find({ where: { job_post_id: jobPostId } });
    const sent = notifications.length;
    const opened = notifications.filter(n => n.opened).length;
    const clicked = notifications.filter(n => n.clicked).length;
    const details = notifications.map(n => ({
      email: n.recipient_email,
      username: n.recipient_username,
      opened: n.opened,
      clicked: n.clicked,
      sent_at: n.sent_at,
      opened_at: n.opened_at,
      clicked_at: n.clicked_at,
    }));

    return { sent, opened, clicked, details };
  }
  
  async getAllEmailStats(
    adminId: string, 
    filters: { jobPostId?: string, title?: string, employerId?: string, employerEmail?: string, employerUsername?: string }
  ) {
    await this.checkAdminRole(adminId);

    const query = this.emailNotificationsRepository.createQueryBuilder('notification')
      .leftJoin('job_posts', 'jobPost', 'notification.job_post_id = jobPost.id')  
      .leftJoin('users', 'employer', 'jobPost.employer_id = employer.id');  

    if (filters.jobPostId) {
      query.andWhere('notification.job_post_id = :jobPostId', { jobPostId: filters.jobPostId });
    }
    if (filters.title) {
      query.andWhere('jobPost.title LIKE :title', { title: `%${filters.title}%` }); 
    }
    if (filters.employerId) {
      query.andWhere('jobPost.employer_id = :employerId', { employerId: filters.employerId });
    }
    if (filters.employerEmail) {
      query.andWhere('employer.email LIKE :employerEmail', { employerEmail: `%${filters.employerEmail}%` });
    }
    if (filters.employerUsername) {
      query.andWhere('employer.username LIKE :employerUsername', { employerUsername: `%${filters.employerUsername}%` });
    }

    const notifications = await query.getMany();
    const sent = notifications.length;
    const opened = notifications.filter(n => n.opened).length;
    const clicked = notifications.filter(n => n.clicked).length;
    const details = notifications.map(n => ({
      job_post_id: n.job_post_id,
      email: n.recipient_email,
      username: n.recipient_username,
      opened: n.opened,
      clicked: n.clicked,
      sent_at: n.sent_at,
      opened_at: n.opened_at,
      clicked_at: n.clicked_at,
    }));

    return { sent, opened, clicked, details };
  }

  async getNotificationByMessageId(messageId: string): Promise<EmailNotification | null> {
    return this.emailNotificationsRepository.findOne({ where: { message_id: messageId } });
  }

  async updateNotification(notification: EmailNotification): Promise<EmailNotification> {
    return this.emailNotificationsRepository.save(notification);
  }

  async createCategory(adminId: string, name: string, parentId?: string) {
    await this.checkAdminRole(adminId);
    return this.categoriesService.createCategory(name, parentId);
  }

  async getCategories(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.categoriesService.getCategories();
  }

  async searchCategories(adminId: string, searchTerm: string) {
    await this.checkAdminRole(adminId);
    return this.categoriesService.searchCategories(searchTerm);
  }

  async getPlatformFeedback(adminId: string, page = 1, limit = 10) {
    await this.checkAdminRole(adminId);
    const [data, total] = await this.platformFeedbackRepository.findAndCount({
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { total, data };
  }
  
  async publishPlatformFeedback(adminId: string, feedbackId: string) {
    await this.checkAdminRole(adminId);
    const fb = await this.platformFeedbackRepository.findOne({ where: { id: feedbackId } });
    if (!fb) throw new NotFoundException('Platform feedback not found');
    if (!fb.allowed_to_publish) {
      throw new BadRequestException('User did not allow publishing this story');
    }
    fb.is_public = true;
    return this.platformFeedbackRepository.save(fb);
  }
  
  async unpublishPlatformFeedback(adminId: string, feedbackId: string) {
    await this.checkAdminRole(adminId);
    const fb = await this.platformFeedbackRepository.findOne({ where: { id: feedbackId } });
    if (!fb) throw new NotFoundException('Platform feedback not found');
    fb.is_public = false;
    return this.platformFeedbackRepository.save(fb);
  }

  async deletePlatformFeedback(adminId: string, feedbackId: string) {
    await this.checkAdminRole(adminId);
    const feedback = await this.platformFeedbackRepository.findOne({ where: { id: feedbackId } });
    if (!feedback) {
      throw new NotFoundException('Platform feedback not found');
    }
    await this.platformFeedbackRepository.delete(feedbackId);
    return { message: 'Platform feedback deleted successfully' };
  }

  async rejectJobPost(adminId: string, jobPostId: string, reason: string) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId }, relations: ['employer'] });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    const applications = await this.jobApplicationsRepository.find({ where: { job_post_id: jobPostId } });
    if (applications.length > 0) {
      const applicationIds = applications.map(app => app.id);
      await this.reviewsRepository.createQueryBuilder()
        .delete()
        .from(Review)
        .where('job_application_id IN (:...applicationIds)', { applicationIds })
        .execute();
      await this.messagesRepository.delete({ job_application_id: In(applicationIds) });
    }
    await this.jobApplicationsRepository.delete({ job_post_id: jobPostId });
    await this.applicationLimitsRepository.delete({ job_post_id: jobPostId });
    await this.complaintsRepository.delete({ job_post_id: jobPostId });
    await this.jobPostsRepository.delete(jobPostId);

    try {
      await this.emailService.sendJobPostRejectionNotification(
        jobPost.employer.email,
        jobPost.employer.username,
        jobPost.title,
        reason
      );
    } catch (error) {
      console.error(`Failed to send rejection email to ${jobPost.employer.email}:`, error.message);
    }

    return { message: 'Job post rejected successfully', reason };
  }

  async deleteCategory(adminId: string, categoryId: string) {
    await this.checkAdminRole(adminId);

    const category = await this.categoriesRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subcategories = await this.categoriesRepository.find({ where: { parent_id: categoryId } });
    if (subcategories.length > 0) {
      throw new BadRequestException('You cannot delete a category that contains subcategories. First remove subcategories.');
    }

    const jobPosts = await this.jobPostsRepository.find({ where: { category_id: categoryId } });
    if (jobPosts.length > 0) {
      await this.jobPostsRepository.update({ category_id: categoryId }, { category_id: null });
      console.log(`Updated ${jobPosts.length} vacancies: category_id set to null`);
    }

    const jobSeekers = await this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoin('jobSeeker.skills', 'category')
      .where('category.id = :categoryId', { categoryId })
      .getMany();

    if (jobSeekers.length > 0) {
      for (const jobSeeker of jobSeekers) {
        jobSeeker.skills = jobSeeker.skills.filter(skill => skill.id !== categoryId);
        await this.jobSeekerRepository.save(jobSeeker);
      }
      console.log(`Updated ${jobSeekers.length} jobseeker profiles: category removed from skills`);
    }

    await this.categoriesRepository.delete(categoryId);

    return { message: 'Category successfully deleted' };
  }

  async createReferralLink(
    adminId: string,
    jobPostId: string,
    description?: string,
  ) {
    await this.checkAdminRole(adminId);

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    const refCode = uuidv4();
    const referralLink = this.referralLinksRepository.create({
      ref_code: refCode,
      job_post: jobPost,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await this.referralLinksRepository.save(referralLink);

    const baseUrl = this.configService.get<string>('BASE_URL', 'https://yourdomain.com');
    return {
      id: referralLink.id,
      refCode: referralLink.ref_code,
      fullLink: `${baseUrl}/ref/${referralLink.ref_code}`,
      jobPostId,
      description: referralLink.description,
      clicks: referralLink.clicks,
      registrations: referralLink.registrations,
    };
  }

  async listReferralLinksByJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const links = await this.referralLinksRepository.find({
      where: { job_post: { id: jobPostId } },
      relations: ['job_post', 'registrationsDetails', 'registrationsDetails.user'],
      order: { created_at: 'DESC' },
    });
    const baseUrl = this.configService.get<string>('BASE_URL', 'https://yourdomain.com');
    return links.map(link => ({
      id: link.id,
      jobPostId: link.job_post?.id,
      refCode: link.ref_code,
      fullLink: `${baseUrl}/ref/${link.ref_code}`,
      description: link.description || null,
      clicks: link.clicks,
      registrations: link.registrations,
      registrationsDetails: link.registrationsDetails || [],
    }));
  }

  async updateReferralLinkDescription(adminId: string, linkId: string, description: string) {
    await this.checkAdminRole(adminId);
    const link = await this.referralLinksRepository.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Referral link not found');
    link.description = description;
    await this.referralLinksRepository.save(link);
    return { message: 'Updated', id: link.id, description: link.description };
  }

  async deleteReferralLink(adminId: string, linkId: string) {
    await this.checkAdminRole(adminId);
    const link = await this.referralLinksRepository.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Referral link not found');
    await this.referralLinksRepository.delete(linkId);
    return { message: 'Deleted' };
  }

  async getReferralLinks(adminId: string, filters: { jobId?: string, jobTitle?: string } = {}) {
      await this.checkAdminRole(adminId);
      const query = this.referralLinksRepository.createQueryBuilder('link')
          .leftJoinAndSelect('link.job_post', 'jobPost')
          .leftJoinAndSelect('link.registrationsDetails', 'reg')
          .leftJoinAndSelect('reg.user', 'user')
          .orderBy('link.created_at', 'DESC');

      if (filters.jobId) {
          query.andWhere('jobPost.id = :jobId', { jobId: filters.jobId });
      }
      if (filters.jobTitle) {
          query.andWhere('jobPost.title ILIKE :title', { title: `%${filters.jobTitle}%` });
      }

      const links = await query.getMany();
      const baseUrl = this.configService.get<string>('BASE_URL', 'https://jobforge.net');

      return links.map(link => ({
          id: link.id,
          jobPostId: link.job_post?.id,
          refCode: link.ref_code,
          fullLink: `${baseUrl}/ref/${link.ref_code}`,
          clicks: link.clicks,
          registrations: link.registrations,
          registrationsDetails: link.registrationsDetails || [],
          description: link.description || null,
          job_post: link.job_post ? {
              id: link.job_post.id,
              title: link.job_post.title,
          } : null,
      }));
  }

  async incrementClick(refCode: string) {
    console.log(`Incrementing click for refCode: ${refCode}`);
    const referralLink = await this.referralLinksRepository.findOne({ 
      where: { ref_code: refCode },
      relations: ['job_post'],
    });
    if (!referralLink) {
      console.error(`Referral link not found for refCode: ${refCode}`);
      throw new NotFoundException('Referral link not found');
    }
    if (!referralLink.job_post) {
      console.error(`Job post not found for referral link: ${refCode}`);
      throw new NotFoundException('Job post not found for this referral link');
    }
    referralLink.clicks += 1;
    await this.referralLinksRepository.save(referralLink);
    console.log(`Click incremented for refCode: ${refCode}, jobPostId: ${referralLink.job_post.id}`);
    return referralLink.job_post.id;
  }

  async incrementRegistration(refCode: string, userId: string) {
    const referralLink = await this.referralLinksRepository.findOne({ where: { ref_code: refCode } });
    if (!referralLink) {
      throw new NotFoundException('Referral link not found');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    referralLink.registrations += 1;
    await this.referralLinksRepository.save(referralLink);

    const referralRegistration = this.referralRegistrationsRepository.create({
      referral_link: referralLink,
      user,
      created_at: new Date(),
    });

    await this.referralRegistrationsRepository.save(referralRegistration);
  }

}
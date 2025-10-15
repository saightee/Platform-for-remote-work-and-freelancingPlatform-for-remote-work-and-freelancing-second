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
import { JobPostCategory } from '../job-posts/job-post-category.entity';

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

  private async setJobCategories(jobPostId: string, categoryIds?: string[]) {
    if (!categoryIds) return;

    await this.jobPostsRepository.manager
      .createQueryBuilder()
      .delete()
      .from(JobPostCategory)
      .where('job_post_id = :id', { id: jobPostId })
      .execute();

    const unique = Array.from(new Set(categoryIds.filter(Boolean)));
    if (unique.length) {
      const rows = unique.map((cid) => {
        const jpc = new JobPostCategory();
        jpc.job_post_id = jobPostId;
        jpc.category_id = cid;
        return jpc;
      });
      await this.jobPostsRepository.manager.save(rows);
    }

    const legacy = unique.length ? unique[0] : null;
    await this.jobPostsRepository.update({ id: jobPostId }, { category_id: legacy });
  }

  private async getJobCategoryIds(jobPostId: string): Promise<string[]> {
    const rows = await this.jobPostsRepository.manager.find(JobPostCategory, {
      where: { job_post_id: jobPostId },
    });
    if (!rows.length) {
      const jp = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
      return jp?.category_id ? [jp.category_id] : [];
    }
    return Array.from(new Set(rows.map(r => r.category_id)));
  }

  private async expandCategoryIdsForMatching(categoryIds: string[]): Promise<string[]> {
    const out = new Set<string>();
    for (const cid of categoryIds) {
      const cat = await this.categoriesService.getCategoryById(cid);
      if (!cat) continue;
      if (!cat.parent_id) {
        const all = await this.categoriesService.getDescendantIdsIncludingSelf(cid);
        all.forEach(id => out.add(id));
      } else {
        out.add(cid);
        out.add(cat.parent_id);
      }
    }
    return Array.from(out);
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
        'user.brand',
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
      await this.jobPostsRepository.manager
        .createQueryBuilder()
        .delete()
        .from('job_invitations')
        .where('employer_id = :id OR job_seeker_id = :id', { id: userId })
        .execute();

      await this.jobPostsRepository.manager
        .createQueryBuilder()
        .delete()
        .from('job_invitations')
        .where('job_post_id IN (SELECT id FROM job_posts WHERE employer_id = :id)', { id: userId })
        .execute();

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
    category_id?: string;         // legacy
    category_ids?: string[];      // NEW
    page?: number;
    limit?: number;
    id?: string;
    salary_type?: 'per hour' | 'per month' | 'negotiable';
  }) {
    await this.checkAdminRole(adminId);

    const qb = this.jobPostsRepository.createQueryBuilder('jobPost')
      .leftJoinAndSelect('jobPost.employer', 'employer');

    if (filters.category_id) {
      qb.andWhere('jobPost.category_id = :category_id', { category_id: filters.category_id });
    }

    if (filters.category_ids?.length) {
      qb.innerJoin('job_post_categories', 'jpc', 'jpc.job_post_id = jobPost.id')
        .andWhere('jpc.category_id = ANY(:catIds)', { catIds: filters.category_ids });
    }

    if (filters.status) qb.andWhere('jobPost.status = :status', { status: filters.status });
    if (filters.pendingReview !== undefined) qb.andWhere('jobPost.pending_review = :pendingReview', { pendingReview: filters. pendingReview });
    if (filters.employer_id) qb.andWhere('jobPost.employer_id = :employer_id', { employer_id: filters.employer_id });
    if (filters.employer_username) qb.andWhere('employer.username ILIKE :employer_username', { employer_username: `%${filters.  employer_username}%` });
    if (filters.title) qb.andWhere('jobPost.title ILIKE :title', { title: `%${filters.title}%` });
    if (filters.id) qb.andWhere('jobPost.id = :id', { id: filters.id });
    if (filters.salary_type) qb.andWhere('jobPost.salary_type = :salary_type', { salary_type: filters.salary_type });

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    qb.orderBy('jobPost.created_at', 'DESC').skip(skip).take(limit).distinct(true);

    const [jobPosts, total] = await qb.getManyAndCount();

    const ids = jobPosts.map(p => p.id);
    const jpcs = ids.length
      ? await this.jobPostsRepository.manager.find(JobPostCategory, { where: { job_post_id: In(ids) }, relations: ['category'] })
      : [];
    const byPost = new Map<string, { id: string; name?: string }[]>();
    jpcs.forEach(row => {
      const arr = byPost.get(row.job_post_id) || [];
      arr.push({ id: row.category_id, name: row.category?.name });
      byPost.set(row.job_post_id, arr);
    });

    const enhanced = await Promise.all(jobPosts.map(async (post) => {
      const stats = await this.emailNotificationsRepository.createQueryBuilder('n')
        .select('COUNT(*) as sent, SUM(CASE WHEN n.opened THEN 1 ELSE 0 END) as opened, SUM(CASE WHEN n.clicked THEN 1 ELSE 0 END) as   clicked')
        .where('n.job_post_id = :id', { id: post.id })
        .getRawOne();

      const cats = byPost.get(post.id) || [];
      return {
        ...post,
        category_ids: cats.map(c => c.id),
        categories: cats,
        emailStats: {
          sent: parseInt(stats.sent) || 0,
          opened: parseInt(stats.opened) || 0,
          clicked: parseInt(stats.clicked) || 0,
        },
      };
    }));

    return { total, data: enhanced };
  }

  async updateJobPost(adminId: string, jobPostId: string, updates: { 
    title?: string; 
    description?: string; 
    location?: string; 
    salary?: number; 
    status?: 'Active' | 'Draft' | 'Closed'; 
    salary_type?: 'per hour' | 'per month' | 'negotiable';  
    excluded_locations?: string[];  
    category_id?: string;        // legacy (оставляем)
    category_ids?: string[];     // NEW
  }) {
    await this.checkAdminRole(adminId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    const incomingIds = updates.category_ids?.length
      ? updates.category_ids
      : (updates.category_id ? [updates.category_id] : undefined);
    if (incomingIds) {
      const found = await this.categoriesRepository.find({ where: { id: In(incomingIds) } });
      if (found.length !== incomingIds.length) {
        throw new BadRequestException('One or more categories not found');
      }
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

    await this.jobPostsRepository.save(jobPost);

    if (incomingIds) {
      await this.setJobCategories(jobPost.id, incomingIds);
    }

    const rows = await this.jobPostsRepository.manager.find(JobPostCategory, {
      where: { job_post_id: jobPost.id },
      relations: ['category'],
    });
    const cats = rows.map(r => ({ id: r.category_id, name: r.category?.name }));

    return {
      ...jobPost,
      category_ids: cats.map(c => c.id),
      categories: cats,
    };
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
    if (!jobPost) throw new NotFoundException('Job post not found');

    jobPost.pending_review = false;
    await this.jobPostsRepository.save(jobPost);

    const { globalApplicationLimit } = await this.settingsService.getGlobalApplicationLimit();
    const limit = globalApplicationLimit ?? 0;

    if (limit > 0) {
      const count = await this.applicationLimitsRepository.count({ where: { job_post_id: jobPostId } });
      if (!count) {
        await this.applicationLimitsService.initializeLimits(jobPostId, limit);
      }
    }

    return jobPost;
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

  async getReviews(
    adminId: string,
    opts: { page?: number; limit?: number; status?: 'Pending' | 'Approved' | 'Rejected' } = {},
  ) {
    await this.checkAdminRole(adminId);

    const page = opts.page || 1;
    const limit = opts.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.reviewsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .leftJoinAndSelect('r.reviewed', 'reviewed')
      .leftJoinAndSelect('r.job_application', 'app')
      .leftJoinAndSelect('app.job_post', 'job_post')
      .leftJoinAndSelect('app.job_seeker', 'job_seeker')
      .orderBy('r.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (opts.status) {
      qb.andWhere('r.status = :status', { status: opts.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { total, data };
  }

  async approveReview(adminId: string, reviewId: string) {
    await this.checkAdminRole(adminId);
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status === 'Approved') return review;

    review.status = 'Approved';
    await this.reviewsRepository.save(review);

    const reviews = await this.reviewsRepository.find({ where: { reviewed_id: review.reviewed_id, status: 'Approved' } });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    const reviewedUser = await this.usersRepository.findOne({ where: { id: review.reviewed_id } });
    if (reviewedUser?.role === 'jobseeker') {
      const js = await this.jobSeekerRepository.findOne({ where: { user_id: review.reviewed_id } });
      if (js) { js.average_rating = avg; await this.jobSeekerRepository.save(js); }
    } else if (reviewedUser?.role === 'employer') {
      const em = await this.employerRepository.findOne({ where: { user_id: review.reviewed_id } });
      if (em) { em.average_rating = avg; await this.employerRepository.save(em); }
    }
    return review;
  }

  async rejectReview(adminId: string, reviewId: string) {
    await this.checkAdminRole(adminId);
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status === 'Rejected') return review;

    review.status = 'Rejected';
    await this.reviewsRepository.save(review);

    const reviews = await this.reviewsRepository.find({ where: { reviewed_id: review.reviewed_id, status: 'Approved' } });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    const reviewedUser = await this.usersRepository.findOne({ where: { id: review.reviewed_id } });
    if (reviewedUser?.role === 'jobseeker') {
      const js = await this.jobSeekerRepository.findOne({ where: { user_id: review.reviewed_id } });
      if (js) { js.average_rating = avg; await this.jobSeekerRepository.save(js); }
    } else if (reviewedUser?.role === 'employer') {
      const em = await this.employerRepository.findOne({ where: { user_id: review.reviewed_id } });
      if (em) { em.average_rating = avg; await this.employerRepository.save(em); }
    }
    return review;
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

  async exportUsersToCsv(
    adminId: string,
    filters?: {
      role?: 'employer'|'jobseeker'|'admin'|'moderator';
      status?: 'active'|'blocked';
      q?: string;
      email?: string;
      username?: string;
      country?: string;            // 'unknown' => IS NULL
      provider?: string;           // 'none' => IS NULL
      referralSource?: string;
      companyName?: string;
      jobSearchStatus?: 'actively_looking'|'open_to_offers'|'hired';
      isEmailVerified?: boolean;
      identityVerified?: boolean;
      hasAvatar?: boolean;
      hasResume?: boolean;         // for jobseekers
      riskMin?: number;
      riskMax?: number;
      createdFrom?: Date;
      createdTo?: Date;
      lastLoginFrom?: Date;
      lastLoginTo?: Date;
      sortBy?: 'created_at'|'last_login_at';
      order?: 'ASC'|'DESC';
    }
  ): Promise<{ csv: string; suggestedFilename: string }> {
    await this.checkAdminRole(adminId);

    const qb = this.usersRepository
      .createQueryBuilder('u')
      .leftJoin(JobSeeker, 'js', 'js.user_id = u.id')
      .leftJoin(Employer, 'em', 'em.user_id = u.id');

    // === Фильтры по User ===
    if (filters?.role)   qb.andWhere('u.role = :role', { role: filters.role });
    if (filters?.status) qb.andWhere('u.status = :status', { status: filters.status });

    if (filters?.isEmailVerified !== undefined) {
      qb.andWhere('u.is_email_verified = :isv', { isv: filters.isEmailVerified });
    }
    if (filters?.identityVerified !== undefined) {
      qb.andWhere('u.identity_verified = :iv', { iv: filters.identityVerified });
    }

    if (filters?.provider) {
      if (filters.provider === 'none') qb.andWhere('u.provider IS NULL');
      else qb.andWhere('u.provider ILIKE :prov', { prov: `%${filters.provider}%` });
    }

    if (filters?.country) {
      if (filters.country.toLowerCase() === 'unknown') qb.andWhere('u.country IS NULL');
      else qb.andWhere('u.country ILIKE :country', { country: `%${filters.country}%` });
    }

    if (filters?.q) {
      qb.andWhere('(u.email ILIKE :q OR u.username ILIKE :q)', { q: `%${filters.q}%` });
    }
    if (filters?.email) {
      qb.andWhere('u.email ILIKE :email', { email: `%${filters.email}%` });
    }
    if (filters?.username) {
      qb.andWhere('u.username ILIKE :username', { username: `%${filters.username}%` });
    }
    if (filters?.referralSource) {
      qb.andWhere('u.referral_source ILIKE :refsrc', { refsrc: `%${filters.referralSource}%` });
    }

    if (typeof filters?.riskMin === 'number') {
      qb.andWhere('u.risk_score >= :rmin', { rmin: filters.riskMin });
    }
    if (typeof filters?.riskMax === 'number') {
      qb.andWhere('u.risk_score <= :rmax', { rmax: filters.riskMax });
    }

    if (filters?.createdFrom) {
      qb.andWhere('u.created_at >= :cfrom', { cfrom: filters.createdFrom });
    }
    if (filters?.createdTo) {
      // включительно по дате — установим 23:59:59.999
      const to = new Date(filters.createdTo);
      to.setHours(23,59,59,999);
      qb.andWhere('u.created_at <= :cto', { cto: to });
    }

    if (filters?.lastLoginFrom) {
      qb.andWhere('u.last_login_at IS NOT NULL AND u.last_login_at >= :llfrom', { llfrom: filters.lastLoginFrom });
    }
    if (filters?.lastLoginTo) {
      const to = new Date(filters.lastLoginTo);
      to.setHours(23,59,59,999);
      qb.andWhere('u.last_login_at IS NOT NULL AND u.last_login_at <= :llto', { llto: to });
    }

    if (filters?.hasAvatar !== undefined) {
      if (filters.hasAvatar) qb.andWhere('(u.avatar IS NOT NULL AND u.avatar <> \'\')');
      else qb.andWhere('(u.avatar IS NULL OR u.avatar = \'\')');
    }

    // === Фильтры по JobSeeker / Employer ===
    if (filters?.hasResume !== undefined) {
      if (filters.hasResume) qb.andWhere('(u.role = \'jobseeker\' AND js.resume IS NOT NULL AND js.resume <> \'\')');
      else qb.andWhere('(u.role = \'jobseeker\' AND (js.resume IS NULL OR js.resume = \'\'))');
    }
    if (filters?.jobSearchStatus) {
      qb.andWhere('(u.role = \'jobseeker\' AND js.job_search_status = :jss)', { jss: filters.jobSearchStatus });
    }
    if (filters?.companyName) {
      qb.andWhere('(u.role = \'employer\' AND em.company_name ILIKE :cname)', { cname: `%${filters.companyName}%` });
    }

    // Сортировка
    const sortField = filters?.sortBy === 'last_login_at' ? 'u.last_login_at' : 'u.created_at';
    const sortOrder = filters?.order === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortField, sortOrder);

    // Подтягиваем нужные поля для CSV
    qb.select([
      'u.id AS id',
      'u.email AS email',
      'u.username AS username',
      'u.role AS role',
      'u.status AS status',
      'u.country AS country',
      'u.provider AS provider',
      'u.is_email_verified AS is_email_verified',
      'u.identity_verified AS identity_verified',
      'u.referral_source AS referral_source',
      'u.risk_score AS risk_score',
      'u.created_at AS created_at',
      'u.updated_at AS updated_at',
      'u.last_login_at AS last_login_at',
      'u.last_seen_at AS last_seen_at',
      'u.avatar AS avatar',

      // jobseeker
      'js.job_search_status AS js_job_search_status',
      'js.expected_salary AS js_expected_salary',
      'js.currency AS js_currency',
      'js.average_rating AS js_average_rating',
      'js.resume AS js_resume',

      // employer
      'em.company_name AS em_company_name',
      'em.average_rating AS em_average_rating',
    ]);

    const rows = await qb.getRawMany();

    // Формируем CSV
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'User ID' },
        { id: 'email', title: 'Email' },
        { id: 'username', title: 'Username' },
        { id: 'role', title: 'Role' },
        { id: 'status', title: 'Status' },
        { id: 'country', title: 'Country' },
        { id: 'provider', title: 'Provider' },
        { id: 'is_email_verified', title: 'Email Verified' },
        { id: 'identity_verified', title: 'Identity Verified' },
        { id: 'referral_source', title: 'Referral Source' },
        { id: 'risk_score', title: 'Risk Score' },
        { id: 'created_at', title: 'Created At' },
        { id: 'updated_at', title: 'Updated At' },
        { id: 'last_login_at', title: 'Last Login At' },
        { id: 'last_seen_at', title: 'Last Seen At' },
        { id: 'has_avatar', title: 'Has Avatar' },

        // jobseeker доп.колонки
        { id: 'js_job_search_status', title: 'JS Job Search Status' },
        { id: 'js_expected_salary', title: 'JS Expected Salary' },
        { id: 'js_currency', title: 'JS Currency' },
        { id: 'js_average_rating', title: 'JS Avg Rating' },
        { id: 'has_resume', title: 'JS Has Resume' },

        // employer доп.колонки
        { id: 'em_company_name', title: 'EM Company Name' },
        { id: 'em_average_rating', title: 'EM Avg Rating' },
      ],
    });

    const records = rows.map(r => ({
      id: r.id,
      email: r.email,
      username: r.username,
      role: r.role,
      status: r.status,
      country: r.country || '',
      provider: r.provider || '',
      is_email_verified: r.is_email_verified ? 'true' : 'false',
      identity_verified: r.identity_verified ? 'true' : 'false',
      referral_source: r.referral_source || '',
      risk_score: r.risk_score ?? 0,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : '',
      last_login_at: r.last_login_at ? new Date(r.last_login_at).toISOString() : '',
      last_seen_at: r.last_seen_at ? new Date(r.last_seen_at).toISOString() : '',
      has_avatar: r.avatar && String(r.avatar).trim() !== '' ? 'true' : 'false',

      js_job_search_status: r.js_job_search_status || '',
      js_expected_salary: r.js_expected_salary ?? '',
      js_currency: r.js_currency || '',
      js_average_rating: r.js_average_rating ?? '',
      has_resume: r.js_resume && String(r.js_resume).trim() !== '' ? 'true' : 'false',

      em_company_name: r.em_company_name || '',
      em_average_rating: r.em_average_rating ?? '',
    }));

    const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    const date = new Date();
    const y = date.getFullYear().toString();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const parts: string[] = ['users', `${y}${m}${d}`];
    if (filters?.role) parts.push(`role-${filters.role}`);
    if (filters?.status) parts.push(`status-${filters.status}`);
    const suggestedFilename = `${parts.join('_')}.csv`;

    return { csv, suggestedFilename };
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

  async getRecentRegistrationsByDay(
    adminId: string,
    opts: { date?: string; tzOffset?: number },
  ) {
    await this.checkAdminRole(adminId);
  
    const tzOffset = Number.isFinite(opts.tzOffset) ? opts.tzOffset! : 0;
    const todayLocal = (() => {
      if (opts.date) return opts.date;
      const now = new Date();
      const local = new Date(now.getTime() + tzOffset * 60_000);
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
  
    const [Y, M, D] = todayLocal.split('-').map(Number);
    const startUtc = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0) - tzOffset * 60_000);
    const endUtc   = new Date(Date.UTC(Y, M - 1, D + 1, 0, 0, 0) - tzOffset * 60_000);
  
    const baseWhere = (qb, role: 'jobseeker' | 'employer') =>
      qb.where('u.role = :role', { role })
        .andWhere('u.created_at >= :from AND u.created_at < :to', { from: startUtc, to: endUtc });
  
    const jsQb = this.usersRepository.createQueryBuilder('u');
    baseWhere(jsQb, 'jobseeker');
    const emQb = this.usersRepository.createQueryBuilder('u');
    baseWhere(emQb, 'employer');
  
    const [jsTotal, emTotal] = await Promise.all([jsQb.getCount(), emQb.getCount()]);
  
    // Больше НЕ ограничиваем .take(limit) — берём все за день
    jsQb.orderBy('u.created_at', 'DESC');
    emQb.orderBy('u.created_at', 'DESC');
  
    const [jsUsers, empUsers] = await Promise.all([jsQb.getMany(), emQb.getMany()]);
  
    const enrich = async (u: User) => {
      const latestReg = await this.referralRegistrationsRepository.findOne({
        where: { user: { id: u.id } },
        relations: ['referral_link', 'referral_link.job_post'],
        order: { created_at: 'DESC' },
      });
    
      const link = latestReg?.referral_link;
      const job  = link?.job_post;
    
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        created_at: u.created_at,
      
        referral_from_signup: u.referral_source || null,
        referral_link_description: link?.description || null,
        referral_job: job ? { id: job.id, title: job.title } : null,
        referral_job_description: job?.description || null,
      };
    };
  
    const [jobseekers, employers] = await Promise.all([
      Promise.all(jsUsers.map(enrich)),
      Promise.all(empUsers.map(enrich)),
    ]);
  
    return {
      date: todayLocal,
      tzOffset,
      jobseekers_total: jsTotal,
      employers_total: emTotal,
      jobseekers,
      employers,
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
    if (!jobPost) throw new NotFoundException('Job post not found');
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Notifications can only be sent for active job posts');
    }

    // подтягиваем ВСЕ категории вакансии (много), и расширяем на потомков
    const attachedCatIds = await this.getJobCategoryIds(jobPostId);
    if (!attachedCatIds.length) {
      throw new BadRequestException('Job post has no categories assigned');
    }
    const matchCatIds = await this.expandCategoryIdsForMatching(attachedCatIds);

    const subQuery = this.jobSeekerRepository
      .createQueryBuilder('js')
      .leftJoin('js.skills', 'skills')
      .where('skills.id IN (:...catIds)', { catIds: matchCatIds })
      .select('js.user_id');

    const qb = this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoinAndSelect('jobSeeker.user', 'user')
      .where(`jobSeeker.user_id IN (${subQuery.getQuery()})`)
      .andWhere('user.role = :role', { role: 'jobseeker' })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.is_email_verified = :isEmailVerified', { isEmailVerified: true })
      // не слать тем, кто уже подался на ЭТУ вакансию
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM job_applications a2
        WHERE a2.job_post_id = :thisJob AND a2.job_seeker_id = "jobSeeker"."user_id"
      )`, { thisJob: jobPostId })
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM email_notifications en
        WHERE en.job_post_id = :thisJob AND en.recipient_email = "user"."email"
      )`, { thisJob: jobPostId })
      .setParameters(subQuery.getParameters());

    const total = await qb.getCount();

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200;
    qb.take(safeLimit);
    if (orderBy === 'beginning') qb.orderBy('user.created_at', 'ASC');
    else if (orderBy === 'end') qb.orderBy('user.created_at', 'DESC');
    else qb.addSelect('RANDOM()', 'r').orderBy('r', 'ASC');

    const jobSeekers = await qb.getMany();

    let sentCount = 0;
    const sentEmails: string[] = [];

    const siteBase = this.configService.get<string>('BASE_URL')!.replace(/\/api\/?$/, '');
    const slugOrId = (jobPost as any).slug_id || jobPost.id;
    const jobUrl = `${siteBase}/vacancy/${slugOrId}`;

    for (const js of jobSeekers) {
      try {
        const response = await this.emailService.sendJobNotification(
          js.user.email,
          js.user.username,
          jobPost.title,
          jobPost.description,
          jobUrl,
          {
            location: jobPost.location || (jobPost as any).work_mode || 'Remote',
            salary: jobPost.salary ?? null,
            salary_type: jobPost.salary_type as any,
            job_type: jobPost.job_type as any,
          }
        );

        const notification = this.emailNotificationsRepository.create({
          job_post_id: jobPostId,
          recipient_email: js.user.email,
          recipient_username: js.user.username,
          message_id: response?.messageId,
          sent_at: new Date(),
        });
        await this.emailNotificationsRepository.save(notification);

        sentEmails.push(js.user.email);
        sentCount++;
      } catch (error: any) {
        console.error(`Failed to send email to ${js.user.email}:`, error.message);
      }
    }

    return {
      total,
      sent: sentCount,
      emails: sentEmails,
      jobPostId,
    };
  }

  private async getCategoryMatchIds(categoryId: string, includeSiblings = false): Promise<string[]> {
    const cat = await this.categoriesService.getCategoryById(categoryId); 
    if (!cat.parent_id) {
      return this.categoriesService.getDescendantIdsIncludingSelf(categoryId);
    }
    if (!includeSiblings) return [categoryId, cat.parent_id];
    return this.categoriesService.getDescendantIdsIncludingSelf(cat.parent_id);
  }


  async notifyReferralApplicants(
    adminId: string,
    jobPostId: string,
    limit: number,
    orderBy: 'beginning' | 'end' | 'random',
  ) {
    await this.checkAdminRole(adminId);

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) throw new NotFoundException('Job post not found');
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Notifications can only be sent for active job posts');
    }

    const attachedCatIds = await this.getJobCategoryIds(jobPostId);
    if (!attachedCatIds.length) {
      throw new BadRequestException('Job post has no categories assigned');
    }
    const matchCatIds = await this.expandCategoryIdsForMatching(attachedCatIds);

    const subRegs = this.referralRegistrationsRepository
      .createQueryBuilder('rr')
      .innerJoin('rr.referral_link', 'rl')
      .innerJoin('rl.job_post', 'jp')
      .innerJoin(JobPostCategory, 'jpc2', 'jpc2.job_post_id = jp.id')
      .innerJoin('rr.user', 'ru')
      .where('jpc2.category_id IN (:...catIds)', { catIds: matchCatIds })
      .select('DISTINCT ru.id');

    const qb = this.jobSeekerRepository
      .createQueryBuilder('js')
      .leftJoinAndSelect('js.user', 'u')
      .where(`js.user_id IN (${subRegs.getQuery()})`)
      .andWhere('u.role = :role', { role: 'jobseeker' })
      .andWhere('u.status = :status', { status: 'active' })
      .andWhere('u.is_email_verified = :verified', { verified: true })
      // не слать тем, кто уже подался на ЭТУ вакансию
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM job_applications a2
        WHERE a2.job_post_id = :thisJob AND a2.job_seeker_id = "js"."user_id"
      )`, { thisJob: jobPostId })
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM email_notifications en
        WHERE en.job_post_id = :thisJob AND en.recipient_email = "u"."email"
      )`, { thisJob: jobPostId })
      .setParameters(subRegs.getParameters());

    const total = await qb.getCount();

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200;
    qb.take(safeLimit);
    if (orderBy === 'beginning') qb.orderBy('u.created_at', 'ASC');
    else if (orderBy === 'end') qb.orderBy('u.created_at', 'DESC');
    else qb.addSelect('RANDOM()', 'r').orderBy('r', 'ASC');

    const picked = await qb.getMany();

    const siteBase = this.configService.get<string>('BASE_URL')!.replace(/\/api\/?$/, '');
    const slugOrId = (jobPost as any).slug_id || jobPost.id;
    const jobUrl = `${siteBase}/vacancy/${slugOrId}`;

    let sent = 0;
    for (const js of picked) {
      try {
        const resp = await this.emailService.sendJobNotification(
          js.user.email,
          js.user.username,
          jobPost.title,
          jobPost.description,
          jobUrl,
          {
            location: jobPost.location || (jobPost as any).work_mode || 'Remote',
            salary: jobPost.salary ?? null,
            salary_type: jobPost.salary_type as any,
            job_type: jobPost.job_type as any,
          }
        );

        await this.emailNotificationsRepository.save(
          this.emailNotificationsRepository.create({
            job_post_id: jobPostId,
            recipient_email: js.user.email,
            recipient_username: js.user.username,
            message_id: resp?.messageId,
            sent_at: new Date(),
          }),
        );
        sent++;
      } catch (e: any) {
        console.error(`NotifyReferralApplicants: failed to send to ${js.user.email}:`, e.message);
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

  async createReferralLink(adminId: string, jobPostId: string, description?: string) {
    await this.checkAdminRole(adminId);

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }

    const refCode = crypto.randomUUID();

    const referralLink = this.referralLinksRepository.create({
      ref_code: refCode,
      job_post: jobPost,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await this.referralLinksRepository.save(referralLink);

    const baseUrl = this.configService.get<string>('BASE_URL')!;

    const baseSlug = (jobPost.slug && jobPost.slug.trim().length > 0)
      ? jobPost.slug
      : this.slugify(jobPost.title || '');
    const shortId = (jobPost.id || '').replace(/-/g, '').slice(0, 8);
    const slugId = jobPost.slug_id || (baseSlug && shortId ? `${baseSlug}--${shortId}` : jobPost.id);

    const prettyLink = `${baseUrl}/job/${slugId}?ref=${referralLink.ref_code}`;

    const legacyLink = `${baseUrl}/ref/${referralLink.ref_code}`;

    return {
      id: referralLink.id,
      refCode: referralLink.ref_code,
      fullLink: prettyLink,
      legacyLink,
      jobPostId,
      description: referralLink.description,
      clicks: referralLink.clicks,
      registrations: referralLink.registrations,
    };
  }

  private slugify(input: string): string {
    return (input || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  async listReferralLinksByJobPost(adminId: string, jobPostId: string) {
    await this.checkAdminRole(adminId);
    const links = await this.referralLinksRepository.find({
      where: { job_post: { id: jobPostId } },
      relations: ['job_post', 'registrationsDetails', 'registrationsDetails.user'],
      order: { created_at: 'DESC' },
    });
    const baseUrl = this.configService.get<string>('BASE_URL')!;

    return links.map(link => {
      const jp = link.job_post;
      const baseSlug = (jp.slug && jp.slug.trim().length > 0) ? jp.slug : this.slugify(jp.title || '');
      const shortId = (jp.id || '').replace(/-/g, '').slice(0, 8);
      const slugId = jp.slug_id || (baseSlug && shortId ? `${baseSlug}--${shortId}` : jp.id);
      return {
        id: link.id,
        jobPostId: jp?.id,
        refCode: link.ref_code,
        fullLink: `${baseUrl}/job/${slugId}?ref=${link.ref_code}`,
        legacyLink: `${baseUrl}/ref/${link.ref_code}`,
        description: link.description || null,
        clicks: link.clicks,
        registrations: link.registrations,
        registrationsDetails: link.registrationsDetails || [],
      };
    });
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
    const baseUrl = this.configService.get<string>('BASE_URL')!;

    return links.map(link => {
      const jp = link.job_post;
      const baseSlug = (jp.slug && jp.slug.trim().length > 0) ? jp.slug : this.slugify(jp.title || '');
      const shortId = (jp.id || '').replace(/-/g, '').slice(0, 8);
      const slugId = jp.slug_id || (baseSlug && shortId ? `${baseSlug}--${shortId}` : jp.id);

      return {
        id: link.id,
        jobPostId: jp?.id,
        refCode: link.ref_code,
        fullLink: `${baseUrl}/job/${slugId}?ref=${link.ref_code}`,
        legacyLink: `${baseUrl}/ref/${link.ref_code}`,
        clicks: link.clicks,
        registrations: link.registrations,
        registrationsDetails: link.registrationsDetails || [],
        description: link.description || null,
        job_post: jp ? { id: jp.id, title: jp.title } : null,
      };
    });
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

  async getBrandBreakdown(
  adminId: string,
  startDate?: Date,
  endDate?: Date,
  ): Promise<{
    range: { startDate?: string; endDate?: string };
    byBrand: Array<{ brand: string; total: number; employers: number; jobseekers: number }>;
    overall: { total: number; employers: number; jobseekers: number };
  }> {
    await this.checkAdminRole(adminId);
  
    let adjustedEndDate: Date | undefined = endDate
      ? new Date(endDate)
      : undefined;
    if (adjustedEndDate) {
      adjustedEndDate.setHours(23, 59, 59, 999);
    }
  
    const qb = this.usersRepository
      .createQueryBuilder('u')
      .select(`COALESCE(u.brand, 'unknown')`, 'brand')
      .addSelect(`SUM(CASE WHEN u.role = 'employer' THEN 1 ELSE 0 END)`, 'employers')
      .addSelect(`SUM(CASE WHEN u.role = 'jobseeker' THEN 1 ELSE 0 END)`, 'jobseekers')
      .groupBy(`COALESCE(u.brand, 'unknown')`);
  
    if (startDate) {
      qb.andWhere('u.created_at >= :startDate', { startDate });
    }
    if (adjustedEndDate) {
      qb.andWhere('u.created_at <= :endDate', { endDate: adjustedEndDate });
    }
  
    const raw = await qb.getRawMany<{
      brand: string;
      employers: string;
      jobseekers: string;
    }>();
  
    const byBrand = raw.map(r => {
      const employers = parseInt(r.employers, 10) || 0;
      const jobseekers = parseInt(r.jobseekers, 10) || 0;
      const total = employers + jobseekers;
      return {
        brand: r.brand || 'unknown',
        total,
        employers,
        jobseekers,
      };
    })
    .sort((a, b) => b.total - a.total);
  
    const overall = byBrand.reduce(
      (acc, row) => {
        acc.employers += row.employers;
        acc.jobseekers += row.jobseekers;
        acc.total += row.total;
        return acc;
      },
      { total: 0, employers: 0, jobseekers: 0 },
    );
  
    return {
      range: {
        startDate: startDate ? startDate.toISOString().slice(0, 10) : undefined,
        endDate: endDate ? endDate.toISOString().slice(0, 10) : undefined,
      },
      byBrand,
      overall,
    };
  }
  
}
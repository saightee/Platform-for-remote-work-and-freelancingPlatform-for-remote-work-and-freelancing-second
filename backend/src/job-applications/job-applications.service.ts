import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { ApplicationLimitsService } from '../application-limits/application-limits.service';
import { Server } from 'socket.io';
import { Inject } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';
import { EmailService } from '../email/email.service';
import { ReferralLink } from '../referrals/entities/referral-link.entity';

@Injectable()
export class JobApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ReferralLink) private referralLinksRepository: Repository<ReferralLink>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    private applicationLimitsService: ApplicationLimitsService,
    @Inject('SOCKET_IO_SERVER') private server: Server,
    private emailService: EmailService, 
  ) {}

  async applyToJob(
    userId: string,
    jobPostId: string,
    coverLetter: string,
    fullName?: string,
    referredBy?: string,
    refCode?: string,
  ) {
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

    if (jobPost.excluded_locations?.includes(user.country)) {
      throw new BadRequestException('Applicants from your location are not allowed');
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

    if (!coverLetter || !coverLetter.trim()) {
      throw new BadRequestException('Cover letter is required');
    }

    let referralLink: ReferralLink | null = null;
    if (refCode) {
      referralLink = await this.referralLinksRepository.findOne({
        where: { ref_code: refCode },
        relations: ['job_post'],
      });
      // игнорируем кривые/чужие refCode: пишем только если реально к этой вакансии
      if (!referralLink || referralLink.job_post?.id !== jobPostId) {
        referralLink = null;
      }
    }
    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
      cover_letter: coverLetter.trim(),
      full_name: fullName?.trim() || null,
      referred_by: referredBy?.trim() || null,
      referral_link_id: referralLink?.id || null,
    });
    const saved = await this.jobApplicationsRepository.save(application);

    await this.applicationLimitsService.incrementApplicationCount(jobPostId);
    return saved;
  }

  async getMyApplications(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      return [];
    }

    return this.jobApplicationsRepository.find({
      where: { job_seeker_id: userId },
      relations: ['job_post', 'job_post.employer', 'job_seeker'], 
    });
  }

  async getApplicationsForJobPost(userId: string, jobPostId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (['admin', 'moderator'].includes(user.role)) {
      const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
      if (!jobPost) {
        throw new NotFoundException('Job post not found');
      }
    } else {
      if (user.role !== 'employer') {
        throw new UnauthorizedException('Only employers can view applications for their job posts');
      }
      const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
      if (!jobPost) {
        throw new NotFoundException('Job post not found or you do not have permission to view its applications');
      }
    }

    const applications = await this.jobApplicationsRepository.find({
      where: { job_post_id: jobPostId },
      relations: ['job_seeker'],
    });

    const result = await Promise.all(
      applications.map(async (app) => {
        const jobSeeker = await this.jobSeekerRepository.findOne({
          where: { user_id: app.job_seeker_id },
        });
        const userData = app.job_seeker;
        if (!userData) return null;

        return {
          applicationId: app.id,
          userId: userData.id,
          username: userData.username,
          email: userData.email,
          jobDescription: jobSeeker?.experience || '',
          details: {
            fullName: app.full_name || null,
            referredBy: app.referred_by || null,
            coverLetter: app.cover_letter || '',
          },
          appliedAt: app.created_at.toISOString(),
          status: app.status,
          job_post_id: app.job_post_id,
        };
      }),
    );
    return result.filter(Boolean);
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: 'Pending' | 'Accepted' | 'Rejected',
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can update application status');
    }

    const application = await this.jobApplicationsRepository.findOne({
      where: { id: applicationId },
      relations: ['job_post', 'job_seeker'],
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.job_post.employer_id !== userId) {
      throw new UnauthorizedException('You do not have permission to update this application');
    }

    if (status === 'Accepted') {
      await this.jobApplicationsRepository.update({ id: application.id }, { status: 'Accepted' });

      const updated = await this.jobApplicationsRepository.findOne({
        where: { id: application.id },
        relations: ['job_post', 'job_seeker'],
      });

      try {
        if (updated?.job_seeker?.email && updated?.job_seeker?.username && updated?.job_post?.title) {
          await this.emailService.sendJobSeekerAcceptedNotification(
            updated.job_seeker.email,
            updated.job_seeker.username,
            updated.job_post.title,
          );
        }
      } catch (e) {
        console.error('Failed to send acceptance email:', (e as Error).message);
      }

      return updated;
    }

    application.status = status;
    return this.jobApplicationsRepository.save(application);
  }

  async getApplicationById(userId: string, applicationId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!['employer', 'admin', 'moderator'].includes(user.role)) {
      throw new UnauthorizedException('Only employers, admins, or moderators can view application details');
    }
  
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: applicationId },
      relations: ['job_post', 'job_seeker'],
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
  
    if (user.role === 'employer' && application.job_post.employer_id !== userId) {
      throw new UnauthorizedException('You do not have permission to view this application');
    }
  
    const jobSeeker = await this.jobSeekerRepository.findOne({
      where: { user_id: application.job_seeker_id },
    });
  
    return {
      applicationId: application.id,
      userId: application.job_seeker_id,
      username: application.job_seeker.username,
      email: application.job_seeker.email,
      jobDescription: jobSeeker?.experience || '',
      coverLetter: application.cover_letter,
      appliedAt: application.created_at.toISOString(),
      status: application.status,
      job_post_id: application.job_post_id,
      job_post: {
        id: application.job_post.id,
        title: application.job_post.title,
        status: application.job_post.status,
      },
    };
  }
}
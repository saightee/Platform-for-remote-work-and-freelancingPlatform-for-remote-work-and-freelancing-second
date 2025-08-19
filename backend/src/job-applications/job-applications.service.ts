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

@Injectable()
export class JobApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    private applicationLimitsService: ApplicationLimitsService,
    @Inject('SOCKET_IO_SERVER') private server: Server,
    private emailService: EmailService, 
  ) {}

  async applyToJob(userId: string, jobPostId: string, coverLetter: string) {
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

    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
      cover_letter: coverLetter,
    });
    const savedApplication = await this.jobApplicationsRepository.save(application);

    await this.applicationLimitsService.incrementApplicationCount(jobPostId);

    return savedApplication;
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
  
    console.log('Applications:', JSON.stringify(applications, null, 2));
  
    const result = await Promise.all(
      applications.map(async (app) => {
        const jobSeeker = await this.jobSeekerRepository.findOne({
          where: { user_id: app.job_seeker_id },
        });
        const userData = app.job_seeker;
        if (!userData) {
          console.warn(`No user data for job_seeker_id ${app.job_seeker_id}`);
          return null;
        }
        return {
          applicationId: app.id,
          userId: userData.id,
          username: userData.username,
          email: userData.email,
          jobDescription: jobSeeker?.experience || '',
          coverLetter: app.cover_letter,
          appliedAt: app.created_at.toISOString(),
          status: app.status,
          job_post_id: app.job_post_id,
        };
      }),
    );
    return result.filter(item => item !== null);
  }

  async updateApplicationStatus(userId: string, applicationId: string, status: 'Pending' | 'Accepted' | 'Rejected') {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`User ${userId} not found`);
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
  await this.jobApplicationsRepository.manager.transaction(async (trx) => {
    const appRepo  = trx.getRepository(JobApplication);
    const postRepo = trx.getRepository(JobPost);

    const alreadyAccepted = await appRepo.findOne({
      where: { job_post_id: application.job_post_id, status: 'Accepted' },
    });
    if (alreadyAccepted && alreadyAccepted.id !== application.id) {
      throw new BadRequestException('Only one application can be accepted per job post');
    }

    await postRepo.update(
      { id: application.job_post_id },
      { status: 'Closed', closed_at: new Date() }
    );

    await appRepo.update({ id: application.id }, { status: 'Accepted' });

    await trx
      .createQueryBuilder()
      .update(JobApplication)
      .set({ status: 'Rejected' })
      .where('job_post_id = :jobPostId', { jobPostId: application.job_post_id })
      .andWhere('id != :currentId', { currentId: application.id })
      .andWhere('status = :pending', { pending: 'Pending' })
      .execute();
  });
  
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
      } else {
        console.warn('Insufficient data to send acceptance email', {
          hasEmail: !!updated?.job_seeker?.email,
          hasUsername: !!updated?.job_seeker?.username,
          hasTitle: !!updated?.job_post?.title,
        });
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
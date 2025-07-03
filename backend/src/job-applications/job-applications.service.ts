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
  ) {}

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

    const { canApply, message } = await this.applicationLimitsService.canApply(jobPostId);
    if (!canApply) {
      throw new BadRequestException(message || 'Cannot apply to this job post');
    }

    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
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
      throw new UnauthorizedException('Only jobseekers can view their applications');
    }

    return this.jobApplicationsRepository.find({
      where: { job_seeker_id: userId },
      relations: ['job_post', 'job_seeker'],
    });
  }

  async getApplicationsForJobPost(userId: string, jobPostId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can view applications for their job posts');
    }

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to view its applications');
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
      const acceptedCount = await this.jobApplicationsRepository.count({
        where: { job_post_id: application.job_post_id, status: 'Accepted' },
      });
      if (acceptedCount > 0) {
        throw new BadRequestException('Only one application can be accepted per job post');
      }

      await this.jobPostsRepository.update(
        { id: application.job_post_id },
        { status: 'Closed' },
      );
    }

    application.status = status;
    return this.jobApplicationsRepository.save(application);
  }
}
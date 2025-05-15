import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';

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

      const application = this.jobApplicationsRepository.create({
        job_post_id: jobPostId,
        job_seeker_id: userId,
        status: 'Pending',
      });
      return this.jobApplicationsRepository.save(application);
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
      relations: ['job_seeker'], // Подгружаем job_seeker (это User)
    });

    console.log('Applications:', JSON.stringify(applications, null, 2)); // Логируем для отладки

    const result = await Promise.all(
      applications.map(async app => {
        // Подгружаем JobSeeker для job_seeker_id
        const jobSeeker = await this.jobSeekerRepository.findOne({
          where: { user_id: app.job_seeker_id },
        });

        // Получаем данные из job_seeker (User)
        const userData = app.job_seeker;
        if (!userData) {
          return {
            userId: '',
            username: '',
            email: '',
            jobDescription: '',
            appliedAt: app.created_at,
          };
        }

        return {
          userId: userData.id,
          username: userData.username,
          email: userData.email,
          jobDescription: jobSeeker?.experience || '',
          appliedAt: app.created_at,
        };
      }),
    );

    return result;
  }

  async updateApplicationStatus(userId: string, applicationId: string, status: 'Pending' | 'Accepted' | 'Rejected') {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (user.role !== 'employer') {
        throw new UnauthorizedException('Only employers can update application status');
      }
    
      const application = await this.jobApplicationsRepository.findOne({
        where: { id: applicationId },
        relations: ['job_post'],
      });
      if (!application) {
        throw new NotFoundException('Application not found');
      }
      if (application.job_post.employer_id !== userId) {
        throw new UnauthorizedException('You do not have permission to update this application');
      }
    
      application.status = status;
      return this.jobApplicationsRepository.save(application);
    }
  }
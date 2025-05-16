import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { JobApplication } from '../job-applications/job-application.entity';

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
  ) {}

  async getTopEmployers(limit: number = 10) {
    const topEmployers = await this.jobPostsRepository
      .createQueryBuilder('job_post')
      .select('job_post.employer_id', 'employer_id')
      .addSelect('COUNT(job_post.id)', 'job_count')
      .innerJoin('job_post.employer', 'employer')
      .groupBy('job_post.employer_id')
      .addGroupBy('employer.username')
      .orderBy('job_count', 'DESC')
      .limit(limit)
      .getRawMany();

    return topEmployers.map((entry) => ({
      employer_id: entry.employer_id,
      username: entry.employer_username,
      job_count: parseInt(entry.job_count, 10),
    }));
  }

  async getTopJobseekers(limit: number = 10) {
    const topJobseekers = await this.jobApplicationsRepository
      .createQueryBuilder('application')
      .select('application.job_seeker_id', 'job_seeker_id')
      .addSelect('COUNT(application.id)', 'application_count')
      .innerJoin('application.job_seeker', 'job_seeker')
      .groupBy('application.job_seeker_id')
      .addGroupBy('job_seeker.username')
      .orderBy('application_count', 'DESC')
      .limit(limit)
      .getRawMany();

    return topJobseekers.map((entry) => ({
      job_seeker_id: entry.job_seeker_id,
      username: entry.job_seeker_username,
      application_count: parseInt(entry.application_count, 10),
    }));
  }
}
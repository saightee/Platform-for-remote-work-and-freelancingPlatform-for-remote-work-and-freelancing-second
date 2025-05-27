import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
  ) {}

  async getTopEmployers(limit: number = 10) {
    const employers = await this.employerRepository
      .createQueryBuilder('employer')
      .leftJoinAndSelect('employer.user', 'user')
      .where('user.role = :role', { role: 'employer' })
      .orderBy('employer.average_rating', 'DESC')
      .take(limit)
      .getMany();

    return employers.map(employer => ({
      userId: employer.user_id,
      username: employer.user.username,
      email: employer.user.email,
      averageRating: employer.average_rating,
    }));
  }

  async getTopJobseekers(limit: number = 10) {
    const jobseekers = await this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoinAndSelect('jobSeeker.user', 'user')
      .where('user.role = :role', { role: 'jobseeker' })
      .orderBy('jobSeeker.average_rating', 'DESC')
      .take(limit)
      .getMany();

    return jobseekers.map(jobSeeker => ({
      userId: jobSeeker.user_id,
      username: jobSeeker.user.username,
      email: jobSeeker.user.email,
      averageRating: jobSeeker.average_rating,
    }));
  }

  async getTopJobseekersByViews(adminId: string, limit: number = 10) {
    const jobseekers = await this.jobSeekerRepository
      .createQueryBuilder('jobSeeker')
      .leftJoinAndSelect('jobSeeker.user', 'user')
      .where('user.role = :role', { role: 'jobseeker' })
      .orderBy('jobSeeker.profile_views', 'DESC')
      .take(limit)
      .getMany();

    return jobseekers.map(jobSeeker => ({
      userId: jobSeeker.user_id,
      username: jobSeeker.user.username,
      email: jobSeeker.user.email,
      profileViews: jobSeeker.profile_views,
    }));
  }

  async getTopEmployersByPosts(limit: number = 10) {
    const result = await this.employerRepository
      .createQueryBuilder('employer')
      .leftJoinAndSelect('employer.user', 'user')
      .leftJoin('job_posts', 'jobPost', 'jobPost.employer_id = employer.user_id')
      .where('user.role = :role', { role: 'employer' })
      .groupBy('employer.user_id, user.id, user.username, user.email')
      .orderBy('COUNT(jobPost.id)', 'DESC')
      .addSelect('COUNT(jobPost.id) as jobCount')
      .take(limit)
      .getRawMany();
  
    return result.map(item => ({
      userId: item.employer_user_id,
      username: item.user_username,
      email: item.user_email,
      jobCount: parseInt(item.jobCount) || 0,
    }));
  }
}
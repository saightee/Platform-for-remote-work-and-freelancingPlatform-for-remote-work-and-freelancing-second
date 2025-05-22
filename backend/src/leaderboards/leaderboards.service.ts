import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSeeker } from '../users/entities/jobseeker.entity'; // Добавляем
import { Employer } from '../users/entities/employer.entity';

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(JobSeeker) // Добавляем
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
}
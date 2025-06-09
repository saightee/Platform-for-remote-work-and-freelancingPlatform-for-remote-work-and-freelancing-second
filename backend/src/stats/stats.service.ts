import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
  ) {}

  async getPublicStats() {
    const [jobSeekerCount, employerCount, jobPostCount] = await Promise.all([
      this.usersRepository.count({ where: { role: 'jobseeker' } }),
      this.usersRepository.count({ where: { role: 'employer' } }),
      this.jobPostsRepository.count(),
    ]);

    return {
      totalResumes: jobSeekerCount,
      totalJobPosts: jobPostCount,
      totalEmployers: employerCount,
    };
  }
}
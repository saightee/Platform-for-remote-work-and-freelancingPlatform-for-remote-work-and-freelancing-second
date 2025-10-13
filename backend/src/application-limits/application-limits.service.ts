import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationLimit } from './application-limit.entity';
import { Between } from 'typeorm';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
  export class ApplicationLimitsService {
    constructor(
      @InjectRepository(ApplicationLimit) private applicationLimitsRepository: Repository<ApplicationLimit>,
      @InjectRepository(JobApplication) private jobApplicationsRepository: Repository<JobApplication>,
      @InjectRepository(JobPost) private jobPostsRepository: Repository<JobPost>,
      private settingsService: SettingsService,
    ) {}

  private startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }
  private endOfDay(d: Date)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999); }

  async initializeLimits(jobPostId: string, totalLimit: number): Promise<void> {
    const distribution = [0.6, 0.8, 0.9, 1.0]; 
    const now = new Date();

    for (let day = 1; day <= 4; day++) {
      const cumulativeLimit = Math.floor(totalLimit * distribution[day - 1]);
      const allowedApplications = day === 1 
        ? cumulativeLimit 
        : Math.floor(totalLimit * (distribution[day - 1] - distribution[day - 2])); 

      const date = new Date(now);
      date.setDate(now.getDate() + (day - 1));

      const limit = this.applicationLimitsRepository.create({
        job_post_id: jobPostId,
        day,
        allowed_applications: allowedApplications,
        current_applications: 0,
        cumulative_limit: cumulativeLimit,
        date,
      });
      await this.applicationLimitsRepository.save(limit);
    }
  }

  async canApply(jobPostId: string): Promise<{ canApply: boolean; message?: string }> {
    const now = new Date();

    const { globalApplicationLimit } = await this.settingsService.getGlobalApplicationLimit();
    const totalLimit = Number(globalApplicationLimit ?? 0);

    const totalApplications = await this.jobApplicationsRepository.count({ where: { job_post_id: jobPostId } });

    if (totalLimit > 0 && totalApplications >= totalLimit) {
      return { canApply: false, message: 'Job full' };
    }

    const limits = await this.applicationLimitsRepository.find({
      where: { job_post_id: jobPostId },
      order: { day: 'ASC' },
    });
    if (!limits.length) {
      return { canApply: true };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

    const todayRow = await this.applicationLimitsRepository.findOne({
      where: { job_post_id: jobPostId, date: Between(start, end) },
    });

    if (todayRow && totalApplications >= todayRow.cumulative_limit) {
      return { canApply: false, message: 'Daily application limit reached' };
    }

    return { canApply: true };
  }

  async incrementApplicationCount(jobPostId: string): Promise<void> {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const todayEnd = this.endOfDay(now);

    const todayRow = await this.applicationLimitsRepository.findOne({
      where: { job_post_id: jobPostId, date: Between(todayStart, todayEnd) },
    });

    if (todayRow) {
      todayRow.current_applications += 1;
      await this.applicationLimitsRepository.save(todayRow);
    }
  }
}
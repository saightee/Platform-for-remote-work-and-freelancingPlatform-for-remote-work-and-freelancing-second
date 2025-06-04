import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationLimit } from './application-limit.entity';

@Injectable()
export class ApplicationLimitsService {
  constructor(
    @InjectRepository(ApplicationLimit)
    private applicationLimitsRepository: Repository<ApplicationLimit>,
  ) {}

  async initializeLimits(jobPostId: string, totalLimit: number): Promise<void> {
    const distribution = [0.6, 0.8, 0.9, 1.0]; // Кумулятивные лимиты: 60%, 80%, 90%, 100%
    const now = new Date();

    for (let day = 1; day <= 4; day++) {
      const cumulativeLimit = Math.floor(totalLimit * distribution[day - 1]);
      const allowedApplications = day === 1 
        ? cumulativeLimit 
        : Math.floor(totalLimit * (distribution[day - 1] - distribution[day - 2])); // Разница для дня

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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());


    const limits = await this.applicationLimitsRepository.find({ where: { job_post_id: jobPostId } });
    if (!limits.length) {
      return { canApply: false, message: 'No application limits defined' };
    }

    const totalApplications = limits.reduce((sum, limit) => sum + limit.current_applications, 0);
    const totalLimit = limits[limits.length - 1].cumulative_limit; 

    if (totalApplications >= totalLimit) {
      return { canApply: false, message: 'Job full' };
    }

    
    const currentLimit = limits.find(limit => {
      const limitDate = new Date(limit.date);
      return limitDate.getFullYear() === today.getFullYear() &&
             limitDate.getMonth() === today.getMonth() &&
             limitDate.getDate() === today.getDate();
    });

    
    if (currentLimit) {
      if (totalApplications >= currentLimit.cumulative_limit) {
        return { canApply: false, message: 'Daily application limit reached' };
      }
      return { canApply: true };
    }

    
    return { canApply: true };
  }

  async incrementApplicationCount(jobPostId: string): Promise<void> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const limit = await this.applicationLimitsRepository.findOne({
      where: {
        job_post_id: jobPostId,
        date: today,
      },
    });

    if (limit) {
      limit.current_applications += 1;
      await this.applicationLimitsRepository.save(limit);
    }
    
  }
}
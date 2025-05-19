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
    const distribution = [0.6, 0.2, 0.1, 0.1]; // 60/20/10/10%
    const now = new Date();

    for (let day = 1; day <= 4; day++) {
      const allowedApplications = Math.floor(totalLimit * distribution[day - 1]);
      const date = new Date(now);
      date.setDate(now.getDate() + (day - 1)); // Устанавливаем дату для каждого дня

      const limit = this.applicationLimitsRepository.create({
        job_post_id: jobPostId,
        day,
        allowed_applications: allowedApplications,
        current_applications: 0,
        date,
      });
      await this.applicationLimitsRepository.save(limit);
    }
  }

  async canApply(jobPostId: string): Promise<{ canApply: boolean; message?: string }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Находим лимит для текущего дня
    const limits = await this.applicationLimitsRepository.find({ where: { job_post_id: jobPostId } });
    const currentLimit = limits.find(limit => {
      const limitDate = new Date(limit.date);
      return limitDate.getFullYear() === today.getFullYear() &&
             limitDate.getMonth() === today.getMonth() &&
             limitDate.getDate() === today.getDate();
    });

    if (!currentLimit) {
      return { canApply: false, message: 'Application period has ended' };
    }

    if (currentLimit.current_applications >= currentLimit.allowed_applications) {
      return { canApply: false, message: 'Job full' };
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
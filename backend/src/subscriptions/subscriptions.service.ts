import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Employer } from '../users/entities/employer.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Employer)
    private readonly employersRepo: Repository<Employer>,
  ) {}

  // ---------- Работа с планами ----------

  async createPlan(data: {
    code: string;
    name: string;
    description?: string;
    price_per_month?: number;
    max_job_posts?: number;
    max_active_job_posts?: number;
    max_applications_per_job?: number;
    max_applications_total?: number;
  }) {
    const plan = this.plansRepo.create(data);
    return this.plansRepo.save(plan);
  }

  async listPlans() {
    return this.plansRepo.find({
      order: { created_at: 'ASC' },
    });
  }

  async getPlanById(id: string) {
    const plan = await this.plansRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  // ---------- Работа с подпиской работодателя ----------

  async setEmployerPlan(employerUserId: string, planId: string | null) {
    const employer = await this.employersRepo.findOne({
      where: { user_id: employerUserId },
      relations: ['active_subscription_plan'],
    });

    if (!employer) {
      throw new NotFoundException('Employer not found');
    }

    if (planId) {
      const plan = await this.getPlanById(planId);
      employer.active_subscription_plan_id = plan.id;
    } else {
      // Снять подписку
      employer.active_subscription_plan_id = null;
    }

    await this.employersRepo.save(employer);

    return this.getEmployerCurrentPlan(employerUserId);
  }

  async getEmployerCurrentPlan(employerUserId: string) {
    const employer = await this.employersRepo.findOne({
      where: { user_id: employerUserId },
      relations: ['active_subscription_plan'],
    });

    if (!employer) {
      throw new NotFoundException('Employer not found');
    }

    return {
      employer_id: employer.user_id,
      plan: employer.active_subscription_plan || null,
    };
  }

  // ---------- Заготовка под будущие проверки ----------

  /**
   * Заглушка. Потом сюда можно добавить реальную логику:
   * считать количество активных вакансий и сравнивать с лимитами плана.
   */
  async canCreateJobPost(_employerUserId: string) {
    // TODO: реализовать проверку лимитов по подписке
    return { allowed: true, reason: null as string | null };
  }

  /**
   * Аналогично можно будет проверять лимиты по откликам
   */
  async canReceiveJobApplication(_employerUserId: string) {
    // TODO: реализовать проверку лимитов по подписке
    return { allowed: true, reason: null as string | null };
  }
}

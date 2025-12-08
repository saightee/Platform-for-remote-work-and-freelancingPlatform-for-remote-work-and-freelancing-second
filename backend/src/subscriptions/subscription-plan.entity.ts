import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ЧПУ/код тарифа, типа "FREE", "STARTER", "PRO"
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price_per_month?: number | null;

  // Сколько всего вакансий можно иметь (null = без ограничения)
  @Column({ type: 'int', nullable: true })
  max_job_posts?: number | null;

  // Сколько АКТИВНЫХ вакансий одновременно (null = без ограничения)
  @Column({ type: 'int', nullable: true })
  max_active_job_posts?: number | null;

  // Максимум откликов на одну вакансию (поверх глобального лимита)
  @Column({ type: 'int', nullable: true })
  max_applications_per_job?: number | null;

  // Общий лимит откликов (null = без ограничения)
  @Column({ type: 'int', nullable: true })
  max_applications_total?: number | null;

  // Можно будет выключать старые планы, не ломая существующие данные
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

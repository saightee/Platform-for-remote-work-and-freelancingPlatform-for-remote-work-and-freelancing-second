import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { SubscriptionPlan } from '../../subscriptions/subscription-plan.entity';

@Entity('employers')
export class Employer {
  @PrimaryColumn()
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  company_name?: string;

  @Column({ nullable: true })
  company_info?: string;

  @Column({ nullable: true })
  referral_link?: string;

  @Column({ nullable: true })
  referred_by_user_id?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({ type: 'float', default: 0 }) 
  average_rating: number;

  @Column({ type: 'uuid', nullable: true })
  active_subscription_plan_id?: string | null;

  @ManyToOne(() => SubscriptionPlan, { nullable: true })
  @JoinColumn({ name: 'active_subscription_plan_id' })
  active_subscription_plan?: SubscriptionPlan | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
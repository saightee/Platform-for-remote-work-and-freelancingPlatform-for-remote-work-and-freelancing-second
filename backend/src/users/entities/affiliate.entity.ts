import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('affiliates')
export class Affiliate {
  @PrimaryColumn()
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  account_type?: 'individual' | 'company';

  @Column({ nullable: true })
  company_name?: string;

  @Column({ nullable: true })
  website_url?: string;

  @Column({ type: 'text', nullable: true })
  traffic_sources?: string | null;

  @Column({ type: 'text', nullable: true })
  promo_geo?: string | null;

  @Column({ nullable: true })
  monthly_traffic?: string;

  @Column({ nullable: true })
  payout_method?: string;

  @Column({ nullable: true })
  payout_details?: string;

  @Column({ nullable: true })
  telegram?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ nullable: true })
  skype?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  referral_link?: string;

  @Column({ nullable: true })
  referred_by_user_id?: string;

  @Column({ type: 'text', nullable: true })
  default_postback_url?: string | null;

  @Column({ type: 'text', nullable: true })
  default_fb_pixel_code?: string | null;

  @Column({ type: 'text', nullable: true })
  default_ga_tag_code?: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

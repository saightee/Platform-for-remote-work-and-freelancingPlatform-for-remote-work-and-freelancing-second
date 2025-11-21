import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { AffiliateLink } from './affiliate-link.entity';
import { AffiliateClick } from './affiliate-click.entity';
import { User } from '../../users/entities/user.entity';

export type AffiliateLeadStatus =
  | 'unqualified'
  | 'qualified'
  | 'rejected'
  | 'fraud';

export type AffiliatePayoutStatus =
  | 'pending'
  | 'approved'
  | 'paid'
  | 'canceled';

@Entity('affiliate_registrations')
export class AffiliateRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AffiliateLink, (link) => link.registrations, {
    onDelete: 'CASCADE',
  })
  link: AffiliateLink;

  @ManyToOne(() => AffiliateClick, (click) => click.registrations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  click?: AffiliateClick | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  role: 'jobseeker' | 'employer';

  @Column({ type: 'varchar', length: 20, default: 'unqualified' })
  status: AffiliateLeadStatus;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country?: string | null;

  @CreateDateColumn()
  registered_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  qualified_at?: Date | null;

  @Column({ type: 'numeric', nullable: true })
  payout_amount?: number | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  payout_currency?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  payout_status: AffiliatePayoutStatus;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AffiliateOfferGeoRule } from './affiliate-offer-geo-rule.entity';
import { AffiliateLink } from './affiliate-link.entity';
import { User } from '../../users/entities/user.entity';

export type AffiliateTargetRole = 'jobseeker' | 'employer';
export type AffiliatePayoutModel = 'cpa' | 'revshare' | 'hybrid';

@Entity('affiliate_offers')
export class AffiliateOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  target_role: AffiliateTargetRole;

  @Column({ type: 'varchar', length: 20 })
  payout_model: AffiliatePayoutModel;

  @Column({ type: 'numeric', nullable: true })
  default_cpa_amount: number | null;

  @Column({ type: 'numeric', nullable: true })
  default_revshare_percent: number | null;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brand?: string | null;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => AffiliateOfferGeoRule, (geo) => geo.offer)
  geo_rules: AffiliateOfferGeoRule[];

  @OneToMany(() => AffiliateLink, (link) => link.offer)
  links: AffiliateLink[];

  @Column({ type: 'varchar', length: 20, default: 'public' })
  visibility: 'public' | 'private';

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'affiliate_user_id' })
  affiliate_user?: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

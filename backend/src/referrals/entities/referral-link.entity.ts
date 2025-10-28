import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { JobPost } from '../../job-posts/job-post.entity';
import { ReferralRegistration } from './referral-registration.entity';
import { User } from '../../users/entities/user.entity';
export type ReferralScope = 'job' | 'site';

@Entity('referral_links')
@Index(['ref_code'], { unique: true })
export class ReferralLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ref_code: string;

  @Column({ default: 0 })
  clicks: number;

  @Column({ default: 0 })
  registrations: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 8, default: 'job' })
  scope: ReferralScope;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  created_by_admin?: User;

  @ManyToOne(() => JobPost, (jobPost) => jobPost.referralLinks, { onDelete: 'CASCADE', nullable: true })
  job_post: JobPost | null;

  @Column({ type: 'text', nullable: true })
  landing_path?: string | null;

  @OneToMany(() => ReferralRegistration, (reg) => reg.referral_link)
  registrationsDetails: ReferralRegistration[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
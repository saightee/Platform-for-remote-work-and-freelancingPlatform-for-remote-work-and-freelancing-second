import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JobPost } from '../../job-posts/job-post.entity';
import { ReferralRegistration } from '..//entities/referral-registration.entity';

@Entity('referral_links')
export class ReferralLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ref_code: string;

  @Column({ default: 0 })
  clicks: number;

  @Column({ default: 0 })
  registrations: number;

  @ManyToOne(() => JobPost, (jobPost) => jobPost.referralLinks, { onDelete: 'CASCADE' })
  job_post: JobPost;

  @OneToMany(() => ReferralRegistration, (reg) => reg.referral_link)
  registrationsDetails: ReferralRegistration[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
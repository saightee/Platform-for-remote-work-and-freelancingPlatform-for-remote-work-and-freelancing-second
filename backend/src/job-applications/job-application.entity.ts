import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';
import { ReferralLink } from '../referrals/entities/referral-link.entity';

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  job_post_id: string;

  @ManyToOne(() => JobPost)
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @Column({ type: 'text', nullable: true })
  cover_letter: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  full_name?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  referred_by?: string;

  @Column()
  job_seeker_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'job_seeker_id' })
  job_seeker: User;

  @Column({ type: 'varchar', length: 20 })
  status: 'Pending' | 'Accepted' | 'Rejected';

  @Column({ type: 'uuid', nullable: true })
  referral_link_id?: string;
  
  @ManyToOne(() => ReferralLink, { nullable: true })
  @JoinColumn({ name: 'referral_link_id' })
  referral_link?: ReferralLink;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

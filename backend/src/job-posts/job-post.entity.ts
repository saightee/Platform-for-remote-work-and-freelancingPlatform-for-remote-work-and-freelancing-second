import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/category.entity';
import { JobApplication } from '../job-applications/job-application.entity'; 
import { ReferralLink } from '../referrals/entities/referral-link.entity';

@Entity('job_posts')
export class JobPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  location: string;

  @Column('int', { nullable: true })
  salary?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  salary_type?: 'per hour' | 'per month' | 'negotiable';

  @Column('text', { array: true, nullable: true })
  excluded_locations?: string[];

  @Column({ type: 'varchar', length: 20 })
  status: 'Active' | 'Draft' | 'Closed';

  @Column({ default: true })
  pending_review: boolean;

  @Column({ nullable: true })
  category_id: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ nullable: true })
  job_type: 'Full-time' | 'Part-time' | 'Project-based';

  @Column()
  employer_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ default: 0 })
  views: number;

  @Column('text', { array: true, nullable: true })
  required_skills?: string[];

  @OneToMany(() => JobApplication, application => application.job_post) 
  applications: JobApplication[];

  @OneToMany(() => ReferralLink, (link) => link.job_post)
  referralLinks: ReferralLink[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
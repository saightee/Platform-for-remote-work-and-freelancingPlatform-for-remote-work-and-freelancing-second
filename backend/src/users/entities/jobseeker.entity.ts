import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';
import { Category } from '../../categories/category.entity';

@Entity('jobseekers')
export class JobSeeker {
  @PrimaryColumn()
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Category)
  @JoinTable()
  skills: Category[];

  @Column({ nullable: true })
  experience?: string;
  
  @Column('text', { nullable: true })
  description?: string;

  @Column({ type: 'varchar', default: 'open_to_offers' })
  job_search_status: 'actively_looking' | 'open_to_offers' | 'hired';

  @Column({ nullable: true })
  portfolio?: string;

  @Column({ nullable: true })
  video_intro?: string;

  @Column({ nullable: true })
  resume?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ type: 'numeric', nullable: true, precision: 12, scale: 2 })
  expected_salary?: number;
  
  @Column({ nullable: true })
  currency?: string;

  @Column({ type: 'float', default: 0 })
  average_rating: number;

  @Column({ default: 0 })
  profile_views: number;
  
  @Column({ nullable: true })
  referral_link?: string;

  @Column({ nullable: true })
  referred_by_user_id?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
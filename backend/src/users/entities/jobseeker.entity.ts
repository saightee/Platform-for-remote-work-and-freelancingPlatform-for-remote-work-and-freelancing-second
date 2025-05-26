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

  @Column('text', { array: true, nullable: true })
  skills?: string[];

  @ManyToMany(() => Category)
  @JoinTable()
  categories: Category[];

  @Column({ nullable: true })
  experience?: string;

  @Column({ nullable: true })
  portfolio?: string;

  @Column({ nullable: true })
  video_intro?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({ type: 'float', default: 0 })
  average_rating: number;

  @Column({ default: 0 })
  profile_views: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
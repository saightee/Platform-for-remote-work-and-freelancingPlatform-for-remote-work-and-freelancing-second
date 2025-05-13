import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobApplication } from '../job-applications/job-application.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reviewer_id: string; // Кто оставил отзыв (employer или jobseeker)

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column()
  reviewed_id: string; // Кого оценивают (employer или jobseeker)

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_id' })
  reviewed: User;

  @Column()
  job_application_id: string; // Связь с заявкой

  @ManyToOne(() => JobApplication)
  @JoinColumn({ name: 'job_application_id' })
  job_application: JobApplication;

  @Column({ type: 'integer' })
  rating: number; // 1-5 звезд

  @Column('text', { nullable: true })
  comment?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
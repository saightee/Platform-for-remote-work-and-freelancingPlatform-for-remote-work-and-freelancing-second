import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { JobPost } from '../job-posts/job-post.entity';

@Entity('application_limits')
export class ApplicationLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  job_post_id: string;

  @ManyToOne(() => JobPost)
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @Column()
  day: number; 

  @Column()
  allowed_applications: number; 

  @Column({ default: 0 })
  current_applications: number; 

  @Column()
  cumulative_limit: number;

  @Column()
  date: Date; 
}
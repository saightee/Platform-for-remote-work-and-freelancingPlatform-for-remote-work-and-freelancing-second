import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  job_post_id: string;

  @ManyToOne(() => JobPost)
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @Column()
  job_seeker_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'job_seeker_id' })
  job_seeker: User;

  @Column({ type: 'varchar', length: 20 })
  status: 'Pending' | 'Accepted' | 'Rejected';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
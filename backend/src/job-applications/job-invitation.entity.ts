import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';

@Entity('job_invitations')
@Unique(['job_post_id', 'job_seeker_id'])
export class JobInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  job_post_id: string;

  @ManyToOne(() => JobPost)
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @Column()
  employer_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column()
  job_seeker_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'job_seeker_id' })
  job_seeker: User;

  @Column({ type: 'varchar', length: 20 })
  status: 'Pending' | 'Accepted' | 'Declined';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

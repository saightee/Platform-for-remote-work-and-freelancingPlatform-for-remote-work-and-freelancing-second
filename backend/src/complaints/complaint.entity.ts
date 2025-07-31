import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  complainant_id: string; 

  @ManyToOne(() => User)
  @JoinColumn({ name: 'complainant_id' })
  complainant: User;

  @Column({ nullable: true })
  job_post_id: string; 

  @ManyToOne(() => JobPost, { nullable: true })
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @Column({ nullable: true })
  profile_id: string; 

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'profile_id' })
  profile: User;

  @Column('text')
  reason: string; 

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: 'Pending' | 'Resolved' | 'Rejected'; 

  @Column({ type: 'text', nullable: true })
  resolution_comment?: string; 

  @Column({ nullable: true }) 
  resolver_id: string;

  @ManyToOne(() => User, { nullable: true }) 
  @JoinColumn({ name: 'resolver_id' })
  resolver: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
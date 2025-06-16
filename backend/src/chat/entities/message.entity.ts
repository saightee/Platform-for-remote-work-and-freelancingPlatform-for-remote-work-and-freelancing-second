import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { JobApplication } from '../../job-applications/job-application.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  job_application_id: string;

  @ManyToOne(() => JobApplication)
  @JoinColumn({ name: 'job_application_id' })
  job_application: JobApplication;

  @Column()
  sender_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column()
  recipient_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;
}
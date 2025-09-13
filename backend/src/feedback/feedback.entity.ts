import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export type TechFeedbackCategory = 'Bug' | 'UI' | 'Performance' | 'Data' | 'Other';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  category: TechFeedbackCategory;

  @Column('text')
  summary: string;

  @Column('text', { nullable: true })
  steps_to_reproduce?: string | null;

  @Column('text', { nullable: true })
  expected_result?: string | null;

  @Column('text', { nullable: true })
  actual_result?: string | null;

  @Column()
  role: 'jobseeker' | 'employer';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('platform_feedback')
export class PlatformFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  role: 'jobseeker' | 'employer';

  @Column({ type: 'varchar', length: 120 })
  headline: string;

  @Column({ type: 'text' })
  story: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'boolean', default: false })
  allowed_to_publish: boolean;

  @Index()
  @Column({ type: 'boolean', default: false })
  is_public: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

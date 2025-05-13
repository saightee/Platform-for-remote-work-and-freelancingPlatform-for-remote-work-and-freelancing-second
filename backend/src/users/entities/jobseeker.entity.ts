import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('jobseekers')
export class JobSeeker {
  @PrimaryColumn()
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('text', { array: true, nullable: true })
  skills?: string[];

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

  @Column({ type: 'float', default: 0 }) // Добавляем средний рейтинг
  average_rating: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
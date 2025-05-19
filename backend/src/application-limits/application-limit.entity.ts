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
  day: number; // 1, 2, 3 или 4 (день распределения)

  @Column()
  allowed_applications: number; // Доступное количество заявок на этот день (например, 60% от лимита)

  @Column({ default: 0 })
  current_applications: number; // Текущее количество поданных заявок на этот день

  @Column()
  date: Date; // Дата начала дня (для проверки актуальности)
}
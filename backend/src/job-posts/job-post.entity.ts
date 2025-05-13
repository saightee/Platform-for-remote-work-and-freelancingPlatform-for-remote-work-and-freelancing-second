import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/category.entity';

@Entity('job_posts')
export class JobPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  location: string;

  @Column()
  salary: number;

  @Column({ type: 'varchar', length: 20 })
  status: 'Active' | 'Draft' | 'Closed';

  @Column({ type: 'varchar', length: 20, nullable: true }) // Добавляем поле job_type
  job_type?: 'Full-time' | 'Part-time' | 'Project-based';

  @Column({ nullable: true })
  category_id?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column()
  employer_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
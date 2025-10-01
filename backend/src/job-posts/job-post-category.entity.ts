import { Entity, Column, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { JobPost } from '../job-posts/job-post.entity';
import { Category } from '../categories/category.entity';

@Entity('job_post_categories')
export class JobPostCategory {
  @PrimaryColumn('uuid')
  job_post_id: string;

  @PrimaryColumn('uuid')
  category_id: string;

  @ManyToOne(() => JobPost, (jp) => jp.jobPostCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_post_id' })
  job_post: JobPost;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}

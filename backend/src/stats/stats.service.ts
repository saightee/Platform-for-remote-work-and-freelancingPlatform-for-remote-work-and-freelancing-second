import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    private categoriesService: CategoriesService,
  ) {}

  async getPublicStats() {
    const [jobSeekerCount, employerCount, jobPostCount] = await Promise.all([
      this.usersRepository.count({ where: { role: 'jobseeker' } }),
      this.usersRepository.count({ where: { role: 'employer' } }),
      this.jobPostsRepository.count({
        where: { status: 'Active', pending_review: false },
      }),
    ]);
  
    return {
      totalResumes: jobSeekerCount,
      totalJobPosts: jobPostCount,
      totalEmployers: employerCount,
    };
  }

  async getJobPostsByMainCategories() {
    const categoriesTree = await this.categoriesService.getCategories();
  
    const rows = await this.jobPostsRepository.query(
      `
      SELECT jpc.category_id, COUNT(*)::int AS cnt
      FROM job_post_categories jpc
      JOIN job_posts jp ON jp.id = jpc.job_post_id
      WHERE jp.status = $1
        AND jp.pending_review = $2
      GROUP BY jpc.category_id
      `,
      ['Active', false]
    );
  
    const countMap = new Map<string, number>();
    for (const r of rows) countMap.set(r.category_id, Number(r.cnt) || 0);
  
    function rollup(node: any): number {
      const self = countMap.get(node.id) || 0;
      const subs = (node.subcategories || []).reduce((sum: number, n: any) => sum + rollup(n), 0);
      node.count = self + subs;
      return node.count;
    }
  
    const rolled = categoriesTree
      .map((n: any) => {
        const total = rollup(n);
        return total > 0 ? { ...n, count: total } : null;
      })
      .filter(Boolean) as any[];
    
    rolled.sort((a, b) => b.count - a.count);
    
    return rolled.map(n => ({
      categoryId: n.id,
      categoryName: n.name,
      count: n.count,
    }));
  }

  async getJobPostsBySubcategories() {
    const rows = await this.jobPostsRepository.query(
      `
      SELECT c.id as "categoryId", c.name as "categoryName", COUNT(*)::int as "count"
      FROM job_post_categories jpc
      JOIN categories c ON c.id = jpc.category_id
      JOIN job_posts jp ON jp.id = jpc.job_post_id
      WHERE jp.status = $1
        AND jp.pending_review = $2
        AND c.parent_id IS NOT NULL
      GROUP BY c.id, c.name
      HAVING COUNT(*) > 0
      ORDER BY COUNT(*) DESC
      `,
      ['Active', false]
    );
  
    return rows.map((r: any) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      count: Number(r.count) || 0,
    }));
  }
}
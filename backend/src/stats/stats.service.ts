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

    const jobCounts = await this.jobPostsRepository.createQueryBuilder('jobPost')
      .select('jobPost.category_id', 'categoryId')
      .addSelect('COUNT(jobPost.id)', 'count')
      .where('jobPost.status = :status', { status: 'Active' })
      .andWhere('jobPost.pending_review = :pendingReview', { pendingReview: false })
      .groupBy('jobPost.category_id')
      .getRawMany();

    const countMap = new Map<string, number>(
      jobCounts.map(c => [c.categoryId, parseInt(c.count, 10)])
    );

    function addCounts(node: any): number {
      let total = countMap.get(node.id) || 0;
      if (node.subcategories && node.subcategories.length > 0) {
        for (const sub of node.subcategories) {
          total += addCounts(sub);
        }
      }
      node.count = total;
      return total;
    }

    const filteredTree = categoriesTree
      .map((node: any) => {
        const total = addCounts(node);
        return total > 0 ? { ...node, count: total } : null;
      })
      .filter((node: any) => node !== null);

    filteredTree.sort((a: any, b: any) => b.count - a.count);

    return filteredTree.map(node => ({
      categoryId: node.id,
      categoryName: node.name,
      count: node.count,
    }));
  }

  async getJobPostsBySubcategories() {
    const categories = await this.categoriesService.getCategories();
    const allCategories = flattenCategories(categories);

    const jobCounts = await this.jobPostsRepository.createQueryBuilder('jobPost')
      .select('jobPost.category_id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(jobPost.id)', 'count')
      .leftJoin('jobPost.category', 'category')
      .where('jobPost.status = :status', { status: 'Active' })
      .andWhere('jobPost.pending_review = :pendingReview', { pendingReview: false })
      .andWhere('category.parent_id IS NOT NULL')
      .groupBy('jobPost.category_id, category.name')
      .having('COUNT(jobPost.id) > 0')
      .orderBy('COUNT(jobPost.id)', 'DESC')
      .getRawMany();

    return jobCounts.map(result => ({
      categoryId: result.categoryId,
      categoryName: result.categoryName,
      count: parseInt(result.count, 10),
    }));

    function flattenCategories(categories: any[]): any[] {
      let result: any[] = [];
      for (const category of categories) {
        result.push(category);
        if (category.subcategories && category.subcategories.length > 0) {
          result = result.concat(flattenCategories(category.subcategories));
        }
      }
      return result;
    }
  }
}
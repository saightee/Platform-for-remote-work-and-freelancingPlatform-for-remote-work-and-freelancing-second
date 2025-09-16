import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { JobPost } from '../job-posts/job-post.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
  ) {}

  async createCategory(name: string, parentId?: string) {
    const existingCategory = await this.categoriesRepository.findOne({ where: { name } });
    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    if (parentId) {
      const parent = await this.categoriesRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const category = this.categoriesRepository.create({ name, parent_id: parentId });
    return this.categoriesRepository.save(category);
  }

  async getCategories(includeCounts = false, onlyTopLevel = false) {
    const categories = await this.categoriesRepository.find({
      relations: ['parent'],
      order: { name: 'ASC' },
    });

    let countsMap: Map<string, number> | undefined;
    if (includeCounts) {
      const raw = await this.jobPostsRepository
        .createQueryBuilder('jp')
        .select('jp.category_id', 'category_id')
        .addSelect('COUNT(*)', 'cnt')
        .where('jp.status = :st', { st: 'Active' })
        .andWhere('jp.pending_review = :pr', { pr: false })
        .andWhere('jp.category_id IS NOT NULL')
        .groupBy('jp.category_id')
        .getRawMany();

      const parentMap = new Map<string, string | null>();
      categories.forEach(c => parentMap.set(c.id, c.parent_id || null));

      const totalMap = new Map<string, number>();
      categories.forEach(c => totalMap.set(c.id, 0));

      for (const row of raw) {
        const catId: string = row.category_id;
        const cnt = Number(row.cnt) || 0;
        let cur: string | null = catId || null;
        while (cur) {
          totalMap.set(cur, (totalMap.get(cur) || 0) + cnt);
          cur = parentMap.get(cur) ?? null;
        }
      }
      countsMap = totalMap;
    }

    const tree = this.buildCategoryTree(categories, countsMap);

    if (onlyTopLevel) return tree;
    return tree;
  }

  async getCategoryById(categoryId: string) {
    const category = await this.categoriesRepository.findOne({ where: { id: categoryId }, relations: ['parent'] });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return category;
  }

  private buildCategoryTree(categories: Category[], countsMap?: Map<string, number>) {
    const categoryMap = new Map<string, any>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        subcategories: [],
        ...(countsMap ? { jobs_count: countsMap.get(cat.id) || 0 } : {}),
      });
    });

    const tree: any[] = [];
    categories.forEach(cat => {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) parent.subcategories.push(categoryMap.get(cat.id));
      } else {
        tree.push(categoryMap.get(cat.id));
      }
    });

    tree.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    tree.forEach(parent => {
      if (parent.subcategories?.length) {
        parent.subcategories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      }
    });

    return tree;
  }

  async searchCategories(searchTerm: string) {
    return this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.name ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('category.name', 'ASC')
      .getMany();
  }

  async getDescendantIdsIncludingSelf(rootId: string): Promise<string[]> {
    const all = await this.categoriesRepository.find();
    const childrenMap = new Map<string, string[]>();
    for (const c of all) {
      if (!childrenMap.has(c.parent_id || 'root')) childrenMap.set(c.parent_id || 'root', []);
      if (c.parent_id) {
        childrenMap.get(c.parent_id)!.push(c.id);
      }
    }

    const result = new Set<string>([rootId]);
    const queue: string[] = [rootId];
    while (queue.length) {
      const current = queue.shift()!;
      const kids = childrenMap.get(current) || [];
      for (const childId of kids) {
        if (!result.has(childId)) {
          result.add(childId);
          queue.push(childId);
        }
      }
    }
    return Array.from(result);
  }

  async expandCategoryIdsWithDescendants(ids: string[]): Promise<string[]> {
    const out = new Set<string>();
    for (const id of ids) {
      const expanded = await this.getDescendantIdsIncludingSelf(id);
      expanded.forEach(x => out.add(x));
    }
    return Array.from(out);
  }
}
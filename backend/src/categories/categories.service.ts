import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
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

  async getCategories() {
    const categories = await this.categoriesRepository.find({ 
      relations: ['parent'], 
      order: { name: 'ASC' } 
    });
    return this.buildCategoryTree(categories);
  }

  async getCategoryById(categoryId: string) {
    const category = await this.categoriesRepository.findOne({ where: { id: categoryId }, relations: ['parent'] });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return category;
  }

  private buildCategoryTree(categories: Category[]) {
    const categoryMap = new Map<string, any>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, subcategories: [] });
    });

    const tree: any[] = [];
    categories.forEach(cat => {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.subcategories.push(categoryMap.get(cat.id));
        }
      } else {
        tree.push(categoryMap.get(cat.id));
      }
    });

    tree.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    tree.forEach(parent => {
      if (parent.subcategories && parent.subcategories.length > 0) {
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
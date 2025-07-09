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
    const categories = await this.categoriesRepository.find({ relations: ['parent'] });
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

    return tree;
  }

  async searchCategories(searchTerm: string) {
    return this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.name ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .getMany();
  }
}
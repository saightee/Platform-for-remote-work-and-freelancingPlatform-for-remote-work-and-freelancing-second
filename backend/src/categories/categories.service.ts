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

  async createCategory(name: string) {
    const existingCategory = await this.categoriesRepository.findOne({ where: { name } });
    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    const category = this.categoriesRepository.create({ name });
    return this.categoriesRepository.save(category);
  }

  async getCategories() {
    return this.categoriesRepository.find();
  }

  async getCategoryById(categoryId: string) {
    const category = await this.categoriesRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return category;
  }
}
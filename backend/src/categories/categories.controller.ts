import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Post()
  async createCategory(@Body('name') name: string) {
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    return this.categoriesService.createCategory(name);
  }

  @Get()
  async getCategories() {
    return this.categoriesService.getCategories();
  }
}
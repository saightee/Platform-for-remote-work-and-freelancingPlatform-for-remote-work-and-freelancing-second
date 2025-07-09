import { Controller, Post, Get, Body, Query, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

interface CreateCategoryDto {
  name: string;
  parentId?: string;
}

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Post()
  async createCategory(@Body() body: CreateCategoryDto) {
    if (!body.name) {
      throw new BadRequestException('Category name is required');
    }
    return this.categoriesService.createCategory(body.name, body.parentId);
  }

  @Get()
  async getCategories() {
    return this.categoriesService.getCategories();
  }

  @Get('search')
  async searchCategories(@Query('term') searchTerm: string) {
    if (!searchTerm) {
      throw new BadRequestException('Search term is required');
    }
    return this.categoriesService.searchCategories(searchTerm);
  }
}
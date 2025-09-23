import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

interface CreateCategoryDto {
  name: string;
  parentId?: string;
}

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async getCategories(
    @Query('includeCounts') includeCounts?: string,
    @Query('onlyTopLevel') onlyTopLevel?: string,
  ) {
    const withCounts = includeCounts === 'true';
    const onlyTop = onlyTopLevel === 'true';
    return this.categoriesService.getCategories(withCounts, onlyTop);
  }

  @Get('search')
  async searchCategories(@Query('term') searchTerm: string) {
    if (!searchTerm) throw new BadRequestException('Search term is required');
    return this.categoriesService.searchCategories(searchTerm);
  }
}
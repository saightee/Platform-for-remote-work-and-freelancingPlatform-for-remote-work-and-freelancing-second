import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillCategory } from './skill-category.entity';

@Injectable()
export class SkillCategoriesService {
  constructor(
    @InjectRepository(SkillCategory)
    private skillCategoriesRepository: Repository<SkillCategory>,
  ) {}

  async create(name: string): Promise<SkillCategory> {
    const existingCategory = await this.skillCategoriesRepository.findOne({ where: { name } });
    if (existingCategory) {
      throw new BadRequestException('Skill category with this name already exists');
    }

    const category = this.skillCategoriesRepository.create({ name });
    return this.skillCategoriesRepository.save(category);
  }

  async findAll(): Promise<SkillCategory[]> {
    return this.skillCategoriesRepository.find();
  }
}
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { SkillCategoriesService } from './skill-categories.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('skill-categories')
export class SkillCategoriesController {
  constructor(private skillCategoriesService: SkillCategoriesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async create(@Body('name') name: string) {
    return this.skillCategoriesService.create(name);
  }

  @Get()
  async findAll() {
    return this.skillCategoriesService.findAll();
  }
}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillCategory } from './skill-category.entity';
import { SkillCategoriesService } from './skill-categories.service';
import { SkillCategoriesController } from './skill-categories.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module'; // Добавляем

@Module({
  imports: [
    TypeOrmModule.forFeature([SkillCategory]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    AuthModule, // Добавляем
  ],
  providers: [SkillCategoriesService],
  controllers: [SkillCategoriesController],
  exports: [SkillCategoriesService],
})
export class SkillCategoriesModule {}
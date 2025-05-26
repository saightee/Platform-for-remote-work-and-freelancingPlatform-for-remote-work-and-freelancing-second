import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSkillCategories1729876543210 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('jobseekers_skill_categories_skill_category');
    await queryRunner.dropTable('skill_categories');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "skill_categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL UNIQUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "jobseekers_skill_categories_skill_category" (
        "jobseekerUserId" varchar NOT NULL,
        "skillCategoryId" uuid NOT NULL,
        PRIMARY KEY ("jobseekerUserId", "skillCategoryId"),
        CONSTRAINT "FK_jobseeker" FOREIGN KEY ("jobseekerUserId") REFERENCES "jobseekers"("user_id") ON DELETE CASCADE,
        CONSTRAINT "FK_skillCategory" FOREIGN KEY ("skillCategoryId") REFERENCES "skill_categories"("id") ON DELETE CASCADE
      )
    `);
  }
}
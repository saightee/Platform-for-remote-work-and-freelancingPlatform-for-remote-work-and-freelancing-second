import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSkillCategoriesAndRelationToJobSeeker1747885598605 implements MigrationInterface {
    name = 'AddSkillCategoriesAndRelationToJobSeeker1747885598605'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "skill_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a99e73db7d2fec4b5ce365029dc" UNIQUE ("name"), CONSTRAINT "PK_efce364bf7be7b92b7d7f948663" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "jobseekers_skill_categories_skill_categories" ("jobseekersUserId" uuid NOT NULL, "skillCategoriesId" uuid NOT NULL, CONSTRAINT "PK_189dc79cbca3f4eb1b340d6d802" PRIMARY KEY ("jobseekersUserId", "skillCategoriesId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9cb611f4861f8e43932b2adf21" ON "jobseekers_skill_categories_skill_categories" ("jobseekersUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_476e1bace36d43ac9fdbd27f29" ON "jobseekers_skill_categories_skill_categories" ("skillCategoriesId") `);
        await queryRunner.query(`ALTER TABLE "jobseekers_skill_categories_skill_categories" ADD CONSTRAINT "FK_9cb611f4861f8e43932b2adf210" FOREIGN KEY ("jobseekersUserId") REFERENCES "jobseekers"("user_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "jobseekers_skill_categories_skill_categories" ADD CONSTRAINT "FK_476e1bace36d43ac9fdbd27f296" FOREIGN KEY ("skillCategoriesId") REFERENCES "skill_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers_skill_categories_skill_categories" DROP CONSTRAINT "FK_476e1bace36d43ac9fdbd27f296"`);
        await queryRunner.query(`ALTER TABLE "jobseekers_skill_categories_skill_categories" DROP CONSTRAINT "FK_9cb611f4861f8e43932b2adf210"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_476e1bace36d43ac9fdbd27f29"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9cb611f4861f8e43932b2adf21"`);
        await queryRunner.query(`DROP TABLE "jobseekers_skill_categories_skill_categories"`);
        await queryRunner.query(`DROP TABLE "skill_categories"`);
    }

}

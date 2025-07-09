import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToUsers1751947491616 implements MigrationInterface {
    name = 'AddNewFieldToUsers1751947491616'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" RENAME COLUMN "skills" TO "description"`);
        await queryRunner.query(`CREATE TABLE "jobseekers_skills_categories" ("jobseekersUserId" uuid NOT NULL, "categoriesId" uuid NOT NULL, CONSTRAINT "PK_76fc47ad9c0c7e9f33a46881963" PRIMARY KEY ("jobseekersUserId", "categoriesId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f7c940a75faefc5ad810ebf73e" ON "jobseekers_skills_categories" ("jobseekersUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_30182ff94976e530830d4375d5" ON "jobseekers_skills_categories" ("categoriesId") `);
        await queryRunner.query(`ALTER TABLE "categories" ADD "parent_id" uuid`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "jobseekers_skills_categories" ADD CONSTRAINT "FK_f7c940a75faefc5ad810ebf73ee" FOREIGN KEY ("jobseekersUserId") REFERENCES "jobseekers"("user_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "jobseekers_skills_categories" ADD CONSTRAINT "FK_30182ff94976e530830d4375d59" FOREIGN KEY ("categoriesId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers_skills_categories" DROP CONSTRAINT "FK_30182ff94976e530830d4375d59"`);
        await queryRunner.query(`ALTER TABLE "jobseekers_skills_categories" DROP CONSTRAINT "FK_f7c940a75faefc5ad810ebf73ee"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_88cea2dc9c31951d06437879b40"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "description" text array`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "parent_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_30182ff94976e530830d4375d5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7c940a75faefc5ad810ebf73e"`);
        await queryRunner.query(`DROP TABLE "jobseekers_skills_categories"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" RENAME COLUMN "description" TO "skills"`);
    }

}

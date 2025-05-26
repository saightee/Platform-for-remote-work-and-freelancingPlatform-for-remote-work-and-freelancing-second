import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryjobseeker1748261752447 implements MigrationInterface {
    name = 'AddCategoryjobseeker1748261752447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "jobseekers_categories_categories" ("jobseekersUserId" uuid NOT NULL, "categoriesId" uuid NOT NULL, CONSTRAINT "PK_4e2dcfbc4119068538356408873" PRIMARY KEY ("jobseekersUserId", "categoriesId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_94e6031f6d4c4ab87aeb797d71" ON "jobseekers_categories_categories" ("jobseekersUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_46d77028ac841e2cc1c773645c" ON "jobseekers_categories_categories" ("categoriesId") `);
        await queryRunner.query(`ALTER TABLE "jobseekers_categories_categories" ADD CONSTRAINT "FK_94e6031f6d4c4ab87aeb797d71f" FOREIGN KEY ("jobseekersUserId") REFERENCES "jobseekers"("user_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "jobseekers_categories_categories" ADD CONSTRAINT "FK_46d77028ac841e2cc1c773645ce" FOREIGN KEY ("categoriesId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers_categories_categories" DROP CONSTRAINT "FK_46d77028ac841e2cc1c773645ce"`);
        await queryRunner.query(`ALTER TABLE "jobseekers_categories_categories" DROP CONSTRAINT "FK_94e6031f6d4c4ab87aeb797d71f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46d77028ac841e2cc1c773645c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_94e6031f6d4c4ab87aeb797d71"`);
        await queryRunner.query(`DROP TABLE "jobseekers_categories_categories"`);
    }

}

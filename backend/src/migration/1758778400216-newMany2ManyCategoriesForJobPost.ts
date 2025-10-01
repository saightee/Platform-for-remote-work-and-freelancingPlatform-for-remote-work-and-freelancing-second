import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMany2ManyCategoriesForJobPost1758778400216 implements MigrationInterface {
    name = 'NewMany2ManyCategoriesForJobPost1758778400216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "job_post_categories" ("job_post_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_2e00584b2338657c916c6c5c1bf" PRIMARY KEY ("job_post_id", "category_id"))`);
        await queryRunner.query(`ALTER TABLE "job_post_categories" ADD CONSTRAINT "FK_6b3db8c92b807366a38f0dde1a8" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_post_categories" ADD CONSTRAINT "FK_3af77ae43881ea589343b99a033" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_post_categories" DROP CONSTRAINT "FK_3af77ae43881ea589343b99a033"`);
        await queryRunner.query(`ALTER TABLE "job_post_categories" DROP CONSTRAINT "FK_6b3db8c92b807366a38f0dde1a8"`);
        await queryRunner.query(`DROP TABLE "job_post_categories"`);
    }

}

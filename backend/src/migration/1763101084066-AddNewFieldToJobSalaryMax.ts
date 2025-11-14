import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobSalaryMax1763101084066 implements MigrationInterface {
    name = 'AddNewFieldToJobSalaryMax1763101084066'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "salary_max" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "salary_max"`);
    }

}

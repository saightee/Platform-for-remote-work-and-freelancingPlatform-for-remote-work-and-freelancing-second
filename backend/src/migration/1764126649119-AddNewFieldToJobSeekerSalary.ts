import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobSeekerSalary1764126649119 implements MigrationInterface {
    name = 'AddNewFieldToJobSeekerSalary1764126649119'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "expected_salary_max" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "expected_salary_type" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "expected_salary_type"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "expected_salary_max"`);
    }

}

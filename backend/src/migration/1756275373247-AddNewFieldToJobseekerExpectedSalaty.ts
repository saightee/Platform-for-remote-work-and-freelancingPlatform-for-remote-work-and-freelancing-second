import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekerExpectedSalaty1756275373247 implements MigrationInterface {
    name = 'AddNewFieldToJobseekerExpectedSalaty1756275373247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "expected_salary" numeric(12,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "expected_salary"`);
    }

}

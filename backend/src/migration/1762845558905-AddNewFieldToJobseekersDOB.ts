import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekersDOB1762845558905 implements MigrationInterface {
    name = 'AddNewFieldToJobseekersDOB1762845558905'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "date_of_birth" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "date_of_birth"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekerSearchStatus1756178824913 implements MigrationInterface {
    name = 'AddNewFieldToJobseekerSearchStatus1756178824913'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "job_search_status" character varying NOT NULL DEFAULT 'open_to_offers'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "job_search_status"`);
    }

}

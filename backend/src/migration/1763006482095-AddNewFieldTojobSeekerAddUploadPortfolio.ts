import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldTojobSeekerAddUploadPortfolio1763006482095 implements MigrationInterface {
    name = 'AddNewFieldTojobSeekerAddUploadPortfolio1763006482095'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "portfolio_files" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "portfolio_files"`);
    }

}

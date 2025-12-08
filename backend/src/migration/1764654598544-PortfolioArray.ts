import { MigrationInterface, QueryRunner } from "typeorm";

export class PortfolioArray1764654598544 implements MigrationInterface {
    name = 'PortfolioArray1764654598544'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "portfolio"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "portfolio" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "portfolio"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "portfolio" character varying`);
    }

}

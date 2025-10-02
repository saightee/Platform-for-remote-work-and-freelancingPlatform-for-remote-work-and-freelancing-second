import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekerAndUsers1759386988946 implements MigrationInterface {
    name = 'AddNewFieldToJobseekerAndUsers1759386988946'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "brand" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "languages" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "languages"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "brand"`);
    }

}

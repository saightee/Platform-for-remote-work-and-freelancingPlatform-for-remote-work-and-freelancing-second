import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobPost170720251752723020477 implements MigrationInterface {
    name = 'AddNewFieldToJobPost170720251752723020477'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "salary_type" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "excluded_locations" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "excluded_locations"`);
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "salary_type"`);
    }

}

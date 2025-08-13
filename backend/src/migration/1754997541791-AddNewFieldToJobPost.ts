import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobPost1754997541791 implements MigrationInterface {
    name = 'AddNewFieldToJobPost1754997541791'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ALTER COLUMN "salary" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ALTER COLUMN "salary" SET NOT NULL`);
    }

}

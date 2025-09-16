import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekerTgandWA1757916175432 implements MigrationInterface {
    name = 'AddNewFieldToJobseekerTgandWA1757916175432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "whatsapp" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "telegram" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "telegram"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "whatsapp"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileViewsToJobSeeker1747905000506 implements MigrationInterface {
    name = 'AddProfileViewsToJobSeeker1747905000506'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "profile_views" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "profile_views"`);
    }

}

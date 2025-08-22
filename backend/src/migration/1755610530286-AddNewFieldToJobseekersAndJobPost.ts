import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekersAndJobPost1755610530286 implements MigrationInterface {
    name = 'AddNewFieldToJobseekersAndJobPost1755610530286'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "closed_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "employers" ADD "referred_by_user_id" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "referral_link" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "referred_by_user_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "referred_by_user_id"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "referral_link"`);
        await queryRunner.query(`ALTER TABLE "employers" DROP COLUMN "referred_by_user_id"`);
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "closed_at"`);
    }

}

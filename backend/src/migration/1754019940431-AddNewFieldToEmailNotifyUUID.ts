import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToEmailNotifyUUID1754019940431 implements MigrationInterface {
    name = 'AddNewFieldToEmailNotifyUUID1754019940431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_notifications" DROP COLUMN "job_post_id"`);
        await queryRunner.query(`ALTER TABLE "email_notifications" ADD "job_post_id" uuid NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_notifications" DROP COLUMN "job_post_id"`);
        await queryRunner.query(`ALTER TABLE "email_notifications" ADD "job_post_id" character varying NOT NULL`);
    }

}

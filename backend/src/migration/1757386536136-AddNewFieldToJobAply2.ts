import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobAply21757386536136 implements MigrationInterface {
    name = 'AddNewFieldToJobAply21757386536136'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "referral_link_id" uuid`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD CONSTRAINT "FK_f994c46888ec3f8a14c627c880e" FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP CONSTRAINT "FK_f994c46888ec3f8a14c627c880e"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "referral_link_id"`);
    }

}

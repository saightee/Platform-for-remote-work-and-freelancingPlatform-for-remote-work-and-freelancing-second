import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldJobEntity1757381599658 implements MigrationInterface {
    name = 'AddNewFieldJobEntity1757381599658'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP CONSTRAINT "FK_f994c46888ec3f8a14c627c880e"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "referral_link_id"`);
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "slug" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "slug_id" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "job_posts" ADD CONSTRAINT "UQ_dff2e84a1c83551ad9d0b1d898e" UNIQUE ("slug_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP CONSTRAINT "UQ_dff2e84a1c83551ad9d0b1d898e"`);
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "slug_id"`);
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "slug"`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "referral_link_id" uuid`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD CONSTRAINT "FK_f994c46888ec3f8a14c627c880e" FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToReferallsSite1761532572567 implements MigrationInterface {
    name = 'AddNewFieldToReferallsSite1761532572567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_links" ADD "scope" character varying(8) NOT NULL DEFAULT 'job'`);
        await queryRunner.query(`ALTER TABLE "referral_links" ADD "landing_path" text`);
        await queryRunner.query(`ALTER TABLE "referral_links" ADD "createdByAdminId" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bb85accc378b8dee6b994b7184" ON "referral_links" ("ref_code") `);
        await queryRunner.query(`ALTER TABLE "referral_links" ADD CONSTRAINT "FK_65db91afa722a04cbdca3be3f09" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_links" DROP CONSTRAINT "FK_65db91afa722a04cbdca3be3f09"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb85accc378b8dee6b994b7184"`);
        await queryRunner.query(`ALTER TABLE "referral_links" DROP COLUMN "createdByAdminId"`);
        await queryRunner.query(`ALTER TABLE "referral_links" DROP COLUMN "landing_path"`);
        await queryRunner.query(`ALTER TABLE "referral_links" DROP COLUMN "scope"`);
    }

}

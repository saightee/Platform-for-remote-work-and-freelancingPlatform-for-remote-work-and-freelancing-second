import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToAffProgram1763624428182 implements MigrationInterface {
    name = 'AddNewFieldToAffProgram1763624428182'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliate_offers" ADD "visibility" character varying(20) NOT NULL DEFAULT 'public'`);
        await queryRunner.query(`ALTER TABLE "affiliate_offers" ADD "affiliate_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "affiliate_offers" ADD CONSTRAINT "FK_18bbbc433bf650f14b88aa38e27" FOREIGN KEY ("affiliate_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliate_offers" DROP CONSTRAINT "FK_18bbbc433bf650f14b88aa38e27"`);
        await queryRunner.query(`ALTER TABLE "affiliate_offers" DROP COLUMN "affiliate_user_id"`);
        await queryRunner.query(`ALTER TABLE "affiliate_offers" DROP COLUMN "visibility"`);
    }

}

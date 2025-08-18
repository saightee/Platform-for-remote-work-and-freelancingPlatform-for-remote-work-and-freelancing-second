import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToReferallLinks1755492096644 implements MigrationInterface {
    name = 'AddNewFieldToReferallLinks1755492096644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_links" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_links" DROP COLUMN "description"`);
    }

}

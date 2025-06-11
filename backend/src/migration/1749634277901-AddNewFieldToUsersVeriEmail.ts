import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToUsersVeriEmail1749634277901 implements MigrationInterface {
    name = 'AddNewFieldToUsersVeriEmail1749634277901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "is_email_verified" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_email_verified"`);
    }

}

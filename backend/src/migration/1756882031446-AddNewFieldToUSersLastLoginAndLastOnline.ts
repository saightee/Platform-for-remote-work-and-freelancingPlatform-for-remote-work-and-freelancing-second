import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToUSersLastLoginAndLastOnline1756882031446 implements MigrationInterface {
    name = 'AddNewFieldToUSersLastLoginAndLastOnline1756882031446'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_seen_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_seen_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
    }

}

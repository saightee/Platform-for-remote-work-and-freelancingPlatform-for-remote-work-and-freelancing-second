import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarAndIdentityFieldsToUsers1747366916045 implements MigrationInterface {
    name = 'AddAvatarAndIdentityFieldsToUsers1747366916045'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "identity_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "identity_document" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "identity_document"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "identity_verified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
    }

}

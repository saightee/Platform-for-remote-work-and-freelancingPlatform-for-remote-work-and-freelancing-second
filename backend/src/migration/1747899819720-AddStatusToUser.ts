import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToUser1747899819720 implements MigrationInterface {
    name = 'AddStatusToUser1747899819720'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "status" character varying NOT NULL DEFAULT 'active'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    }

}

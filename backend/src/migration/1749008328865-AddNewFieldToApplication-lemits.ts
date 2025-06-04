import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToApplicationLemits1749008328865 implements MigrationInterface {
    name = 'AddNewFieldToApplicationLemits1749008328865'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application_limits" ADD "cumulative_limit" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application_limits" DROP COLUMN "cumulative_limit"`);
    }

}

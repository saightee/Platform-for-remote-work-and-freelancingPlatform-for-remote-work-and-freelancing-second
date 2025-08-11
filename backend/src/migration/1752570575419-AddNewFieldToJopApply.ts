import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJopApply1752570575419 implements MigrationInterface {
    name = 'AddNewFieldToJopApply1752570575419'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "cover_letter" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "cover_letter"`);
    }

}

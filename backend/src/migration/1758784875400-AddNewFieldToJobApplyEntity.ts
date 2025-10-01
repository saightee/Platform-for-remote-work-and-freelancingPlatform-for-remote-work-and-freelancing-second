import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobApplyEntity1758784875400 implements MigrationInterface {
    name = 'AddNewFieldToJobApplyEntity1758784875400'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "relevant_experience" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "relevant_experience"`);
    }

}

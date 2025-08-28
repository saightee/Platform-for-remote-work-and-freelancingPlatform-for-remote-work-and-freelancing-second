import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobApplyFullNameAndRefferedBy1756181628515 implements MigrationInterface {
    name = 'AddNewFieldToJobApplyFullNameAndRefferedBy1756181628515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "full_name" character varying(150)`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "referred_by" character varying(150)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "referred_by"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "full_name"`);
    }

}

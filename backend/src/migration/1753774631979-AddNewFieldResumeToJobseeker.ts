import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldResumeToJobseeker1753774631979 implements MigrationInterface {
    name = 'AddNewFieldResumeToJobseeker1753774631979'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "resume" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "resume"`);
    }

}

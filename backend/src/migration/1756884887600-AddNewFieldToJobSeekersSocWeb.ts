import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobSeekersSocWeb1756884887600 implements MigrationInterface {
    name = 'AddNewFieldToJobSeekersSocWeb1756884887600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "linkedin" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "instagram" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "facebook" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "facebook"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "instagram"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "linkedin"`);
    }

}

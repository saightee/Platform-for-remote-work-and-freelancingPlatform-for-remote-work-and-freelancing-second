import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobSeekerJobExp1763004211342 implements MigrationInterface {
    name = 'AddNewFieldToJobSeekerJobExp1763004211342'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "job_experience" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "job_experience"`);
    }

}

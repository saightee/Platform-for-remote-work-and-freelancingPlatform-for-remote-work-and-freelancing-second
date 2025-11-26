import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobSeekerPreferedJob1764146471338 implements MigrationInterface {
    name = 'AddNewFieldToJobSeekerPreferedJob1764146471338'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "preferred_job_types" text array DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "preferred_job_types"`);
    }

}

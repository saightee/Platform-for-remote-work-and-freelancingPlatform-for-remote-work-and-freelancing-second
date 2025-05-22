import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequiredSkillsToJobPost1747909360425 implements MigrationInterface {
    name = 'AddRequiredSkillsToJobPost1747909360425'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "required_skills" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "required_skills"`);
    }

}

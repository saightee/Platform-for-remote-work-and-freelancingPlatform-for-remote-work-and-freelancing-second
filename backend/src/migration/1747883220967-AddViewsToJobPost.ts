import { MigrationInterface, QueryRunner } from "typeorm";

export class AddViewsToJobPost1747883220967 implements MigrationInterface {
    name = 'AddViewsToJobPost1747883220967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "views" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "views"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAppLimit1751541244156 implements MigrationInterface {
    name = 'RemoveAppLimit1751541244156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "applicationLimit"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "applicationLimit" integer NOT NULL DEFAULT '100'`);
    }

}

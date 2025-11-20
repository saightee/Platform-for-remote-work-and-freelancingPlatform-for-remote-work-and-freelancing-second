import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobPost1763370724925 implements MigrationInterface {
    name = 'AddNewFieldToJobPost1763370724925'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" ADD "company_name" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "company_name"`);
    }

}

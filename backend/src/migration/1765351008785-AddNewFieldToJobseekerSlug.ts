import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToJobseekerSlug1765351008785 implements MigrationInterface {
    name = 'AddNewFieldToJobseekerSlug1765351008785'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "slug" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "slug_id" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_17d02927d66e98c3db06486ae35" UNIQUE ("slug_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_17d02927d66e98c3db06486ae35"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "slug_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "slug"`);
    }

}

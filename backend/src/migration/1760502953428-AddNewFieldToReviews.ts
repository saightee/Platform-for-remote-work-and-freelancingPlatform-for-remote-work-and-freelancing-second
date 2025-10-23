import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToReviews1760502953428 implements MigrationInterface {
    name = 'AddNewFieldToReviews1760502953428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" ADD "status" character varying NOT NULL DEFAULT 'Pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "status"`);
    }

}

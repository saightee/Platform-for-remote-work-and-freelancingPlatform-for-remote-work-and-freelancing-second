import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToFeedback1755237718339 implements MigrationInterface {
    name = 'AddNewFieldToFeedback1755237718339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "message"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "role" character varying(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "headline" character varying(120) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "story" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "allowed_to_publish" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "is_public" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "company" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "country" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD "category" character varying(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD "summary" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD "steps_to_reproduce" text`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD "expected_result" text`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD "actual_result" text`);
        await queryRunner.query(`CREATE INDEX "IDX_fd71f2179c61a143aba6916866" ON "platform_feedback" ("is_public") `);
        await queryRunner.query(`CREATE INDEX "IDX_7c6f1adbee8888d639dfb1e4db" ON "feedback" ("category") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7c6f1adbee8888d639dfb1e4db"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fd71f2179c61a143aba6916866"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "actual_result"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "expected_result"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "steps_to_reproduce"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "summary"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "company"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "is_public"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "allowed_to_publish"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "story"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "headline"`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD "message" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD "description" text NOT NULL`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToAntiFraud1757990493000 implements MigrationInterface {
    name = 'AddNewFieldToAntiFraud1757990493000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_fingerprints" ADD "is_proxy" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" ADD "is_hosting" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" ADD "seen_count" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" ADD "last_seen_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uniq_user_fp_ip" ON "user_fingerprints" ("user_id", "fingerprint", "ip") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uniq_user_fp_ip"`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" DROP COLUMN "last_seen_at"`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" DROP COLUMN "seen_count"`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" DROP COLUMN "is_hosting"`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" DROP COLUMN "is_proxy"`);
    }

}

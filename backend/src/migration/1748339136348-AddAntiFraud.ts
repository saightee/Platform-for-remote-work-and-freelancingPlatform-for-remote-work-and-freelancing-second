import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAntiFraud1748339136348 implements MigrationInterface {
    name = 'AddAntiFraud1748339136348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_fingerprints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "fingerprint" text NOT NULL, "ip" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4eb475585da84febb94b4eacced" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "risk_score" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user_fingerprints" ADD CONSTRAINT "FK_8b6d78d6a513d7db4f619da00cc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_fingerprints" DROP CONSTRAINT "FK_8b6d78d6a513d7db4f619da00cc"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "risk_score"`);
        await queryRunner.query(`DROP TABLE "user_fingerprints"`);
    }

}

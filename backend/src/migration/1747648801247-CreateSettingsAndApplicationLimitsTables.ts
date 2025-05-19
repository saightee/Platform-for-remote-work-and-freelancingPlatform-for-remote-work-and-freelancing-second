import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSettingsAndApplicationLimitsTables1747648801247 implements MigrationInterface {
    name = 'CreateSettingsAndApplicationLimitsTables1747648801247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "value" character varying NOT NULL, CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "application_limits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "job_post_id" uuid NOT NULL, "day" integer NOT NULL, "allowed_applications" integer NOT NULL, "current_applications" integer NOT NULL DEFAULT '0', "date" TIMESTAMP NOT NULL, CONSTRAINT "PK_7c0ef4c44cbf6416988bdac6850" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "application_limits" ADD CONSTRAINT "FK_1efed4ab1959d1bf5a0d2c5a801" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application_limits" DROP CONSTRAINT "FK_1efed4ab1959d1bf5a0d2c5a801"`);
        await queryRunner.query(`DROP TABLE "application_limits"`);
        await queryRunner.query(`DROP TABLE "settings"`);
    }

}

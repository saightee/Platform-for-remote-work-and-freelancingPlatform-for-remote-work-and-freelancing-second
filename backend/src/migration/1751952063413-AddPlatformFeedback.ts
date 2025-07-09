import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformFeedback1751952063413 implements MigrationInterface {
    name = 'AddPlatformFeedback1751952063413'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "platform_feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "rating" integer NOT NULL, "description" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_75dfb38d74bbc1278817d73eadb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "platform_feedback" ADD CONSTRAINT "FK_c5cf754dc18b61f0f9cee7fe473" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform_feedback" DROP CONSTRAINT "FK_c5cf754dc18b61f0f9cee7fe473"`);
        await queryRunner.query(`DROP TABLE "platform_feedback"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class NewTabEmailNotify1753698618693 implements MigrationInterface {
    name = 'NewTabEmailNotify1753698618693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "job_post_id" character varying NOT NULL, "recipient_email" character varying NOT NULL, "recipient_username" character varying NOT NULL, "message_id" character varying, "opened" boolean NOT NULL DEFAULT false, "clicked" boolean NOT NULL DEFAULT false, "sent_at" TIMESTAMP NOT NULL DEFAULT now(), "opened_at" TIMESTAMP, "clicked_at" TIMESTAMP, CONSTRAINT "PK_f4d8ce5003f1ce04365090df2d2" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "email_notifications"`);
    }

}

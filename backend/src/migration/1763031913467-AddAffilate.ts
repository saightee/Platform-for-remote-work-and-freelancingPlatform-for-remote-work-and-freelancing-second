import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAffilate1763031913467 implements MigrationInterface {
    name = 'AddAffilate1763031913467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "affiliates" ("user_id" uuid NOT NULL, "account_type" character varying, "company_name" character varying, "website_url" character varying, "traffic_sources" text, "promo_geo" text, "monthly_traffic" character varying, "payout_method" character varying, "payout_details" character varying, "telegram" character varying, "whatsapp" character varying, "skype" character varying, "notes" text, "referral_link" character varying, "referred_by_user_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5f88f63a07fad2be67d4b36152" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "affiliates" ADD CONSTRAINT "FK_c5f88f63a07fad2be67d4b36152" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliates" DROP CONSTRAINT "FK_c5f88f63a07fad2be67d4b36152"`);
        await queryRunner.query(`DROP TABLE "affiliates"`);
    }

}

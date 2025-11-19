import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAffAndNewFieldsJobseeker1763542364168 implements MigrationInterface {
    name = 'AddAffAndNewFieldsJobseeker1763542364168'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "affiliate_registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'unqualified', "country" character varying(2), "registered_at" TIMESTAMP NOT NULL DEFAULT now(), "qualified_at" TIMESTAMP, "payout_amount" numeric, "payout_currency" character varying(3), "payout_status" character varying(20) NOT NULL DEFAULT 'pending', "linkId" uuid, "clickId" uuid, "userId" uuid, CONSTRAINT "PK_2c21d78ee7dcafe7a1c4a935c2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "affiliate_clicks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "click_id" character varying NOT NULL, "ip" character varying(45), "user_agent" text, "country" character varying(2), "sub1" text, "sub2" text, "sub3" text, "sub4" text, "sub5" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "linkId" uuid, CONSTRAINT "UQ_e7028caf9d2570ef169c165c9dd" UNIQUE ("click_id"), CONSTRAINT "PK_15da15bc7ff917601a3372e5af7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "affiliate_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "landing_path" text, "comment" text, "postback_url_override" text, "fb_pixel_code_override" text, "ga_tag_code_override" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "affiliate_user_id" uuid, "offerId" uuid, CONSTRAINT "UQ_b7758b45ff7ef9d9e996a9aea63" UNIQUE ("code"), CONSTRAINT "PK_aec82c42f69dc336dd434d16436" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b7758b45ff7ef9d9e996a9aea6" ON "affiliate_links" ("code") `);
        await queryRunner.query(`CREATE TABLE "affiliate_offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "target_role" character varying(20) NOT NULL, "payout_model" character varying(20) NOT NULL, "default_cpa_amount" numeric, "default_revshare_percent" numeric, "currency" character varying(3) NOT NULL DEFAULT 'USD', "brand" character varying(50), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d79771a200d995c7fc97c626a9c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "affiliate_offer_geo_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "country" character varying(2) NOT NULL, "cpa_amount" numeric, "revshare_percent" numeric, "currency" character varying(3), "is_active" boolean NOT NULL DEFAULT true, "offerId" uuid, CONSTRAINT "PK_d8d98ffb615cf3a74c55cf9a5fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "affiliates" ADD "default_postback_url" text`);
        await queryRunner.query(`ALTER TABLE "affiliates" ADD "default_fb_pixel_code" text`);
        await queryRunner.query(`ALTER TABLE "affiliates" ADD "default_ga_tag_code" text`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "current_position" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "education" character varying`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "job_experience_items" jsonb`);
        await queryRunner.query(`ALTER TABLE "jobseekers" ADD "education_items" jsonb`);
        await queryRunner.query(`ALTER TABLE "affiliate_registrations" ADD CONSTRAINT "FK_41c5f1b6d79b5ff6a87d8bec28b" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "affiliate_registrations" ADD CONSTRAINT "FK_e937f9ed775e344ac6daaac00fa" FOREIGN KEY ("clickId") REFERENCES "affiliate_clicks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "affiliate_registrations" ADD CONSTRAINT "FK_0f412cea42ca1a02bc43311ea7c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "FK_e04dd170b5997f10d18ce26c629" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "affiliate_links" ADD CONSTRAINT "FK_c9a097b6bb6a97db55dcb21dad7" FOREIGN KEY ("affiliate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "affiliate_links" ADD CONSTRAINT "FK_cb9442616fdf8ad0cbdb0cd5f0c" FOREIGN KEY ("offerId") REFERENCES "affiliate_offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "affiliate_offer_geo_rules" ADD CONSTRAINT "FK_e774af583c93510fe9902424732" FOREIGN KEY ("offerId") REFERENCES "affiliate_offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliate_offer_geo_rules" DROP CONSTRAINT "FK_e774af583c93510fe9902424732"`);
        await queryRunner.query(`ALTER TABLE "affiliate_links" DROP CONSTRAINT "FK_cb9442616fdf8ad0cbdb0cd5f0c"`);
        await queryRunner.query(`ALTER TABLE "affiliate_links" DROP CONSTRAINT "FK_c9a097b6bb6a97db55dcb21dad7"`);
        await queryRunner.query(`ALTER TABLE "affiliate_clicks" DROP CONSTRAINT "FK_e04dd170b5997f10d18ce26c629"`);
        await queryRunner.query(`ALTER TABLE "affiliate_registrations" DROP CONSTRAINT "FK_0f412cea42ca1a02bc43311ea7c"`);
        await queryRunner.query(`ALTER TABLE "affiliate_registrations" DROP CONSTRAINT "FK_e937f9ed775e344ac6daaac00fa"`);
        await queryRunner.query(`ALTER TABLE "affiliate_registrations" DROP CONSTRAINT "FK_41c5f1b6d79b5ff6a87d8bec28b"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "education_items"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "job_experience_items"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "education"`);
        await queryRunner.query(`ALTER TABLE "jobseekers" DROP COLUMN "current_position"`);
        await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "default_ga_tag_code"`);
        await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "default_fb_pixel_code"`);
        await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "default_postback_url"`);
        await queryRunner.query(`DROP TABLE "affiliate_offer_geo_rules"`);
        await queryRunner.query(`DROP TABLE "affiliate_offers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b7758b45ff7ef9d9e996a9aea6"`);
        await queryRunner.query(`DROP TABLE "affiliate_links"`);
        await queryRunner.query(`DROP TABLE "affiliate_clicks"`);
        await queryRunner.query(`DROP TABLE "affiliate_registrations"`);
    }

}

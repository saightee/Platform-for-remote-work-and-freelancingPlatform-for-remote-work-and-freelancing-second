import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminReferalLink1753950550529 implements MigrationInterface {
    name = 'AddAdminReferalLink1753950550529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "referral_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ref_code" character varying NOT NULL, "clicks" integer NOT NULL DEFAULT '0', "registrations" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "jobPostId" uuid, CONSTRAINT "UQ_bb85accc378b8dee6b994b71843" UNIQUE ("ref_code"), CONSTRAINT "PK_ba9165a54bafa386574ba5a8a6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "referral_registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "referralLinkId" uuid, "userId" uuid, CONSTRAINT "PK_a305100aec4569d0575b74cf8eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referral_source" character varying`);
        await queryRunner.query(`ALTER TABLE "referral_links" ADD CONSTRAINT "FK_f2da206034b5a836695c2c7027c" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_registrations" ADD CONSTRAINT "FK_cb90c2af409744beb995d1e0562" FOREIGN KEY ("referralLinkId") REFERENCES "referral_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_registrations" ADD CONSTRAINT "FK_f719dc69e6516a74061999c5b97" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_registrations" DROP CONSTRAINT "FK_f719dc69e6516a74061999c5b97"`);
        await queryRunner.query(`ALTER TABLE "referral_registrations" DROP CONSTRAINT "FK_cb90c2af409744beb995d1e0562"`);
        await queryRunner.query(`ALTER TABLE "referral_links" DROP CONSTRAINT "FK_f2da206034b5a836695c2c7027c"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referral_source"`);
        await queryRunner.query(`DROP TABLE "referral_registrations"`);
        await queryRunner.query(`DROP TABLE "referral_links"`);
    }

}

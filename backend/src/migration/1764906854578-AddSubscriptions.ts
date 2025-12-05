import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptions1764906854578 implements MigrationInterface {
    name = 'AddSubscriptions1764906854578'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "subscription_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "price_per_month" numeric(12,2), "max_job_posts" integer, "max_active_job_posts" integer, "max_applications_per_job" integer, "max_applications_total" integer, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2d2df70a81d37c893ef216caf8a" UNIQUE ("code"), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "employers" ADD "active_subscription_plan_id" uuid`);
        await queryRunner.query(`ALTER TABLE "employers" ADD CONSTRAINT "FK_1625ca41132d1858478b8ddd798" FOREIGN KEY ("active_subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employers" DROP CONSTRAINT "FK_1625ca41132d1858478b8ddd798"`);
        await queryRunner.query(`ALTER TABLE "employers" DROP COLUMN "active_subscription_plan_id"`);
        await queryRunner.query(`DROP TABLE "subscription_plans"`);
    }

}

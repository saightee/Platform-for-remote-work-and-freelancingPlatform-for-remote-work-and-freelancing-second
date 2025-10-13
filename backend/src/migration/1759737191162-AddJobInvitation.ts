import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobInvitation1759737191162 implements MigrationInterface {
    name = 'AddJobInvitation1759737191162'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "job_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "job_post_id" uuid NOT NULL, "employer_id" uuid NOT NULL, "job_seeker_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8d4493b182135211f338529950d" UNIQUE ("job_post_id", "job_seeker_id"), CONSTRAINT "PK_301b2c8ccb2cdc4ebff780f454a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "job_invitations" ADD CONSTRAINT "FK_28d7d7d937687b3b96edde743b7" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_invitations" ADD CONSTRAINT "FK_aa4ef2b1cdcc4eb400948813d61" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_invitations" ADD CONSTRAINT "FK_20b912dc09ebdf069facd5bb5b1" FOREIGN KEY ("job_seeker_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_invitations" DROP CONSTRAINT "FK_20b912dc09ebdf069facd5bb5b1"`);
        await queryRunner.query(`ALTER TABLE "job_invitations" DROP CONSTRAINT "FK_aa4ef2b1cdcc4eb400948813d61"`);
        await queryRunner.query(`ALTER TABLE "job_invitations" DROP CONSTRAINT "FK_28d7d7d937687b3b96edde743b7"`);
        await queryRunner.query(`DROP TABLE "job_invitations"`);
    }

}

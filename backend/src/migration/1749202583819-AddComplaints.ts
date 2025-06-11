import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComplaints1749202583819 implements MigrationInterface {
    name = 'AddComplaints1749202583819'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "complaints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "complainant_id" uuid NOT NULL, "job_post_id" uuid, "profile_id" uuid, "reason" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'Pending', "resolution_comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4b7566a2a489c2cc7c12ed076ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "complaints" ADD CONSTRAINT "FK_67d6209e1bfa6e88b0fec80dc29" FOREIGN KEY ("complainant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "complaints" ADD CONSTRAINT "FK_4e6b138c6b3f5100059c5e6b1f4" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "complaints" ADD CONSTRAINT "FK_75c32d0417c81d83dfc10626f42" FOREIGN KEY ("profile_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_75c32d0417c81d83dfc10626f42"`);
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_4e6b138c6b3f5100059c5e6b1f4"`);
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_67d6209e1bfa6e88b0fec80dc29"`);
        await queryRunner.query(`DROP TABLE "complaints"`);
    }

}

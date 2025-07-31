import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToComplaints1753958432357 implements MigrationInterface {
    name = 'AddNewFieldToComplaints1753958432357'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "complaints" ADD "resolver_id" uuid`);
        await queryRunner.query(`ALTER TABLE "complaints" ADD CONSTRAINT "FK_e3b1251ce0a62071796c288e52d" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_e3b1251ce0a62071796c288e52d"`);
        await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN "resolver_id"`);
    }

}

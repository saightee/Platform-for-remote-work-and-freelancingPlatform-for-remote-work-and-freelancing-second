import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFieldToFeedback1755237718339 implements MigrationInterface {
  name = 'AddNewFieldToFeedback1755237718339'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== PLATFORM_FEEDBACK ==========
    // 1) description -> story (не теряем данные)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'platform_feedback' AND column_name = 'description'
        ) THEN
          ALTER TABLE "platform_feedback" RENAME COLUMN "description" TO "story";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'platform_feedback' AND column_name = 'story'
        ) THEN
          ALTER TABLE "platform_feedback" ADD COLUMN "story" text;
        END IF;
      END $$;
    `);

    // 2) role: сначала с DEFAULT, без NOT NULL → бэкап → NOT NULL → DROP DEFAULT
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ADD COLUMN IF NOT EXISTS "role" varchar(20) DEFAULT 'jobseeker';
    `);

    const hasUsers = await queryRunner.hasTable('users');
    const userTable = hasUsers ? 'users' : 'user';
    await queryRunner.query(`
      UPDATE "platform_feedback" pf
      SET "role" = COALESCE(
        (SELECT CASE WHEN u.role IN ('jobseeker','employer') THEN u.role ELSE 'jobseeker' END
         FROM "${userTable}" u WHERE u.id = pf.user_id),
        'jobseeker'
      )
      WHERE pf.role IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ALTER COLUMN "role" SET NOT NULL;
      ALTER TABLE "platform_feedback" ALTER COLUMN "role" DROP DEFAULT;
    `);

    // 3) headline: с DEFAULT '', заполняем из story (обрезаем до 120), затем NOT NULL и убираем DEFAULT
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ADD COLUMN IF NOT EXISTS "headline" varchar(120) DEFAULT '';
    `);
    await queryRunner.query(`
      UPDATE "platform_feedback"
      SET "headline" = LEFT(
        COALESCE(NULLIF("story", ''), 'Success story'),
        120
      )
      WHERE COALESCE("headline",'') = '';
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ALTER COLUMN "headline" SET NOT NULL;
      ALTER TABLE "platform_feedback" ALTER COLUMN "headline" DROP DEFAULT;
    `);

    // 4) story: гарантируем NOT NULL (если только что добавили пустую)
    await queryRunner.query(`
      UPDATE "platform_feedback" SET "story" = COALESCE("story",'');
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ALTER COLUMN "story" SET NOT NULL;
    `);

    // 5) allowed_to_publish / is_public / company / country
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ADD COLUMN IF NOT EXISTS "allowed_to_publish" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ADD COLUMN IF NOT EXISTS "company" varchar(255);
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_feedback" ADD COLUMN IF NOT EXISTS "country" varchar(100);
    `);

    // 6) индекс по публикации
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE c.relname = 'IDX_fd71f2179c61a143aba6916866' AND n.nspname = 'public') THEN
          CREATE INDEX "IDX_fd71f2179c61a143aba6916866" ON "platform_feedback" ("is_public");
        END IF;
      END $$;
    `);

    // ========== FEEDBACK (tech-issue) ==========
    // 7) message -> summary (сохранить данные)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'feedback' AND column_name = 'message'
        ) THEN
          ALTER TABLE "feedback" RENAME COLUMN "message" TO "summary";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'feedback' AND column_name = 'summary'
        ) THEN
          ALTER TABLE "feedback" ADD COLUMN "summary" text;
        END IF;
      END $$;
    `);

    // 8) summary: NOT NULL (после бэкапа)
    await queryRunner.query(`UPDATE "feedback" SET "summary" = COALESCE("summary",'');`);
    await queryRunner.query(`ALTER TABLE "feedback" ALTER COLUMN "summary" SET NOT NULL;`);

    // 9) category: сначала с DEFAULT, потом NOT NULL, затем убрать DEFAULT
    await queryRunner.query(`
      ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "category" varchar(20) DEFAULT 'Other';
    `);
    await queryRunner.query(`
      UPDATE "feedback" SET "category" = 'Other' WHERE "category" IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "feedback" ALTER COLUMN "category" SET NOT NULL;
      ALTER TABLE "feedback" ALTER COLUMN "category" DROP DEFAULT;
    `);

    // 10) steps/expected/actual — nullable
    await queryRunner.query(`ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "steps_to_reproduce" text;`);
    await queryRunner.query(`ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "expected_result" text;`);
    await queryRunner.query(`ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "actual_result" text;`);

    // 11) индекс по category
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE c.relname = 'IDX_7c6f1adbee8888d639dfb1e4db' AND n.nspname = 'public') THEN
          CREATE INDEX "IDX_7c6f1adbee8888d639dfb1e4db" ON "feedback" ("category");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // индексы
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_7c6f1adbee8888d639dfb1e4db"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_fd71f2179c61a143aba6916866"`);

    // feedback: убрать новые поля
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "actual_result"`);
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "expected_result"`);
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "steps_to_reproduce"`);

    // summary -> message (если summary есть)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'feedback' AND column_name = 'summary'
        ) THEN
          ALTER TABLE "feedback" RENAME COLUMN "summary" TO "message";
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "category"`);

    // platform_feedback: снять флаги/доп.поля
    await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN IF EXISTS "country"`);
    await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN IF EXISTS "company"`);
    await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN IF EXISTS "is_public"`);
    await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN IF EXISTS "allowed_to_publish"`);

    // headline обязательное поле — перед откатом делаем его nullable, чтобы не упасть
    await queryRunner.query(`ALTER TABLE "platform_feedback" ALTER COLUMN "headline" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN IF EXISTS "headline"`);

    await queryRunner.query(`ALTER TABLE "platform_feedback" DROP COLUMN IF EXISTS "role"`);

    // story -> description (если story есть)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'platform_feedback' AND column_name = 'story'
        ) THEN
          ALTER TABLE "platform_feedback" RENAME COLUMN "story" TO "description";
        END IF;
      END $$;
    `);
  }
}

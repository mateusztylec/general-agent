-- Add provider column (nullable first for migration)
ALTER TABLE "credentials" ADD COLUMN "provider" text;
--> statement-breakpoint
-- Migrate existing credentials: map old type to new (type, provider)
UPDATE "credentials" SET "type" = 'llm_credentials', "provider" = 'openai' WHERE "type" = 'llm_api_key';
--> statement-breakpoint
UPDATE "credentials" SET "type" = 'sandbox_credentials', "provider" = 'e2b' WHERE "type" = 'e2b_api_key';
--> statement-breakpoint
UPDATE "credentials" SET "type" = 'storage_credentials', "provider" = 'aws_s3' WHERE "type" = 's3_credentials';
--> statement-breakpoint
UPDATE "credentials" SET "type" = 'storage_credentials', "provider" = 'cloudflare_r2' WHERE "type" = 'r2_credentials';
--> statement-breakpoint
UPDATE "credentials" SET "type" = 'storage_credentials', "provider" = 'aws_s3' WHERE "type" = 'aws_credentials';
--> statement-breakpoint
UPDATE "credentials" SET "type" = 'llm_credentials', "provider" = 'openai' WHERE "type" = 'custom' OR "provider" IS NULL;
--> statement-breakpoint
-- Make provider NOT NULL
ALTER TABLE "credentials" ALTER COLUMN "provider" SET NOT NULL;

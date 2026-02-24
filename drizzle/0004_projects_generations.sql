-- Drop old tables (cascade removes dependent data)
DROP TABLE IF EXISTS "generation_jobs" CASCADE;
DROP TABLE IF EXISTS "media_assets" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "chats" CASCADE;

-- Drop old enum
DROP TYPE IF EXISTS "public"."message_role";

-- Create projects table (replaces chats)
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'New Project' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create generations table (replaces messages)
CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"provider" "provider" NOT NULL,
	"generation_type" "generation_type" NOT NULL,
	"model" text NOT NULL,
	"reference_image_path" text,
	"reference_image_mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Recreate media_assets with new foreign keys
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"provider" "provider" NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"file_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Recreate generation_jobs with new foreign keys
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"generation_type" "generation_type" NOT NULL,
	"model" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"provider_job_id" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "generations" ADD CONSTRAINT "generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;

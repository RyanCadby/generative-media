import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const providerEnum = pgEnum("provider", ["gemini", "openai", "runway", "together", "topaz"]);

export const generationTypeEnum = pgEnum("generation_type", [
  "text-to-image",
  "text-to-video",
  "image-to-video",
  "image-upscale",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("New Project"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  provider: providerEnum("provider").notNull(),
  generationType: generationTypeEnum("generation_type").notNull(),
  model: text("model").notNull(),
  referenceImagePath: text("reference_image_path"),
  referenceImageMimeType: text("reference_image_mime_type"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id")
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  provider: providerEnum("provider").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id")
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  generationType: generationTypeEnum("generation_type").notNull(),
  model: text("model"),
  status: jobStatusEnum("status").notNull().default("pending"),
  providerJobId: text("provider_job_id"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  generations: many(generations),
  mediaAssets: many(mediaAssets),
}));

export const generationsRelations = relations(generations, ({ one, many }) => ({
  project: one(projects, { fields: [generations.projectId], references: [projects.id] }),
  mediaAssets: many(mediaAssets),
  generationJobs: many(generationJobs),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  generation: one(generations, {
    fields: [mediaAssets.generationId],
    references: [generations.id],
  }),
  project: one(projects, {
    fields: [mediaAssets.projectId],
    references: [projects.id],
  }),
}));

export const generationJobsRelations = relations(
  generationJobs,
  ({ one }) => ({
    generation: one(generations, {
      fields: [generationJobs.generationId],
      references: [generations.id],
    }),
  })
);

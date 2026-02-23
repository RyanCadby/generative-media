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

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const providerEnum = pgEnum("provider", ["gemini", "openai", "runway", "together"]);

export const generationTypeEnum = pgEnum("generation_type", [
  "text-to-image",
  "text-to-video",
  "image-to-video",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
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
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
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
export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
  mediaAssets: many(mediaAssets),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  mediaAssets: many(mediaAssets),
  generationJobs: many(generationJobs),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  message: one(messages, {
    fields: [mediaAssets.messageId],
    references: [messages.id],
  }),
  chat: one(chats, {
    fields: [mediaAssets.chatId],
    references: [chats.id],
  }),
}));

export const generationJobsRelations = relations(
  generationJobs,
  ({ one }) => ({
    message: one(messages, {
      fields: [generationJobs.messageId],
      references: [messages.id],
    }),
  })
);

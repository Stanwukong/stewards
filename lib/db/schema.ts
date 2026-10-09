import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { nanoid } from "nanoid"

export const bots = pgTable(
  "bots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    // Third-party user ID that owns the bot
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    // Seed for the bot's generated face
    avatar: text("avatar")
      .notNull()
      .$defaultFn(() => nanoid()),
    // What the bot is for, in a phrase
    job: text("job").notNull(),
    // How the bot should go about its job
    instructions: text("instructions"),
    // Third-party sandbox ID, created lazily
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)]
)

// Fields a user may set when creating a bot; the rest are owned by the server
export const insertBotSchema = createInsertSchema(bots, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Give your bot a name.")
      .max(50, "Keep it under 50 characters."),
  avatar: (schema) => schema.min(1),
  job: (schema) =>
    schema
      .trim()
      .min(1, "Give your bot a job.")
      .max(100, "Keep it under 100 characters."),
  instructions: (schema) =>
    schema.trim().max(2000, "Keep it under 2,000 characters."),
}).omit({ id: true, userId: true, sandboxId: true, createdAt: true })

export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert

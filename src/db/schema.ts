import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Anonymous, aggregate-only session log. No names, no contact details:
 * the app needs no login and stores nothing that identifies a caller.
 */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sid: text("sid").notNull().unique(),
  lang: text("lang").notNull(),
  ageBand: text("age_band"),
  gender: text("gender"),
  category: text("category"),
  questions: integer("questions").notNull().default(0),
  eligible: integer("eligible").notNull().default(0),
  maybe: integer("maybe").notNull().default(0),
  conflicts: integer("conflicts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

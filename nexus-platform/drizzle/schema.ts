import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const spatialHubs = mysqlTable("spatial_hubs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  handle: varchar("handle", { length: 80 }).notNull().unique(),
  description: text("description").notNull(),
  visibility: mysqlEnum("visibility", ["members", "invite"]).default("members").notNull(),
  state: mysqlEnum("state", ["active", "paused", "archived"]).default("active").notNull(),
  capacity: int("capacity").default(24).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("spatial_hubs_state_idx").on(table.state),
]);

export const hubPresence = mysqlTable("hub_presence", {
  id: int("id").autoincrement().primaryKey(),
  hubId: int("hubId").notNull(),
  userId: int("userId").notNull(),
  state: mysqlEnum("state", ["active", "away", "left"]).default("active").notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("hub_presence_member_idx").on(table.hubId, table.userId),
  index("hub_presence_state_idx").on(table.hubId, table.state),
]);

export const metaverseDestinations = mysqlTable("metaverse_destinations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  handle: varchar("handle", { length: 80 }).notNull().unique(),
  kind: mysqlEnum("kind", ["browser", "openusd", "custom"]).notNull(),
  launchUrl: varchar("launchUrl", { length: 2048 }).notNull(),
  summary: text("summary").notNull(),
  compatibility: text("compatibility").notNull(),
  status: mysqlEnum("status", ["ready", "degraded", "offline", "pending"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("destinations_status_idx").on(table.status),
]);

export const scenePackages = mysqlTable("scene_packages", {
  id: int("id").autoincrement().primaryKey(),
  destinationId: int("destinationId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  sourceUri: varchar("sourceUri", { length: 2048 }).notNull(),
  format: mysqlEnum("format", ["usd", "usda", "usdc", "usdz", "glb", "other"]).notNull(),
  packageVersion: varchar("packageVersion", { length: 64 }).default("1.0.0").notNull(),
  compatibility: text("compatibility").notNull(),
  reviewState: mysqlEnum("reviewState", ["draft", "reviewed", "approved"]).default("draft").notNull(),
  contentHash: varchar("contentHash", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("scene_packages_destination_idx").on(table.destinationId),
]);

export const integrationHealth = mysqlTable("integration_health", {
  id: int("id").autoincrement().primaryKey(),
  destinationId: int("destinationId").notNull().unique(),
  state: mysqlEnum("state", ["ready", "degraded", "offline", "unknown"]).default("unknown").notNull(),
  detail: varchar("detail", { length: 500 }).notNull(),
  latencyMs: int("latencyMs"),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  lastSuccessAt: timestamp("lastSuccessAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const propagationEvents = mysqlTable("propagation_events", {
  id: int("id").autoincrement().primaryKey(),
  destinationId: int("destinationId").notNull(),
  scenePackageId: int("scenePackageId"),
  createdBy: int("createdBy").notNull(),
  operation: mysqlEnum("operation", ["publish", "synchronize", "health_check", "retry"]).notNull(),
  result: mysqlEnum("result", ["queued", "succeeded", "failed", "partial"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error"]).default("info").notNull(),
  recoverable: mysqlEnum("recoverable", ["yes", "no"]).default("yes").notNull(),
  detail: text("detail").notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => [
  index("propagation_events_destination_idx").on(table.destinationId, table.occurredAt),
]);

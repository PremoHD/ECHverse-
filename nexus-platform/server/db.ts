import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  hubPresence,
  InsertUser,
  integrationHealth,
  metaverseDestinations,
  propagationEvents,
  scenePackages,
  spatialHubs,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function listSpatialHubs() {
  const db = await requireDb();
  return db.select().from(spatialHubs).orderBy(desc(spatialHubs.updatedAt));
}

export async function createSpatialHub(values: typeof spatialHubs.$inferInsert) {
  const db = await requireDb();
  await db.insert(spatialHubs).values(values);
}

export async function markPresence(hubId: number, userId: number, state: "active" | "away" | "left") {
  const db = await requireDb();
  const now = new Date();
  await db.insert(hubPresence).values({ hubId, userId, state, lastSeenAt: now }).onDuplicateKeyUpdate({
    set: { state, lastSeenAt: now },
  });
}

export async function listHubPresence(hubId: number) {
  const db = await requireDb();
  return db.select().from(hubPresence).where(and(eq(hubPresence.hubId, hubId), eq(hubPresence.state, "active")));
}

export async function listDestinations() {
  const db = await requireDb();
  return db.select().from(metaverseDestinations).orderBy(desc(metaverseDestinations.updatedAt));
}

export async function createDestination(values: typeof metaverseDestinations.$inferInsert) {
  const db = await requireDb();
  await db.insert(metaverseDestinations).values(values);
}

export async function listScenePackages() {
  const db = await requireDb();
  return db.select().from(scenePackages).orderBy(desc(scenePackages.updatedAt));
}

export async function createScenePackage(values: typeof scenePackages.$inferInsert) {
  const db = await requireDb();
  await db.insert(scenePackages).values(values);
}

export async function listPropagationEvents() {
  const db = await requireDb();
  return db.select().from(propagationEvents).orderBy(desc(propagationEvents.occurredAt)).limit(80);
}

export async function createPropagationEvent(values: typeof propagationEvents.$inferInsert) {
  const db = await requireDb();
  await db.insert(propagationEvents).values(values);
}

export async function listIntegrationHealth() {
  const db = await requireDb();
  return db.select().from(integrationHealth).orderBy(desc(integrationHealth.checkedAt));
}

export async function upsertIntegrationHealth(values: typeof integrationHealth.$inferInsert) {
  const db = await requireDb();
  await db.insert(integrationHealth).values(values).onDuplicateKeyUpdate({
    set: {
      state: values.state,
      detail: values.detail,
      latencyMs: values.latencyMs,
      checkedAt: values.checkedAt,
      lastSuccessAt: values.lastSuccessAt,
    },
  });
}

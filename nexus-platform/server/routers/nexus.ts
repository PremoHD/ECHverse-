import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const handle = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,80}$/, "Use 3–80 lowercase letters, numbers, or hyphens.");
const url = z.string().url().max(2048);
const labels = z.array(z.string().trim().min(1).max(64)).min(1).max(8);

export const nexusRouter = router({
  safety: publicProcedure.query(() => ({
    financialServiceDiscovery: "context-only",
    livePayments: "not-supported",
    credentialStorage: "not-supported",
    message: "ECHverse Nexus stores interoperability metadata and operational records only. It does not process payments or collect credentials.",
  })),
  spatialHubs: router({
    list: protectedProcedure.query(() => db.listSpatialHubs()),
    create: protectedProcedure.input(z.object({
      name: z.string().trim().min(3).max(120),
      handle,
      description: z.string().trim().min(12).max(1200),
      visibility: z.enum(["members", "invite"]),
      capacity: z.number().int().min(2).max(500),
    })).mutation(async ({ ctx, input }) => {
      await db.createSpatialHub({ ...input, ownerId: ctx.user.id, state: "active" });
      return { success: true };
    }),
    join: protectedProcedure.input(z.object({ hubId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.markPresence(input.hubId, ctx.user.id, "active");
      return { success: true };
    }),
    leave: protectedProcedure.input(z.object({ hubId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.markPresence(input.hubId, ctx.user.id, "left");
      return { success: true };
    }),
    presence: protectedProcedure.input(z.object({ hubId: z.number().int().positive() })).query(({ input }) => db.listHubPresence(input.hubId)),
  }),
  destinations: router({
    list: protectedProcedure.query(async () => {
      const [destinations, health] = await Promise.all([db.listDestinations(), db.listIntegrationHealth()]);
      return destinations.map((destination) => ({ ...destination, compatibility: JSON.parse(destination.compatibility) as string[], health: health.find((item) => item.destinationId === destination.id) ?? null }));
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().trim().min(3).max(120),
      handle,
      kind: z.enum(["browser", "openusd", "custom"]),
      launchUrl: url,
      summary: z.string().trim().min(12).max(1000),
      compatibility: labels,
      status: z.enum(["ready", "degraded", "offline", "pending"]),
    })).mutation(async ({ ctx, input }) => {
      await db.createDestination({ ...input, ownerId: ctx.user.id, compatibility: JSON.stringify(input.compatibility) });
      return { success: true };
    }),
    health: protectedProcedure.query(() => db.listIntegrationHealth()),
    recordHealth: protectedProcedure.input(z.object({
      destinationId: z.number().int().positive(),
      state: z.enum(["ready", "degraded", "offline", "unknown"]),
      detail: z.string().trim().min(8).max(500),
      latencyMs: z.number().int().min(0).max(600000).optional(),
    })).mutation(async ({ input }) => {
      const checkedAt = new Date();
      await db.upsertIntegrationHealth({
        destinationId: input.destinationId,
        state: input.state,
        detail: input.detail,
        latencyMs: input.latencyMs ?? null,
        checkedAt,
        lastSuccessAt: input.state === "ready" ? checkedAt : null,
      });
      return { success: true };
    }),
  }),
  scenePackages: router({
    list: protectedProcedure.query(async () => (await db.listScenePackages()).map((scene) => ({ ...scene, compatibility: JSON.parse(scene.compatibility) as string[] }))),
    create: protectedProcedure.input(z.object({
      destinationId: z.number().int().positive(),
      title: z.string().trim().min(3).max(160),
      sourceUri: url,
      format: z.enum(["usd", "usda", "usdc", "usdz", "glb", "other"]),
      packageVersion: z.string().trim().min(1).max(64),
      compatibility: labels,
      reviewState: z.enum(["draft", "reviewed", "approved"]),
      contentHash: z.string().trim().max(128).optional(),
    })).mutation(async ({ input }) => {
      await db.createScenePackage({ ...input, compatibility: JSON.stringify(input.compatibility), contentHash: input.contentHash || null });
      return { success: true };
    }),
  }),
  propagation: router({
    list: protectedProcedure.query(() => db.listPropagationEvents()),
    record: protectedProcedure.input(z.object({
      destinationId: z.number().int().positive(),
      scenePackageId: z.number().int().positive().optional(),
      operation: z.enum(["publish", "synchronize", "health_check", "retry"]),
      result: z.enum(["queued", "succeeded", "failed", "partial"]),
      severity: z.enum(["info", "warning", "error"]),
      recoverable: z.enum(["yes", "no"]),
      detail: z.string().trim().min(8).max(2000),
    })).mutation(async ({ ctx, input }) => {
      await db.createPropagationEvent({ ...input, createdBy: ctx.user.id, scenePackageId: input.scenePackageId ?? null });
      return { success: true };
    }),
  }),
});

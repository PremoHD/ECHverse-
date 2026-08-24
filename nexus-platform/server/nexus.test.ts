import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listSpatialHubs: vi.fn(async () => []),
  createSpatialHub: vi.fn(async () => undefined),
  markPresence: vi.fn(async () => undefined),
  listHubPresence: vi.fn(async () => []),
  listDestinations: vi.fn(async () => []),
  createDestination: vi.fn(async () => undefined),
  listScenePackages: vi.fn(async () => []),
  createScenePackage: vi.fn(async () => undefined),
  listPropagationEvents: vi.fn(async () => []),
  createPropagationEvent: vi.fn(async () => undefined),
  listIntegrationHealth: vi.fn(async () => []),
  upsertIntegrationHealth: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function memberContext(): TrpcContext {
  return {
    user: { id: 11, openId: "member-11", name: "Member", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ECHverse Nexus server boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes the no-payments safety policy publicly", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.nexus.safety()).resolves.toMatchObject({ livePayments: "not-supported", credentialStorage: "not-supported" });
  });

  it("does not allow anonymous access to member hubs", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.nexus.spatialHubs.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates a spatial hub before any persistence attempt", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.nexus.spatialHubs.create({ name: "A", handle: "not valid", description: "short", visibility: "members", capacity: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createSpatialHub).not.toHaveBeenCalled();
  });

  it("writes a durable hub and member presence state for authenticated members", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.nexus.spatialHubs.create({ name: "Northstar Assembly", handle: "northstar-assembly", description: "A durable place for collaborative world planning.", visibility: "members", capacity: 36 })).resolves.toEqual({ success: true });
    await expect(caller.nexus.spatialHubs.join({ hubId: 17 })).resolves.toEqual({ success: true });
    expect(dbMocks.createSpatialHub).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 11, handle: "northstar-assembly", state: "active" }));
    expect(dbMocks.markPresence).toHaveBeenCalledWith(17, 11, "active");
  });

  it("registers portable destinations and scene packages without credentials", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.nexus.destinations.create({ name: "Harbor Commons", handle: "harbor-commons", kind: "openusd", launchUrl: "https://example.com/harbor", summary: "A portable destination for OpenUSD scene references.", compatibility: ["OpenUSD", "Web"], status: "ready" })).resolves.toEqual({ success: true });
    await expect(caller.nexus.scenePackages.create({ destinationId: 3, title: "Harbor Atrium", sourceUri: "https://assets.example.com/atrium.usdz", format: "usdz", packageVersion: "1.0.0", compatibility: ["OpenUSD", "Web"], reviewState: "reviewed" })).resolves.toEqual({ success: true });
    expect(dbMocks.createDestination).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 11, compatibility: '["OpenUSD","Web"]' }));
    expect(dbMocks.createScenePackage).toHaveBeenCalledWith(expect.objectContaining({ destinationId: 3, contentHash: null, compatibility: '["OpenUSD","Web"]' }));
  });

  it("records propagation outcomes and integration health with recoverable diagnostics", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.nexus.propagation.record({ destinationId: 3, operation: "synchronize", result: "partial", severity: "warning", recoverable: "yes", detail: "USD reference synced; texture payload should be retried." })).resolves.toEqual({ success: true });
    await expect(caller.nexus.destinations.recordHealth({ destinationId: 3, state: "degraded", detail: "Destination accepted metadata but reported delayed asset availability.", latencyMs: 420 })).resolves.toEqual({ success: true });
    expect(dbMocks.createPropagationEvent).toHaveBeenCalledWith(expect.objectContaining({ destinationId: 3, createdBy: 11, recoverable: "yes" }));
    expect(dbMocks.upsertIntegrationHealth).toHaveBeenCalledWith(expect.objectContaining({ destinationId: 3, state: "degraded", latencyMs: 420 }));
  });

  it("validates integration health records before persistence", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.nexus.destinations.recordHealth({ destinationId: 0, state: "ready", detail: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.upsertIntegrationHealth).not.toHaveBeenCalled();
  });
});

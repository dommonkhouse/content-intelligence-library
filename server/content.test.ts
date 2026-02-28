import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { UNAUTHED_ERR_MSG } from "../shared/const";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("tags router", () => {
  it("list returns an array", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.tags.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("articles router", () => {
  it("list returns items and total", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.articles.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("list with search returns filtered results", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.articles.list({
      search: "SaaStr_nonexistent_xyz_12345",
      limit: 10,
      offset: 0,
    });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("get throws NOT_FOUND for invalid id", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.articles.get({ id: 999999 })).rejects.toThrow();
  });

  it("list with favouritesOnly filter works", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.articles.list({
      favouritesOnly: true,
      limit: 10,
      offset: 0,
    });
    expect(Array.isArray(result.items)).toBe(true);
    // All returned items should be favourites
    for (const item of result.items) {
      expect(item.isFavourite).toBe(true);
    }
  });
});

describe("auth router", () => {
  it("me returns null when not authenticated", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("calendar router", () => {
  it("rejects unauthenticated status updates", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.updateStatus({
        articleId: 1,
        format: "video_script",
        status: "in_progress",
      })
    ).rejects.toThrow(UNAUTHED_ERR_MSG);
  });
});

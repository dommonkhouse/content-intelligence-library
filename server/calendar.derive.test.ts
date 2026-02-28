import { describe, expect, it } from "vitest";
import { deriveCalendarData, type CalendarStatus } from "./db";

describe("deriveCalendarData", () => {
  it("marks slots with drafts as in_progress when explicit status is missing", () => {
    const rows = deriveCalendarData(
      [
        {
          id: 1,
          title: "Article 1",
          source: "Example",
          importedAt: new Date("2026-02-28T00:00:00Z"),
        },
      ],
      [],
      [{ articleId: 1, format: "blog_post" }]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.statuses.blog_post).toBe("in_progress");
    expect(rows[0]?.draftCounts.blog_post).toBe(1);
    expect(rows[0]?.statuses.video_script).toBe("untouched");
  });

  it("uses the newest explicit status when duplicate status rows exist", () => {
    const old = new Date("2026-02-27T00:00:00Z");
    const latest = new Date("2026-02-28T00:00:00Z");
    const rows = deriveCalendarData(
      [
        {
          id: 2,
          title: "Article 2",
          source: null,
          importedAt: latest,
        },
      ],
      [
        { articleId: 2, format: "linkedin_post", status: "done" as CalendarStatus, updatedAt: old },
        { articleId: 2, format: "linkedin_post", status: "untouched" as CalendarStatus, updatedAt: latest },
      ],
      [{ articleId: 2, format: "linkedin_post" }]
    );

    expect(rows[0]?.statuses.linkedin_post).toBe("untouched");
    expect(rows[0]?.draftCounts.linkedin_post).toBe(1);
  });

  it("maps legacy blog_outline draft rows into blog_post", () => {
    const rows = deriveCalendarData(
      [
        {
          id: 3,
          title: "Article 3",
          source: "Legacy",
          importedAt: new Date("2026-02-28T00:00:00Z"),
        },
      ],
      [],
      [{ articleId: 3, format: "blog_outline" }]
    );

    expect(rows[0]?.statuses.blog_post).toBe("in_progress");
    expect(rows[0]?.draftCounts.blog_post).toBe(1);
  });
});

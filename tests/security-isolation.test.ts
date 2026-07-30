import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertOwned } from "@/lib/data/ownership";
import { assertJobTransition } from "@/lib/video-jobs/state";

describe("ownership, RLS and job state security", () => {
  it("rejects records belonging to another user", () => {
    expect(() => assertOwned({ id: "job", user_id: "user-b" }, "user-a", "视频任务")).toThrow("无权访问");
  });

  it("rejects invalid job transitions", () => {
    expect(assertJobTransition("submitted", "processing")).toBe("processing");
    expect(() => assertJobTransition("completed", "processing")).toThrow();
  });

  it("migration enables RLS and creates only the product image bucket", () => {
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/202607300001_initial_schema.sql"), "utf8");
    expect(sql).toContain("alter table public.video_jobs enable row level security");
    expect(sql).toContain("video_jobs_select_own");
    expect(sql).toContain("'product-images'");
    expect(sql).not.toContain("generated-videos");
    expect(sql).not.toContain("video_outputs");
  });
});


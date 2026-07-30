import { describe, expect, it } from "vitest";
import { transitionJob } from "@/lib/workflow/state";
import type { GenerationJob } from "@/schemas";

const job: GenerationJob = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  status: "uploaded",
  progress: 5,
  currentMessage: "uploaded",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  provider: "mock",
  artifacts: [],
  outputs: [],
};

describe("workflow state transitions", () => {
  it("supports the complete happy path", () => {
    let current = job;
    for (const [status, progress] of [
      ["analyzing", 10],
      ["scripting", 30],
      ["generating_voice", 45],
      ["composing", 60],
      ["validating", 95],
      ["completed", 100],
    ] as const) current = transitionJob(current, status, progress, status);
    expect(current.status).toBe("completed");
    expect(current.progress).toBe(100);
  });

  it("rejects skipping directly to completed", () => {
    expect(() => transitionJob(job, "completed", 100, "bad")).toThrow("非法任务状态变化");
  });

  it("supports the presenter generation stage", () => {
    const analyzing = transitionJob(job, "analyzing", 10, "analysis");
    const scripting = transitionJob(analyzing, "scripting", 30, "script");
    const presenter = transitionJob(scripting, "generating_presenter", 40, "presenter");
    expect(transitionJob(presenter, "generating_voice", 55, "voice").status).toBe("generating_voice");
  });
});

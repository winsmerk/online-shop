import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "@/lib/env-schema";

describe("server environment validation", () => {
  it("defaults to Mock video and rejects invalid provider values", () => {
    expect(serverEnvSchema.parse({}).VIDEO_PROVIDER).toBe("mock");
    expect(serverEnvSchema.safeParse({ VIDEO_PROVIDER: "private-browser-api" }).success).toBe(false);
  });

  it("rejects invalid Supabase and app URLs", () => {
    expect(serverEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }).success).toBe(false);
    expect(serverEnvSchema.safeParse({ APP_URL: "javascript:alert(1)" }).success).toBe(false);
  });
});

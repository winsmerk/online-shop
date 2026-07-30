import { describe, expect, it } from "vitest";
import { passwordSchema, usernameSchema, usernameToInternalEmail } from "@/lib/auth/identity";

describe("username and password authentication input", () => {
  it("normalizes a username to a non-public internal auth email", () => {
    expect(usernameToInternalEmail("Admin_01")).toBe("admin_01@users.invalid");
  });

  it("rejects unsafe usernames and short passwords", () => {
    expect(usernameSchema.safeParse("../admin").success).toBe(false);
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
  });
});


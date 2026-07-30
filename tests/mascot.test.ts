import { describe, expect, it } from "vitest";
import { mascotFilters, resolveMascotMotion } from "@/lib/video/mascot";
import type { VideoConcept } from "@/schemas";

const concept = (style: VideoConcept["style"]) => ({ style }) as VideoConcept;

describe("local animal mascot motions", () => {
  it.each(["bounce", "slide_in", "sway", "pulse", "peek"] as const)("builds the %s FFmpeg motion", (motion) => {
    const result = mascotFilters(4, "[base]", "[out]", motion, 15);
    expect(result.inputFilter).toContain("[4:v]");
    expect(result.overlayFilter).toContain("overlay=");
    expect(result.overlayFilter).toContain("between(t,0.2,14.8)");
  });

  it("selects distinct automatic motions by creative style", () => {
    expect(resolveMascotMotion("auto", concept("pain_point"))).toBe("bounce");
    expect(resolveMascotMotion("auto", concept("core_benefit"))).toBe("slide_in");
    expect(resolveMascotMotion("auto", concept("usage_scene"))).toBe("sway");
  });
});

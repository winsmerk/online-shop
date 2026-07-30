import { describe, expect, it } from "vitest";
import { buildSceneCommand, motionFilter } from "@/lib/video/ffmpeg";

describe("FFmpeg command generation", () => {
  it.each(["push_in", "pull_out", "pan_left_to_right", "pan_right_to_left", "detail_zoom", "fade"])(
    "builds a safe %s motion filter",
    (motion) => {
      const filter = motionFilter(motion, 4);
      expect(filter).toContain("1080:1920");
      expect(filter).toContain("force_original_aspect_ratio");
      expect(filter).toContain("zoompan");
    },
  );

  it("keeps paths as separate spawn arguments", () => {
    const args = buildSceneCommand("/tmp/user image.jpg", "/tmp/out.mp4", "push_in", 3);
    expect(args).toContain("/tmp/user image.jpg");
    expect(args.join(" ")).not.toContain("sh -c");
    expect(args).toContain("libx264");
  });
});

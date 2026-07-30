import type { VideoConcept } from "@/schemas";

export type MascotMotion = "bounce" | "slide_in" | "sway" | "pulse" | "peek";

export function resolveMascotMotion(configured: MascotMotion | "auto", concept: VideoConcept): MascotMotion {
  if (configured !== "auto") return configured;
  if (concept.style === "pain_point") return "bounce";
  if (concept.style === "core_benefit") return "slide_in";
  return "sway";
}

export function mascotFilters(inputIndex: number, current: string, output: string, motion: MascotMotion, duration: number) {
  const prepared = "[mascotPrepared]";
  const safeEnd = Math.max(duration - 0.2, 0.5);
  const baseScale = motion === "pulse"
    ? `scale=w='245*(1+0.055*sin(3*t))':h=-1:eval=frame`
    : "scale=250:-1";
  const rotate = motion === "sway"
    ? ",rotate='0.09*sin(2.4*t)':ow=rotw(iw):oh=roth(ih):c=none"
    : "";
  const inputFilter = `[${inputIndex}:v]${baseScale},format=rgba${rotate}${prepared}`;
  const position = {
    bounce: { x: "55", y: "H-h-620-abs(sin(t*3.2))*55" },
    slide_in: { x: "if(lt(t,2),W-(t/2)*(w+70),W-w-55)", y: "H-h-620" },
    sway: { x: "55+20*sin(t*1.7)", y: "H-h-620" },
    pulse: { x: "W-w-55", y: "H-h-620" },
    peek: { x: "if(lt(mod(t,6),2),W-w*0.62,W-w-35)", y: "H-h-650" },
  }[motion];
  const overlayFilter = `${current}${prepared}overlay=x='${position.x}':y='${position.y}':enable='between(t,0.2,${safeEnd})'${output}`;
  return { inputFilter, overlayFilter };
}

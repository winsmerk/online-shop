import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("min-h-11 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-black/35 focus:border-coral focus:ring-2 focus:ring-coral/15", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";


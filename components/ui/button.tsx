import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-ink px-5 py-3 text-white hover:bg-coral",
        outline: "border border-black/15 bg-white px-5 py-3 text-ink hover:border-coral hover:text-coral",
        ghost: "px-4 py-2 hover:bg-black/5",
        danger: "bg-red-600 px-5 py-3 text-white hover:bg-red-700",
      },
      size: {
        default: "min-h-11",
        sm: "min-h-9 px-3 py-2",
        lg: "min-h-12 px-7 py-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}


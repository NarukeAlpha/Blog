import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@studio/lib/utils";
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "glass-subtle text-primary",
        secondary: "glass-subtle text-secondary-foreground",
        outline: "border border-white/30 bg-white/20 text-muted-foreground backdrop-blur-sm",
        success: "bg-success/12 text-success backdrop-blur-sm border border-success/20",
        warning: "bg-warning/12 text-warning backdrop-blur-sm border border-warning/20",
        destructive: "bg-destructive/12 text-destructive backdrop-blur-sm border border-destructive/20"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };

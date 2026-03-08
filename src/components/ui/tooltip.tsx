import * as React from "react";
import { cn } from "@/lib/utils";

// Simplified tooltip that avoids @radix-ui/react-tooltip React version mismatch

const TooltipProvider = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return <>{children}</>;
};

const Tooltip = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return <>{children}</>;
};

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  if (asChild) {
    return <>{children}</>;
  }
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number; side?: string; [key: string]: any }
>(({ className, sideOffset, side, children, hidden, ...props }, ref) => {
  return null;
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

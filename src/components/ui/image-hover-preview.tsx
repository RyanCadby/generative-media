"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

interface ImageHoverPreviewProps {
  src: string;
  alt: string;
  /** Classes for the small trigger image */
  className?: string;
  /** Classes for the enlarged preview image */
  previewClassName?: string;
}

/**
 * A small image that shows an enlarged preview on hover. Rendered in a
 * portal so it escapes overflow-hidden/scroll containers.
 */
export function ImageHoverPreview({
  src,
  alt,
  className,
  previewClassName,
}: ImageHoverPreviewProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <img src={src} alt={alt} className={cn("cursor-zoom-in", className)} />
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            sideOffset={8}
            collisionPadding={12}
            className="z-50 overflow-hidden rounded-lg border bg-popover shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
          >
            <img
              src={src}
              alt={alt}
              className={cn(
                "max-w-[320px] max-h-[320px] object-contain",
                previewClassName
              )}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

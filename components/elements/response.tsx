"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, components, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_li>div]:my-0 [&_li>p]:my-0 [&_li]:my-1.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6",
        className
      )}
      components={{
        // Override the 'p' tag to render as a 'div' to prevent hydration errors
        // caused by block-level elements (like image wrappers) nesting inside paragraphs.
        p: ({ children, ...rest }: any) => (
          <div {...rest} className={cn("mb-4", rest.className)}>
            {children}
          </div>
        ),
        // Spread any other custom components passed down via props
        ...components,
      }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";

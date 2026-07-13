"use client";

import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVisibilityState } from "@/hooks/use-chat-visibility";
import { cn } from "@/lib/utils";
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
  ShareIcon,
} from "./icons";

export type VisibilityType = "private" | "public";

const visibilities: Array<{
  id: VisibilityType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "private",
    label: "Private",
    description: "Only you can access this chat",
    icon: <LockIcon />,
  },
  {
    id: "public",
    label: "Public",
    description: "Anyone with the link can access this chat",
    icon: <GlobeIcon />,
  },
];

export function VisibilitySelector({
  chatId,
  className,
  selectedVisibilityType,
  globalUpdateChatVisibilityAction,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  globalUpdateChatVisibilityAction?: (payload: {
    chatId: string;
    visibility: VisibilityType;
  }) => Promise<void>;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { visibilityType, setVisibilityType } = useVisibilityState({
    chatId,
    initialVisibilityType: selectedVisibilityType,
    globalUpdateChatVisibilityAction,
  });

  const copyShareLink = (silent = false) => {
    const url = `${window.location.host === "localhost:3000" ? "http" : "https"}://${window.location.host}/chat/${chatId}`;
    navigator.clipboard.writeText(url);
    if (!silent) {
      toast.success("Link copied to clipboard");
    }
  };

  const handleVisibilityChange = async (
    updatedVisibilityType: VisibilityType
  ) => {
    if (updatedVisibilityType === visibilityType) {
      if (updatedVisibilityType === "public") {
        copyShareLink();
        setOpen(false);
      }
      return;
    }

    setIsUpdating(true);

    try {
      // Note: we MUST await the visibility update for the "Generating link" feel
      await setVisibilityType(updatedVisibilityType);

      if (updatedVisibilityType === "public") {
        copyShareLink(true); // copy silently first
        toast.success("Link generated and copied!");
      } else {
        toast.success("Chat is now Private");
      }
    } catch (_error) {
      toast.error("Failed to update visibility");
    } finally {
      setIsUpdating(false);
      setOpen(false);
    }
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button
          className="flex h-8 items-center gap-1.5 px-2.5 py-1 md:h-fit md:gap-2 md:px-3 md:py-1.5"
          data-testid="visibility-selector"
          disabled={isUpdating}
          variant="outline"
        >
          {isUpdating ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <ShareIcon size={14} />
          )}
          <span className="font-medium text-xs md:text-sm">
            {isUpdating ? "Generating link..." : "Share"}
          </span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[300px] p-2">
        <div className="px-2 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Chat Visibility
        </div>
        {visibilities.map((visibility) => (
          <DropdownMenuItem
            className="group/item flex cursor-pointer flex-row items-center justify-between gap-4 p-2 transition-colors"
            data-active={visibility.id === visibilityType}
            data-testid={`visibility-selector-item-${visibility.id}`}
            disabled={isUpdating}
            key={visibility.id}
            onSelect={() => handleVisibilityChange(visibility.id)}
          >
            <div className="flex flex-row items-center gap-3">
              <div className="text-muted-foreground transition-colors group-data-[active=true]/item:text-primary">
                {visibility.icon}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-medium text-sm">{visibility.label}</span>
                <div className="text-muted-foreground text-xs leading-tight">
                  {visibility.description}
                </div>
              </div>
            </div>
            <div className="text-primary opacity-0 transition-opacity group-data-[active=true]/item:opacity-100">
              <CheckCircleFillIcon />
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-2" />

        <div className="px-2 pb-2">
          <Button
            className="h-9 w-full justify-center gap-2 border-none bg-primary/10 text-primary hover:bg-primary/20"
            disabled={visibilityType === "private" || isUpdating}
            onClick={() => copyShareLink()}
            variant="ghost"
          >
            {isUpdating ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <ShareIcon size={14} />
            )}
            {isUpdating
              ? "Generating link..."
              : visibilityType === "private"
                ? "Set to Public to Share"
                : "Copy Link"}
          </Button>
          {visibilityType === "private" && !isUpdating && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Sharing is disabled while the chat is Private.
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ToolPartProps } from "@/lib/a2ui/types";

const PAGE_SIZES = [20, 50, 100, 250] as const;

type LawyerRow = {
  id?: string;
  _id?: string;
  name?: string;
  specializations?: string[] | string;
  experience?: string | number;
  state?: string;
  city?: string;
  bio?: string;
  profileImage?: string;
  isAvailable?: boolean;
  isLive?: boolean;
  rating?: string | number;
};

type LawyerDirectoryResponse = {
  lawyers?: LawyerRow[];
  total?: number;
  count?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
};

function getLawyerId(lawyer: LawyerRow) {
  return lawyer.id || lawyer._id || "";
}

function getSpecializations(specs: LawyerRow["specializations"]): string[] {
  if (Array.isArray(specs)) return specs;
  if (typeof specs === "string") {
    try {
      const parsed = JSON.parse(specs);
      return Array.isArray(parsed) ? parsed : [specs];
    } catch {
      return [specs];
    }
  }
  return [];
}

function getLocation(lawyer: LawyerRow) {
  return (
    [lawyer.city, lawyer.state].filter(Boolean).join(", ") ||
    "Location not listed"
  );
}

function LawyerDirectoryPanel({
  open,
  onOpenChange,
  searchQuery,
  initialCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery?: string;
  initialCount?: number;
}) {
  const router = useRouter();
  const [lawyers, setLawyers] = useState<LawyerRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20);
  const [total, setTotal] = useState(initialCount || 0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  const fetchLawyers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/lawyers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load lawyers");

      const data: LawyerDirectoryResponse = await res.json();
      const rows = data.lawyers || [];
      setLawyers(rows);
      setTotal(data.total ?? data.count ?? initialCount ?? rows.length);
      setHasMore(data.hasMore ?? rows.length === pageSize);
    } catch (error) {
      console.error("Failed to load lawyer directory:", error);
      toast.error("Failed to load lawyers. Please try again.");
      setLawyers([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, initialCount]);

  useEffect(() => {
    if (open) {
      fetchLawyers();
    }
  }, [open, fetchLawyers]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery]);

  const handleConnect = useCallback(
    async (lawyer: LawyerRow) => {
      const lawyerId = getLawyerId(lawyer);
      if (!lawyerId) return;

      setConnectingTo(lawyerId);
      try {
        const res = await fetch("/api/live-chats/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lawyerId }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error === "LIMIT_REACHED") {
            toast.error(data.message || "Consultation limit reached.", {
              action: {
                label: "Upgrade Plan",
                onClick: () => router.push("/upgrade"),
              },
            });
            return;
          }
          if (data.error === "ACTIVE_REQUEST_EXISTS") {
            toast.info(data.message || "Resuming your active consultation...");
            router.push(`/live-chat/${data.sessionId}`);
            return;
          }
          toast.error(data.message || data.error || "Failed to connect.");
          return;
        }

        router.push(`/live-chat/${data.sessionId}`);
        onOpenChange(false);
      } catch (error) {
        console.error("Connection failed:", error);
        toast.error("Failed to connect to lawyer. Please try again.");
      } finally {
        setConnectingTo(null);
      }
    },
    [onOpenChange, router]
  );

  const showingStart = lawyers.length ? (page - 1) * pageSize + 1 : 0;
  const showingEnd = (page - 1) * pageSize + lawyers.length;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-[100dvh] w-[100dvw] max-w-[100dvw] flex-col gap-0 p-0 sm:w-[92vw] sm:max-w-2xl lg:max-w-4xl">
        <SheetHeader className="border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-2.5 pr-10 sm:gap-3 sm:pr-12">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
              <Scale className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">Verified Lawyers</SheetTitle>
              <SheetDescription className="line-clamp-2 break-words">
                {searchQuery
                  ? `Matched for "${searchQuery}"`
                  : "Browse verified legal professionals"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:gap-3 sm:px-5">
          <div className="min-w-0 text-muted-foreground text-sm">
            {isLoading
              ? "Loading lawyers..."
              : `Showing ${showingStart}-${showingEnd} of ${total || showingEnd}`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Rows</span>
            <Select
              onValueChange={(value) =>
                setPageSize(Number(value) as (typeof PAGE_SIZES)[number])
              }
              value={String(pageSize)}
            >
              <SelectTrigger className="h-8 w-[92px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading verified lawyers...
            </div>
          ) : lawyers.length ? (
            <div className="divide-y overflow-hidden rounded-xl border">
              {lawyers.map((lawyer) => {
                const lawyerId = getLawyerId(lawyer);
                const specs = getSpecializations(lawyer.specializations);
                const isAvailable = lawyer.isAvailable || lawyer.isLive;
                const isConnecting = connectingTo === lawyerId;

                return (
                  <div
                    className="grid min-w-0 gap-3 p-3 transition-colors hover:bg-muted/40 sm:p-4 md:grid-cols-[auto_1fr_auto]"
                    key={lawyerId || lawyer.name}
                  >
                    <div className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                      {lawyer.profileImage ? (
                        <img
                          alt={lawyer.name || "Lawyer"}
                          className="size-full object-cover"
                          src={lawyer.profileImage}
                        />
                      ) : (
                        <User className="size-5 text-primary" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-sm">
                          {lawyer.name || "Verified Lawyer"}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full border bg-emerald-50 px-2 py-0.5 font-medium text-[11px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <ShieldCheck className="size-3" />
                          Verified
                        </span>
                        {isAvailable && (
                          <span className="rounded-full border bg-green-50 px-2 py-0.5 font-medium text-[11px] text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                            Available
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="size-3" />
                          {specs[0] || "General Practice"}
                          {specs.length > 1 ? ` +${specs.length - 1}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {getLocation(lawyer)}
                        </span>
                        {lawyer.experience ? (
                          <span>{lawyer.experience} yrs exp.</span>
                        ) : null}
                      </div>
                      {lawyer.bio ? (
                        <p className="mt-2 line-clamp-2 text-muted-foreground text-xs">
                          {lawyer.bio}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-lg border px-3 font-medium text-sm hover:bg-muted"
                        href={`/lawyers/${lawyerId}`}
                      >
                        Profile
                      </Link>
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 font-semibold text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
                        disabled={Boolean(connectingTo)}
                        onClick={() => handleConnect(lawyer)}
                        type="button"
                      >
                        {isConnecting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Phone className="size-4" />
                        )}
                        Connect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <Users className="mb-3 size-8 text-muted-foreground" />
              <p className="font-semibold">No lawyers found</p>
              <p className="mt-1 max-w-sm text-muted-foreground text-sm">
                Try a broader practice area, state, or city.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <span className="text-muted-foreground text-sm">Page {page}</span>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasMore || isLoading}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FindLawyerTool({ toolCallId, state, output }: ToolPartProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const isLoading =
    !output ||
    ["call", "partial-call", "input-streaming", "input-available"].includes(
      state
    );

  const count = output?.total ?? output?.count ?? output?.lawyers?.length ?? 0;
  const searchQuery = output?.query || "";
  const title = useMemo(() => {
    if (isLoading) return "Finding verified lawyers";
    if (count === 0) return "No verified lawyer matches yet";
    return `${count} verified lawyer${count === 1 ? "" : "s"} found`;
  }, [count, isLoading]);

  if (output && "error" in output && !output.lawyers?.length) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        key={toolCallId}
      >
        Lawyer search could not finish. Please try again.
      </div>
    );
  }

  return (
    <div className="my-3 w-full max-w-full sm:max-w-xl" key={toolCallId}>
      <div className="flex flex-col items-stretch gap-3 rounded-xl border bg-card/80 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 sm:size-10 sm:rounded-xl dark:bg-emerald-950/30 dark:text-emerald-300">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm">{title}</p>
            <p className="truncate text-muted-foreground text-xs">
              {searchQuery
                ? `Matched for "${searchQuery}"`
                : "Open the directory to browse and connect"}
            </p>
          </div>
        </div>
        <button
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 font-semibold text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          disabled={isLoading || count === 0}
          onClick={() => setIsPanelOpen(true)}
          type="button"
        >
          <Users className="size-4" />
          See lawyers
        </button>
      </div>

      <LawyerDirectoryPanel
        initialCount={count}
        onOpenChange={setIsPanelOpen}
        open={isPanelOpen}
        searchQuery={searchQuery}
      />
    </div>
  );
}

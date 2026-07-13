"use client";

import { ExternalLink, Globe, Search, Sparkles, Timer } from "lucide-react";
import { useState } from "react";
import { CitationList } from "@/components/tool-ui/citation";
import { ProgressTracker } from "@/components/tool-ui/progress-tracker";
import type { TavilySearchResponse } from "@/lib/ai/tools/web-search";

interface WebSearchResultsProps {
    output: TavilySearchResponse & { executionTimeMs?: number };
    state: "input-available" | "output-available";
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function ImageCard({ url, description, onClick }: { url: string; description?: string; onClick: () => void }) {
    const [errored, setErrored] = useState(false);
    if (errored) return null;

    return (
        <div
            className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:border-foreground/20 cursor-zoom-in"
            onClick={onClick}
        >
            <img
                src={url}
                alt={description ?? "Search result image"}
                onError={() => setErrored(true)}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {description && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-white text-xs line-clamp-2">{description}</p>
                </div>
            )}
        </div>
    );
}

function ImageDialog({ url, description, onClose }: { url: string; description?: string; onClose: () => void }) {
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl border-border bg-card p-4 shadow-2xl rounded-2xl overflow-hidden gap-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Image Preview</DialogTitle>
                    <DialogDescription>{description ?? "Web search result detail"}</DialogDescription>
                </DialogHeader>
                <div className="relative flex flex-col items-center gap-4 mt-2">
                    <img
                        src={url}
                        alt={description ?? "Preview"}
                        className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
                    />
                    {description && (
                        <p className="text-muted-foreground text-sm text-center px-4 mb-2">{description}</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function WebSearchResults({ output, state }: WebSearchResultsProps) {
    const [showAllSources, setShowAllSources] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string; description?: string } | null>(null);

    const images = output.images?.slice(0, 5) ?? [];
    const hasImages = images.length > 0;
    const visibleSources = showAllSources ? output.results : output.results.slice(0, 3);

    if (state === "input-available") {
        return (
            <div className="w-full max-w-[500px] my-4 animate-in fade-in zoom-in-95 duration-300">
                <ProgressTracker.Live
                    id="search-live"
                    elapsedTime={0}
                    steps={[
                        { id: "s1", label: "Connecting to online legal databases", status: "completed" },
                        {
                            id: "s2",
                            label: "Scanning live web sources",
                            status: "in-progress",
                            description: output.query ? `Query: "${output.query}"` : "Executing search parameters..."
                        },
                        { id: "s3", label: "Extracting facts, citations & images", status: "pending" },
                    ]}
                />
            </div>
        );
    }

    const citationItems = visibleSources.map((r, i) => {
        const domain = (() => {
            try { return new URL(r.url).hostname.replace(/^www\./, ""); }
            catch { return r.url; }
        })();
        return {
            id: `result-${i}`,
            href: r.url,
            title: r.title,
            snippet: r.content.slice(0, 200),
            domain,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            publishedAt: r.published_date,
            type: "webpage" as const,
        };
    });

    return (
        <>
            <div className="my-3 flex flex-col gap-4 w-full max-w-full lg:max-w-[700px] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Globe className="size-4" />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-foreground uppercase tracking-wider">Web Search</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{output.query}</p>
                        </div>
                    </div>
                    {output.executionTimeMs && (
                        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground border border-border/50 shadow-sm">
                            <Timer className="size-3" />
                            <span>Searched {output.results.length} sites in {(output.executionTimeMs / 1000).toFixed(2)}s</span>
                        </div>
                    )}
                </div>

                {/* AI Summary Answer */}
                {output.answer && (
                    <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-transparent p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                            <Sparkles className="size-3.5 text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Summary</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{output.answer}</p>
                    </div>
                )}

                {/* Inline Images Grid (Max 5) */}
                {hasImages && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                        {images.map((img, i) => (
                            <ImageCard
                                key={i}
                                url={img.url}
                                description={img.description}
                                onClick={() => setSelectedImage({ url: img.url, description: img.description })}
                            />
                        ))}
                    </div>
                )}

                {/* Sources */}
                <div className="w-full">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ExternalLink className="size-3" />
                        Sources ({output.results.length})
                    </p>
                    <CitationList
                        id="citation-list"
                        citations={citationItems}
                        variant="stacked"
                    />

                    {output.results.length > 3 && (
                        <button
                            onClick={() => setShowAllSources((p) => !p)}
                            className="mt-3 text-xs font-medium text-primary hover:underline"
                        >
                            {showAllSources ? "Show fewer" : `Show ${output.results.length - 3} more sources`}
                        </button>
                    )}
                </div>
            </div>

            {/* Image Lightbox Dialog */}
            {selectedImage && (
                <ImageDialog
                    url={selectedImage.url}
                    description={selectedImage.description}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </>
    );
}

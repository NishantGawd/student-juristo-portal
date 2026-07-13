"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Scale,
    Loader2,
    User,
    CheckCircle,
    Store,
    IndianRupee,
    ClockIcon,
    ExternalLink,
    ChevronDown,
    Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

type LawyerData = {
    _id: string;
    id?: string;
    name: string;
    specializations: string[] | string;
    experience: string;
    rating?: string;
    isAvailable?: boolean;
    state?: string;
    profileImage?: string;
    hourlyRate?: string;
    bio?: string;
};

const PAGE_LIMIT = 10;

const GRADIENTS = [
    "from-zinc-900 to-black",
    "from-neutral-900 to-zinc-950",
    "from-zinc-900 to-neutral-950",
    "from-gray-900 to-black",
];

export function ContractNextSteps({
    contractSlug,
    templateName,
    price,
    documentId,
    paymentRequired = false,
    lawyerMarketplaceUrl,
}: {
    contractSlug: string;
    templateName: string;
    price?: number;
    documentId?: string;
    paymentRequired?: boolean;
    lawyerMarketplaceUrl?: string;
}) {
    const router = useRouter();
    const [showLawyers, setShowLawyers] = useState(false);
    const [lawyers, setLawyers] = useState<LawyerData[]>([]);
    const [loadingLawyers, setLoadingLawyers] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [hasPaid, setHasPaid] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const marketplaceUrl = lawyerMarketplaceUrl || "https://lawyer.juristo.in";

    const fetchLawyers = useCallback(async (pageNum: number, append = false) => {
        if (pageNum === 1) setLoadingLawyers(true);
        else setLoadingMore(true);
        try {
            const res = await fetch(`/api/lawyers/available?limit=${PAGE_LIMIT}&page=${pageNum}`);
            if (!res.ok) throw new Error("Failed to fetch lawyers");
            const data = await res.json();
            const fetched: LawyerData[] = data.lawyers || [];
            setLawyers(prev => append ? [...prev, ...fetched] : fetched);
            setHasMore(data.hasMore ?? fetched.length === PAGE_LIMIT);
        } catch (error) {
            console.error("Error fetching online lawyers:", error);
        } finally {
            setLoadingLawyers(false);
            setLoadingMore(false);
        }
    }, []);

    const handleFindLawyers = async () => {
        if (showLawyers) {
            setShowLawyers(false);
            return;
        }
        setShowLawyers(true);
        setPage(1);
        fetchLawyers(1, false);
    };

    const handleLoadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchLawyers(next, true);
    };

    const handleSelectLawyer = async (lawyer: LawyerData) => {
        const lid = lawyer._id || lawyer.id || "";
        setSubmitting(lid);
        try {
            const res = await fetch("/api/live-chats/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lawyerId: lid, hourlyRate: lawyer.hourlyRate || "1000" }),
            });
            if (!res.ok) {
                const data = await res.json();
                if (data.error === "LIMIT_REACHED") {
                    setSubmitting(null);
                    toast.error(data.message || "Consultation limit reached.", {
                        action: {
                            label: "Upgrade Plan",
                            onClick: () => router.push("/upgrade")
                        }
                    });
                    return;
                }
                if (data.error === "PENDING_REQUEST_EXISTS") {
                    setSubmitting(null);
                    toast.error(data.message || "You already have a pending chat request.");
                    return;
                }
                if (data.error === "ACTIVE_REQUEST_EXISTS") {
                    setSubmitting(null);
                    toast.info(data.message || "Resuming your active consultation...");
                    router.push(`/live-chat/${data.sessionId}`);
                    return;
                }
                throw new Error(data.error || data.message || "Failed to initiate live chat");
            }
            const { sessionId } = await res.json();
            setSubmitting(null);
            router.push(`/live-chat/${sessionId}`);
        } catch (error) {
            console.error("Error starting chat:", error);
            setSubmitting(null);
        }
    };

    const getSpecializations = (specs: string[] | string): string[] => {
        if (!specs) return [];
        if (Array.isArray(specs)) return specs;
        if (typeof specs === "string") {
            try { return JSON.parse(specs); } catch { return [specs]; }
        }
        return [];
    };

    return (
        <>
            <div className="bg-muted/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 mt-8 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <Scale className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">Next Steps: Get it Legally Vetted</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Your AI-drafted contract ({templateName}) is ready. Have it reviewed by a verified legal professional.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleFindLawyers}
                                className={`gap-2 shadow-sm transition-all ${showLawyers ? 'bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 cursor-pointer dark:text-black dark:hover:bg-zinc-300' : ''}`}
                            >
                                {showLawyers ? <>Hide Lawyers</> : <><User className="w-4 h-4 cursor-pointer" />Find Online Lawyers</>}
                            </Button>

                            {/* {!paymentRequired || hasPaid ? (
                                <Button variant="outline" asChild className="gap-2 bg-white dark:bg-zinc-900">
                                    <Link href={`/contracts/${contractSlug}`}>
                                        <ExternalLink className="w-4 h-4" />
                                        View Full Document
                                    </Link>
                                </Button>
                            ) : (
                                <RazorpayButton
                                    type="contract"
                                    itemId={documentId || contractSlug}
                                    itemName={`AI Draft: ${templateName}`}
                                    amount={price || 299}
                                    onSuccess={() => setHasPaid(true)}
                                    className="gap-2 bg-[#2b84ea] hover:bg-[#1a65b8] text-white border-none shadow-sm"
                                >
                                    <IndianRupee className="w-4 h-4" />
                                    Pay ₹{price || 299} to Download
                                </RazorpayButton>
                            )} */}

                            <Button variant="ghost" asChild className="gap-2 hidden sm:flex">
                                <Link href={marketplaceUrl} target="_blank">
                                    <Store className="w-4 h-4" />
                                    Browse Marketplace
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE ONLINE LAWYERS PANEL */}
                {showLawyers && (
                    <div className="mt-2 border-t pt-5 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold flex items-center gap-2">
                                Available for Live Chat
                                <span className="relative flex h-2.5 w-2.5 ml-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                </span>
                            </h4>
                            {lawyers.length > 0 && (
                                <span className="text-xs text-muted-foreground">{lawyers.length} online</span>
                            )}
                        </div>

                        {loadingLawyers ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="rounded-2xl min-h-[240px] animate-pulse bg-muted" />
                                ))}
                            </div>
                        ) : lawyers.length === 0 ? (
                            <div className="flex flex-col items-center text-center py-10 px-4 bg-muted/20 rounded-xl border border-dashed">
                                <ClockIcon className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                                <p className="text-sm font-medium">No lawyers are currently online.</p>
                                <p className="text-xs text-muted-foreground mt-1">Please try again later or browse the directory.</p>
                            </div>
                        ) : (
                            <>
                                {/* Scrollable Grid */}
                                <div
                                    ref={scrollRef}
                                    className="max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                                >
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full pb-1">
                                        {lawyers.map((lawyer, idx) => {
                                            const lid = lawyer._id || lawyer.id || "";
                                            const specs = getSpecializations(lawyer.specializations);
                                            const isConnecting = submitting === lid;
                                            const gradient = GRADIENTS[idx % GRADIENTS.length];
                                            return (
                                                <div
                                                    key={lid}
                                                    className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 min-h-[260px]"
                                                >
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                                                    <div className="absolute inset-0 backdrop-blur-[2px]" />
                                                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                                                        <span className="size-1.5 rounded-full bg-white animate-pulse" />
                                                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">Online</span>
                                                    </div>
                                                    <div className="relative z-10 flex flex-col h-full p-3.5 gap-2">
                                                        <div className="size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border-2 border-white/30 shrink-0">
                                                            {lawyer.profileImage ? (
                                                                <img src={lawyer.profileImage} alt={lawyer.name} className="size-full object-cover" />
                                                            ) : (
                                                                <User className="size-5 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-1">
                                                                <p className="font-bold text-white text-sm leading-tight line-clamp-1">{lawyer.name}</p>
                                                                <CheckCircle className="size-3 text-white/80 shrink-0" />
                                                            </div>
                                                            <p className="text-white/75 text-[11px] mt-0.5 line-clamp-1">{specs[0] || "General Practice"}</p>
                                                            <p className="text-white/60 text-[10px] mt-0.5">{lawyer.experience}y exp</p>
                                                            {lawyer.rating && parseFloat(lawyer.rating) > 0 && (
                                                                <div className="flex items-center gap-0.5 mt-1">
                                                                    <Star className="size-3 fill-yellow-300 text-yellow-300" />
                                                                    <span className="text-white/80 text-[10px] font-semibold">{parseFloat(lawyer.rating).toFixed(1)}</span>
                                                                </div>
                                                            )}
                                                            {lawyer.hourlyRate && <p className="text-white font-bold text-xs mt-1.5">₹{lawyer.hourlyRate}/hr</p>}
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 mt-auto">
                                                            <a
                                                                href={`https://lawyer.juristo.in/lawyers/${lid}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[11px] font-semibold rounded-xl py-2 transition-colors border border-white/20"
                                                            >
                                                                View
                                                            </a>
                                                            <button
                                                                className="w-full flex items-center justify-center bg-white hover:bg-white/90 text-gray-900 text-[11px] font-bold rounded-xl py-2 transition-colors shadow-sm disabled:opacity-60"
                                                                disabled={submitting !== null}
                                                                onClick={() => handleSelectLawyer(lawyer)}
                                                            >
                                                                {isConnecting ? <Loader2 className="size-3 animate-spin" /> : "Chat Now"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Load More */}
                                {hasMore && (
                                    <div className="flex justify-center mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-xs"
                                            disabled={loadingMore}
                                            onClick={handleLoadMore}
                                        >
                                            {loadingMore ? <><Loader2 className="w-3 h-3 animate-spin" />Loading...</> : <><ChevronDown className="w-3 h-3" />Load More Lawyers</>}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
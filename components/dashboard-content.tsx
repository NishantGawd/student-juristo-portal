// Force HMR cache clear for Turbopack
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { SidebarToggle } from "@/components/sidebar-toggle";
import {
    FileText,
    Zap,
    Crown,
    BarChart,
    ShoppingBag,
    AlertTriangle,
    Download,
    ExternalLink,
    PenTool,
    Calendar,
    Filter,
    Video,
    IndianRupee,
    Brain,
    Plus,
    Trash2,
    Loader2,
} from "lucide-react";
import type { ContractPurchase, Document } from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/usage/plan-limits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { downloadAsPDF, downloadAsDOCX } from "@/lib/utils/document-export";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserStats = {
    id: string;
    email: string;
    plan: string;
    tokensUsed: string;
    miniTokensUsed: string;
    macroTokensUsed: string;
    maxTokensUsed: string;
    chatCount: string;
    draftCount: string;
    analysisCount: string;
    consultationCount: string;
    usedConsultationMins?: number;
};

type EnrichedDocument = Document & { chatId?: string };

type DashboardContentProps = {
    user: UserStats;
    purchases: ContractPurchase[];
    draftedDocuments: EnrichedDocument[];
    consultations?: any[];
    totalPurchases: number;
    totalDocuments: number;
};

// Usage Meter Component
function UsageMeter({
    used,
    total,
    label,
    icon: Icon,
    onClick,
}: {
    used: number;
    total: number;
    label: string;
    icon: React.ElementType;
    onClick?: () => void;
}) {
    const isUnlimited = total === -1;
    const percentage = isUnlimited ? 0 : Math.min((used / total) * 100, 100);
    const isWarning = !isUnlimited && percentage >= 80;
    const isCritical = !isUnlimited && percentage >= 95;

    return (
        <div
            onClick={onClick}
            className={`rounded-xl border bg-card p-4 transition-all duration-300 ${onClick ? "cursor-pointer hover:shadow-md hover:border-border/80 hover:bg-muted/30" : "hover:shadow-sm"}`}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-lg p-2.5 shrink-0 ${isCritical ? "bg-red-500/10" : isWarning ? "bg-amber-500/10" : "bg-primary/10"}`}>
                    <Icon className={`size-4 ${isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-primary"}`} />
                </div>
                <div className="flex-1 w-full flex flex-col items-start min-w-0">
                    <span className="font-medium text-[13px] truncate w-full">{label}</span>
                    <span className={`text-[11px] font-semibold tracking-wide ${isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
                        {isUnlimited ? "Unlimited" : `${used.toLocaleString()} / ${total.toLocaleString()}`}
                    </span>
                </div>
            </div>

            <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isUnlimited ? "100%" : `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${isUnlimited
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                        : isCritical
                            ? "bg-gradient-to-r from-red-500 to-rose-600"
                            : isWarning
                                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                : "bg-gradient-to-r from-blue-500 to-indigo-600"
                        }`}
                />
            </div>

            {isWarning && !isUnlimited && (
                <div className={`flex items-start gap-1.5 mt-3 text-[11px] font-medium leading-tight ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                    <AlertTriangle className="size-3 shrink-0 translate-y-0.5" />
                    {isCritical ? "Limit almost reached! Consider upgrading." : "Approaching your limit."}
                </div>
            )}
        </div>
    );
}

export function DashboardContent({ user, purchases, draftedDocuments, consultations = [] }: DashboardContentProps) {
    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
    const [filter, setFilter] = useState("all");
    const ITEMS_PER_PAGE = 10;
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const tokensUsed = parseInt(user.tokensUsed, 10) || 0;
    const draftsUsed = parseInt(user.draftCount, 10) || 0;
    const chatsUsed = parseInt(user.chatCount, 10) || 0;
    const analysisUsed = parseInt(user.analysisCount, 10) || 0;
    const consultationsUsed = parseInt(user.consultationCount, 10) || 0;

    const [showConsultations, setShowConsultations] = useState(false);

    // ─── Memory State ────────────────────────────────────────────
    const [memories, setMemories] = useState<any[]>([]);
    const [memoryLoading, setMemoryLoading] = useState(true);
    const [newMemory, setNewMemory] = useState("");
    const [addingMemory, setAddingMemory] = useState(false);
    const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
    const memoryLimit = (limits as any).memories ?? 10;

    const fetchMemories = useCallback(async () => {
        try {
            setMemoryLoading(true);
            const res = await fetch("/api/memory");
            const data = await res.json();
            setMemories(data.memories || []);
        } catch (err) {
            console.error("Failed to load memories", err);
        } finally {
            setMemoryLoading(false);
        }
    }, []);

    useEffect(() => { fetchMemories(); }, [fetchMemories]);

    const handleAddMemory = async () => {
        if (!newMemory.trim()) return;
        setAddingMemory(true);
        try {
            const res = await fetch("/api/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newMemory }),
            });
            if (res.ok) {
                setNewMemory("");
                await fetchMemories();
            }
        } catch (err) {
            console.error("Failed to add memory", err);
        } finally {
            setAddingMemory(false);
        }
    };

    const handleDeleteMemory = async (memId: string) => {
        setDeletingMemoryId(memId);
        try {
            await fetch(`/api/memory?id=${memId}`, { method: "DELETE" });
            setMemories((prev) => prev.filter((m) => m.id !== memId));
        } catch (err) {
            console.error("Failed to delete memory", err);
        } finally {
            setDeletingMemoryId(null);
        }
    };

    // Unified items sorted by date (documents & purchases only)
    const combined: any[] = [
        ...(purchases || []).map(p => ({ ...p, _type: 'purchase' as const, date: p.createdAt })),
        ...(draftedDocuments || []).map(d => ({ ...d, _type: 'draft' as const, date: d.createdAt })),
    ].sort((a, b) => {
        const dateA = new Date((a as any).date).getTime();
        const dateB = new Date((b as any).date).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

    const filtered = combined.filter(item => filter === "all" || item._type === filter);
    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    // Independent consultations list
    const sortedConsultations = [...(consultations || [])].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Reset visible count when filter changes
    const handleFilterChange = (val: string) => {
        setFilter(val);
        setVisibleCount(ITEMS_PER_PAGE);
    };

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filtered.length));
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, filtered.length]);

    return (
        <div className="w-full flex flex-col bg-background/50 min-h-dvh">
            
            {/* ─── FIXED: Full-Width Sticky Header with SidebarToggle ─── */}
            <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 md:px-6 shrink-0">
                <SidebarToggle />
                <div className="flex-1" />
            </header>

            {/* ─── FIXED: Outer Container for Layout Padding and Restrictive Sizing ─── */}
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col p-4 md:p-6 lg:p-8 pb-12">
                
                {/* Header Title Block */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 mb-6 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                            <h1 className="font-bold text-2xl md:text-3xl tracking-tight truncate">Dashboard</h1>
                            <p className="text-muted-foreground text-sm mt-0.5 truncate">Your workspace overview.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Badge variant="outline" className="px-3 py-1.5 font-semibold text-xs tracking-wide bg-primary/5 text-primary border-primary/20 backdrop-blur-sm">
                            <Crown className="size-3.5 mr-1.5" />
                            {user.plan === "basic" ? "FREE" : user.plan.toUpperCase()} PLAN
                        </Badge>
                        {user.plan !== "business" && (
                            <Link href="/upgrade" className="inline-flex items-center justify-center rounded-md bg-foreground border border-transparent shadow shadow-black/10 px-4 py-1.5 font-semibold text-xs text-background transition-all hover:opacity-90 hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap">
                                Upgrade
                            </Link>
                        )}
                    </div>
                </div>

                {/* Dashboard Split View */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 min-h-0">
                    
                    {/* Left Panel: Usage Metrics */}
                    <div className="w-full lg:w-80 xl:w-[22rem] flex flex-col shrink-0">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Zap className="size-4 text-primary" />
                            <h2 className="font-semibold text-sm tracking-wide text-foreground uppercase">Current Usage</h2>
                        </div>

                        <div className="overflow-visible">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                                <UsageMeter used={tokensUsed} total={limits.tokens} label="AI Credits" icon={Zap} />
                                <UsageMeter used={analysisUsed} total={limits.analysis} label="Doc Analysis" icon={BarChart} />
                            </div>

                            <AnimatePresence>
                                {showConsultations && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-2">
                                            {sortedConsultations.length === 0 ? (
                                                <div className="text-center py-4 border rounded-xl bg-card border-dashed">
                                                    <p className="text-xs text-muted-foreground">No consultations yet.</p>
                                                </div>
                                            ) : (
                                                sortedConsultations.map((item) => (
                                                    <div key={item.id} className="p-3 border rounded-xl bg-card text-xs hover:border-border/60 hover:bg-muted/30 transition-all flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                                                <Video className="size-3" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold truncate">Session #{(item.id).slice(0, 8)}</p>
                                                                <p className="text-[10px] text-muted-foreground">{new Date(item.startTime || item.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                            <Badge variant="outline" className={`text-[9px] uppercase px-1.5 py-0 border ${item.status === 'completed' ? 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
                                                                : item.status === 'awaiting_payment' ? 'border-amber-200 text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400'
                                                                    : 'bg-muted'
                                                                }`}>
                                                                {item.status.replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1.5 border-t">
                                                            <Link href={`/live-chat/${item.id}/overview`} className="flex-1">
                                                                <button className="w-full h-7 rounded-md bg-background border flex items-center justify-center gap-1.5 hover:bg-muted transition-colors font-semibold">
                                                                    <ExternalLink className="size-3" /> View Details
                                                                </button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* AI Memory Manager */}
                        <div className="mt-4 rounded-xl border border-pink-200/60 bg-gradient-to-br from-pink-50/30 to-transparent dark:border-pink-900/30 dark:from-pink-950/10 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg p-1.5 bg-pink-500/10">
                                        <Brain className="size-3.5 text-pink-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[13px] leading-tight">AI Memory</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {memoryLimit === -1
                                                ? `${memories.length} stored · Unlimited`
                                                : `${memories.length} / ${memoryLimit} used`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Memory usage bar */}
                            {memoryLimit !== -1 && (
                                <div className="h-1.5 w-full rounded-full bg-pink-100 dark:bg-pink-950/30 mb-3 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((memories.length / memoryLimit) * 100, 100)}%` }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
                                    />
                                </div>
                            )}

                            {/* Add memory input */}
                            <div className="flex gap-1.5 mb-3">
                                <input
                                    type="text"
                                    value={newMemory}
                                    onChange={(e) => setNewMemory(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
                                    placeholder="e.g., I'm a lawyer based in Delhi"
                                    className="flex-1 px-2.5 py-1.5 text-[11px] border border-border rounded-lg bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-pink-400/50 transition-all"
                                />
                                <button
                                    onClick={handleAddMemory}
                                    disabled={addingMemory || !newMemory.trim()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-40 transition-colors shrink-0"
                                >
                                    {addingMemory ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                                </button>
                            </div>

                            {/* Memory list */}
                            <div className="max-h-[160px] overflow-y-auto space-y-1 scrollbar-hide">
                                {memoryLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-6">
                                        <Loader2 className="size-3.5 animate-spin text-pink-400" />
                                        <span className="text-[11px] text-muted-foreground">Loading…</span>
                                    </div>
                                ) : memories.length === 0 ? (
                                    <div className="text-center py-6">
                                        <Brain className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                                        <p className="text-[11px] text-muted-foreground">No memories yet</p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Chat with Juristo or add one above</p>
                                    </div>
                                ) : (
                                    memories.map((mem) => (
                                        <div key={mem.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-pink-50/50 dark:hover:bg-pink-950/10 transition-colors group">
                                            <Brain className="size-3 text-pink-400/60 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] text-foreground leading-relaxed">{mem.memory}</p>
                                                <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                                                    {new Date(mem.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteMemory(mem.id)}
                                                className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                                title="Remove"
                                            >
                                                {deletingMemoryId === mem.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Unified Documents List */}
                    <div className="flex-1 flex flex-col bg-card border rounded-2xl shadow-sm overflow-hidden border-border/80 min-w-0 min-h-[400px] lg:min-h-0">
                        <div className="px-5 py-4 border-b bg-muted/20 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4">
                            <div className="flex items-center gap-2 mr-auto">
                                <FileText className="size-4 text-primary shrink-0" />
                                <h2 className="font-semibold text-[15px]">Your Documents</h2>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Badge variant="secondary" className="px-2">{filtered.length} docs</Badge>
                                <Select value={filter} onValueChange={handleFilterChange}>
                                    <SelectTrigger className="w-full sm:w-[170px] h-8 text-xs font-medium">
                                        <Filter className="size-3.5 mr-2 opacity-70" />
                                        <SelectValue placeholder="Filter docs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Items</SelectItem>
                                        <SelectItem value="purchase">Purchased Templates</SelectItem>
                                        <SelectItem value="draft">AI Drafts</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* scrollable area — fixed height on desktop, auto on mobile */}
                        <div className="flex-1 overflow-y-auto px-1 py-1 bg-background/30 custom-scrollbar lg:max-h-[calc(100vh-280px)]">
                            <div className="p-2 flex flex-col gap-1.5">
                                {visible.map((item, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03, duration: 0.2 }}
                                        key={`${item._type}-${item.id}`}
                                        className="flex items-center justify-between p-3 border border-transparent hover:border-border/60 rounded-xl hover:bg-muted/40 hover:shadow-xs transition-all group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`shrink-0 rounded-lg p-2.5 transition-colors ${item._type === 'purchase' ? 'bg-orange-100/80 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-100 group-hover:dark:bg-orange-900/60' : item._type === 'consultation' ? 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:bg-emerald-100 group-hover:dark:bg-emerald-900/60' : 'bg-indigo-100/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 group-hover:bg-indigo-100 group-hover:dark:bg-indigo-900/60'}`}>
                                                {item._type === 'purchase' ? <ShoppingBag className="size-4" /> : item._type === 'consultation' ? <Video className="size-4" /> : <PenTool className="size-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate text-foreground/90">
                                                    {item._type === 'consultation'
                                                        ? `Live Consultation #${(item as any).id?.slice(0, 8)}`
                                                        : (item as any).contractName || (item as any).title}
                                                </p>
                                                <div className="flex relative items-center gap-2 mt-1">
                                                    <span className="text-muted-foreground text-[11px] truncate tracking-wide font-medium">
                                                        {new Date((item as any).date).toLocaleDateString()}
                                                    </span>
                                                    <span className="size-1 rounded-full bg-muted-foreground/30 shrink-0"></span>
                                                    <span className={`text-[11px] font-semibold tracking-wide ${item._type === 'purchase' ? 'text-orange-600 dark:text-orange-500' : item._type === 'consultation' ? 'text-emerald-600 dark:text-emerald-500' : 'text-indigo-600 dark:text-indigo-500'}`}>
                                                        {item._type === 'purchase' ? "Purchased Template" : item._type === 'consultation' ? "Consultation" : "AI Draft"}
                                                    </span>
                                                    {item._type === 'purchase' && (
                                                        <>
                                                            <span className="size-1 rounded-full bg-muted-foreground/30 shrink-0 hidden sm:block"></span>
                                                            <span className="hidden sm:block text-muted-foreground text-[11px] font-medium truncate">₹{(item as any).price}</span>
                                                        </>
                                                    )}
                                                    {item._type === 'consultation' && (item as any).calculatedAmount && (
                                                        <>
                                                            <span className="size-1 rounded-full bg-muted-foreground/30 shrink-0 hidden sm:block"></span>
                                                            <span className="hidden sm:flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"><IndianRupee className="size-2.5" />{(item as any).calculatedAmount}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2 pl-4">
                                            {item._type === 'consultation' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className={`font-semibold text-[10px] uppercase ${(item as any).status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400'
                                                        : (item as any).status === 'awaiting_payment' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400'
                                                        }`}>
                                                        {(item as any).status === 'completed' ? 'Paid'
                                                            : (item as any).status === 'awaiting_payment' ? 'Unpaid'
                                                                : (item as any).status}
                                                    </Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="inline-flex items-center justify-center rounded-md bg-background border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                                                                <ExternalLink className="size-3.5 sm:mr-1.5" /> <span className="hidden sm:block">Actions</span>
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[180px]">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/live-chat/${item.id}/overview`} className="flex items-center gap-2 cursor-pointer">
                                                                    <FileText className="size-4" />
                                                                    <span>View Session Details</span>
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/live-chat/${item.id}/overview`} className="flex items-center gap-2 cursor-pointer">
                                                                    <Download className="size-4" />
                                                                    <span>Download Receipt</span>
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            ) : item._type === 'purchase' ? (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400 font-semibold text-[10px] uppercase hidden sm:flex">{(item as any).paymentStatus}</Badge>
                                            ) : (
                                                <div className="flex items-center gap-1.5 opacity-100 transition-opacity">
                                                    <Link href={`/document/${item.id}?from=dashboard`} className="inline-flex items-center justify-center rounded-md bg-background border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                                                        <ExternalLink className="size-3.5 sm:mr-1.5" /> <span className="hidden sm:block">Open</span>
                                                    </Link>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                toast.info("Preparing PDF...");
                                                                const res = await fetch(`/api/documents/${item.id}/download?format=json`);
                                                                const data = await res.json();
                                                                await downloadAsPDF(data.content || "", data.title || (item as any).title || "Document");
                                                                toast.success("PDF downloaded!");
                                                            } catch { toast.error("Failed to download PDF"); }
                                                        }}
                                                        className="hidden sm:inline-flex items-center justify-center rounded-md bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-red-100 hover:dark:bg-red-900/60 cursor-pointer"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="size-3.5 mr-1.5" /> PDF
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                toast.info("Preparing DOCX...");
                                                                const res = await fetch(`/api/documents/${item.id}/download?format=json`);
                                                                const data = await res.json();
                                                                await downloadAsDOCX(data.content || "", data.title || (item as any).title || "Document");
                                                                toast.success("DOCX downloaded!");
                                                            } catch { toast.error("Failed to download DOCX"); }
                                                        }}
                                                        className="hidden sm:inline-flex items-center justify-center rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-indigo-100 hover:dark:bg-indigo-900/60 cursor-pointer"
                                                        title="Download DOCX"
                                                    >
                                                        <Download className="size-3.5 mr-1.5" /> DOCX
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {filtered.length === 0 && (
                                    <div className="text-center flex flex-col items-center justify-center py-20 text-muted-foreground">
                                        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                            <FileText className="size-8 text-muted-foreground/50" />
                                        </div>
                                        <p className="font-semibold text-foreground">No documents found</p>
                                        <p className="text-sm mt-1">Try changing your filters.</p>
                                    </div>
                                )}
                            </div>
                            {/* Infinite scroll sentinel */}
                            {hasMore && (
                                <div ref={sentinelRef} className="flex items-center justify-center py-4">
                                    <span className="text-xs text-muted-foreground animate-pulse">Loading more...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

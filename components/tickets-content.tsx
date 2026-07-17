"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LifeBuoy, Plus, CheckCircle2, ArrowLeft,
  Paperclip, Download, Send, MessageSquare, Search,
  FileText, X, Lightbulb, Circle, CheckCircle, Clock, Loader2, Receipt
} from "lucide-react";
import toast from "react-hot-toast";
import Pusher from "pusher-js";
import { SidebarToggle } from "./sidebar-toggle";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "General Inquiry",
  "Technical Support",
  "Account Related",
  "Consult Advocate",
  "Billing Question",
  "Refund Request"
];

const REFUND_REASONS = [
  "Accidental Purchase",
  "Service Not As Expected",
  "Duplicate Charge",
  "Other"
];

const PRIORITIES = ["Low", "Medium", "High"];
const STEPS = ["Opened", "Reviewed", "In Progress", "Resolved"];

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = () => resolve(fileReader.result as string);
    fileReader.onerror = (error) => reject(error);
  });
};

const downloadAttachment = (base64Data: string, filename: string, contentType: string) => {
  try {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  } catch (e) {
    console.error("Download failed:", e);
    toast.error("Failed to download file.");
  }
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const TicketMessageRenderer = ({ text, isUserBubble = false }: { text: string, isUserBubble?: boolean }) => {
  const hasTransactionId = text.includes("TRANSACTION ID:") || text.includes("**TRANSACTION ID:**");

  if (hasTransactionId) {
    const parts = text.split(/USER DESCRIPTION:\**\n/i);
    const meta = parts[0] || "";
    const desc = parts[1] || "";

    const cleanMeta = meta.replace(/\*/g, '');
    const txMatch = cleanMeta.match(/TRANSACTION ID:\s*(.*)/i);
    const reasonMatch = cleanMeta.match(/REASON:\s*(.*)/i);

    return (
      <div className="flex flex-col gap-3.5 w-full">
        <div className={cn(
          "p-4 rounded-none text-xs border font-sans text-left",
          isUserBubble 
            ? "bg-zinc-900 border-zinc-700 text-white dark:bg-white/10 dark:border-white/10" 
            : "bg-zinc-50 border-zinc-200 text-zinc-800 dark:bg-[#080D1A] dark:border-white/10 dark:text-zinc-300"
        )}>
          <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-200 dark:border-white/10">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
              <Receipt size={12} /> Transaction ID
            </span>
            <span className="font-mono font-bold tracking-tight">{txMatch?.[1]?.trim() || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60">Refund Reason</span>
            <span className="font-bold uppercase tracking-wide text-[10px]">{reasonMatch?.[1]?.trim() || "N/A"}</span>
          </div>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed text-xs tracking-wide font-normal font-sans text-left">{desc.trim()}</p>
      </div>
    );
  }
  return <p className="whitespace-pre-wrap leading-relaxed text-xs tracking-wide font-normal font-sans text-left">{text}</p>;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const p = (priority || "medium").toLowerCase();

  const colors = {
    high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    low: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
  };

  const selectedColor = colors[p as keyof typeof colors] || colors.medium;

  return (
    <span className={cn("px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-fit font-mono", selectedColor)}>
      <span className={cn("w-1 h-1 rounded-none", p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-500' : 'bg-zinc-500')} />
      {p}
    </span>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const c = category || "General Inquiry";

  const colors: Record<string, string> = {
    "General Inquiry": "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10",
    "Technical Support": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "Account Related": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    "Consult Advocate": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "Billing Question": "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    "Refund Request": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
  };

  const selectedColor = colors[c] || colors["General Inquiry"];

  return (
    <span className={cn("px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider border w-fit font-mono", selectedColor)}>
      {c}
    </span>
  );
};

export function TicketsContent({ initialTickets = [], userEmail = "" }: { initialTickets?: any[], userEmail?: string }) {
  const [tickets, setTickets] = useState<any[]>(initialTickets);
  const [loading, setLoading] = useState(true);

  const [activeWorkspace, setActiveWorkspace] = useState<'empty' | 'new' | 'details'>('empty');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedTicket = tickets.find(t => t.queryId === selectedTicketId) || null;

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[1]);
  const [queryText, setQueryText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [transactionId, setTransactionId] = useState("");
  const [refundReason, setRefundReason] = useState(REFUND_REASONS[0]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, setPreviewUrl] = useState<string | null>(null);

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isDeflecting, setIsDeflecting] = useState(false);
  const lastQueriedTextRef = useRef("");

  const [userReplyText, setUserReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [adminIsTyping, setAdminIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    if (selectedFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    let active = true;
    const cleanText = queryText.trim();

    if (cleanText.length < 25 || category === "Refund Request") {
      setAiSuggestion(null);
      setIsDeflecting(false);
      lastQueriedTextRef.current = "";
      return;
    }

    if (cleanText !== lastQueriedTextRef.current) {
      setAiSuggestion(null);
    }

    const timerId = setTimeout(async () => {
      if (!active) return;
      setIsDeflecting(true);

      try {
        const res = await fetch('/api/tickets/deflect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: queryText, category })
        });

        if (!res.ok) throw new Error("Network Error");
        const data = await res.json();

        if (active && queryText.trim().length >= 25) {
          if (data.suggestion) {
            setAiSuggestion(data.suggestion);
          } else {
            setAiSuggestion("This issue requires our technical team's attention. Please submit your ticket below.");
          }
          lastQueriedTextRef.current = queryText;
        }
      } catch (error) {
        console.error("Deflection failed", error);
        if (active) setAiSuggestion(null);
      } finally {
        if (active) setIsDeflecting(false);
      }
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [queryText, category]);

  const fetchTickets = async (isSilent = false) => {
    if (!isSilent && tickets.length === 0) setLoading(true);
    try {
      const response = await fetch(`/api/tickets?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tickets) {
          setTickets(data.tickets);
        }
      }
    } catch (error) {
      console.error("Live sync error:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => fetchTickets(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    const channel = pusher.subscribe(`ticket-${selectedTicketId}`);

    channel.bind("typing-event", (data: { isTyping: boolean; userType: string }) => {
      if (data.userType === "Admin") {
        setAdminIsTyping(data.isTyping);
        if (data.isTyping) {
          setTimeout(() => setAdminIsTyping(false), 5000);
        }
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [selectedTicketId]);

  useEffect(() => {
    if (activeWorkspace === 'details' && selectedTicket) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [selectedTicket?.responses?.length, activeWorkspace]);

  useEffect(() => {
    if (selectedTicketId && tickets.length > 0 && !loading) {
      const ticketExists = tickets.some(t => t.queryId === selectedTicketId);
      if (!ticketExists) {
        setSelectedTicketId(null);
        setActiveWorkspace('empty');
        toast.error("This ticket was closed or removed.");
      }
    }
  }, [tickets, selectedTicketId, loading]);

  const handleTicketSelect = (id: string) => {
    setSelectedTicketId(id);
    setActiveWorkspace('details');
  };

  const handleCreateNew = () => {
    setSelectedTicketId(null);
    setCategory(CATEGORIES[0]);
    setPriority(PRIORITIES[1]);
    setQueryText("");
    setTransactionId("");
    setRefundReason(REFUND_REASONS[0]);
    setSelectedFile(null);
    setAiSuggestion(null);
    lastQueriedTextRef.current = "";
    setActiveWorkspace('new');
  };

  const validateAndSetFile = (file: File, setter: (f: File | null) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large (Max 2MB)");
      return;
    }
    setter(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>, setter: (f: File | null) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file, setter);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file, setter);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (category === "Refund Request" && !transactionId.trim()) {
      toast.error("Transaction ID is required for refunds.");
      return;
    }

    if (!queryText.trim()) {
      toast.error("Please describe your issue.");
      return;
    }

    let finalQueryText = queryText;
    if (category === "Refund Request") {
      finalQueryText = `TRANSACTION ID: ${transactionId}\nREASON: ${refundReason}\n\nUSER DESCRIPTION:\n${queryText}`;
    }

    setSubmitting(true);
    try {
      let attachment = null;
      if (selectedFile) {
        const base64 = await convertToBase64(selectedFile);
        attachment = { data: base64, name: selectedFile.name, size: selectedFile.size, type: selectedFile.type };
      }

      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          queryText: finalQueryText,
          attachment,
          priority: priority.toLowerCase()
        })
      });

      if (!response.ok) throw new Error("Failed to create ticket");

      toast.success("Ticket raised successfully!");
      handleCreateNew();
      await fetchTickets(true);
      setActiveWorkspace('empty');
    } catch (error: any) {
      toast.error(error.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserReplyText(e.target.value);

    if (!selectedTicketId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    fetch("/api/pusher/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selectedTicketId, isTyping: true, userType: "User" })
    }).catch(() => { });

    typingTimeoutRef.current = setTimeout(() => {
      fetch("/api/pusher/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicketId, isTyping: false, userType: "User" })
      }).catch(() => { });
    }, 2000);
  };

  const handleUserReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userReplyText.trim() && !replyFile) return;

    setReplying(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    fetch("/api/pusher/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selectedTicketId, isTyping: false, userType: "User" })
    }).catch(() => { });

    try {
      let attachmentURL = null;
      if (replyFile) {
        const base64 = await convertToBase64(replyFile);
        attachmentURL = { data: base64, name: replyFile.name, size: replyFile.size, type: replyFile.type };
      }

      const response = await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryId: selectedTicket.queryId,
          replyText: userReplyText,
          attachmentURL
        })
      });

      if (!response.ok) throw new Error("Failed to send reply");

      setUserReplyText("");
      setReplyFile(null);
      await fetchTickets(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const StatusStepper = ({ currentStatus }: { currentStatus: string }) => {
    const statusLower = (currentStatus || "opened").toLowerCase();

    let activeIndex = 0;
    if (statusLower === 'reviewed') activeIndex = 1;
    if (statusLower === 'in progress' || statusLower === 'in-progress') activeIndex = 2;
    if (statusLower === 'resolved' || statusLower === 'closed') activeIndex = 3;

    return (
      <div className="flex items-center w-full max-w-2xl mt-4 mb-1 ml-16 select-none">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center relative z-10 text-left">
                <div className={cn(
                  "w-7 h-7 rounded-none flex items-center justify-center font-mono text-[10px] font-bold border transition-colors",
                  isCompleted 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                    : isActive 
                      ? "bg-white dark:bg-[#080D1A] border-[#4169E1] text-[#4169E1] ring-2 ring-[#4169E1]/10" 
                      : "bg-zinc-50 dark:bg-[#080D1A] text-zinc-400 border-zinc-200 dark:border-white/10"
                )}>
                  {isCompleted ? <CheckCircle2 size={13} /> : `0${index + 1}`}
                </div>
                <span className={cn(
                  "absolute top-8 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                  isActive ? "text-[#4169E1]" : "text-zinc-400 dark:text-zinc-500"
                )}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  "flex-1 h-[1px] mx-1 transition-colors",
                  isCompleted ? "bg-emerald-500/40" : "bg-zinc-200 dark:bg-white/10"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const filteredTickets = tickets.filter(t =>
    t.queryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-[#0C1222] text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1] animate-in fade-in duration-300">

      {/* ─── LEFT PANE (THE LEDGER) ─── */}
      <div className={cn(
        "w-full md:w-[380px] shrink-0 border-r border-zinc-200 dark:border-white/10 flex flex-col bg-zinc-50/20 dark:bg-[#080D1A]/10 transition-transform",
        activeWorkspace !== 'empty' ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-5 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] sticky top-0 z-10 space-y-4">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <SidebarToggle />
              <h1 className="font-serif font-bold text-lg tracking-tight text-zinc-900 dark:text-white">Help Desk</h1>
            </div>
            <button
              onClick={handleCreateNew}
              className="h-9 px-3.5 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider transition-colors rounded-none flex items-center gap-1.5 cursor-pointer shadow-none"
            >
              <Plus size={14} /> Raise Ticket
            </button>
          </div>

          <div className="relative rounded-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter support tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-zinc-50 dark:bg-[#080D1A] border border-zinc-200 dark:border-white/10 rounded-none text-xs placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#4169E1] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 [scrollbar-width:thin]">
          {loading && tickets.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-12 text-zinc-400 gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
              <Loader2 className="size-4 animate-spin text-[#4169E1]" /> Synchronizing...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-10 text-xs font-medium text-zinc-400 dark:text-zinc-500 select-none">No records registered.</div>
          ) : (
            filteredTickets.map((ticket) => {
              const isActive = selectedTicketId === ticket.queryId;
              const isResolved = ['resolved', 'closed'].includes((ticket.status || "").toLowerCase());

              return (
                <div
                  key={ticket.queryId}
                  onClick={() => handleTicketSelect(ticket.queryId)}
                  className={cn(
                    "p-4 rounded-none border text-left transition-colors cursor-pointer flex flex-col gap-2.5",
                    isActive
                      ? "bg-zinc-50 dark:bg-[#080D1A] border-[#4169E1] dark:border-[#4169E1]"
                      : "bg-transparent border-transparent hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase">{ticket.queryId.slice(0, 12)}</span>
                    <span className="text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500">
                      {new Date(ticket.queryDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold tracking-tight text-zinc-800 dark:text-zinc-200 font-serif line-clamp-1">{ticket.category}</h3>

                  <div className="flex items-center justify-between mt-1 select-none">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "text-[9px] px-2 py-0.5 rounded-none font-mono font-bold uppercase tracking-wider border",
                        isResolved 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      )}>
                        {ticket.status || "Opened"}
                      </div>
                      {ticket.priority && <PriorityBadge priority={ticket.priority} />}
                    </div>
                    {ticket.responses && ticket.responses.length > 0 && (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-zinc-400">
                        <MessageSquare size={11} className="text-zinc-400" /> {ticket.responses.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE (THE WORKSPACE) ─── */}
      <div className={cn(
        "flex-1 flex flex-col bg-white dark:bg-[#0C1222] relative overflow-hidden",
        activeWorkspace === 'empty' ? 'hidden md:flex' : 'flex'
      )}>

        <div className="md:hidden flex items-center p-4 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] shrink-0 select-none text-left">
          <button
            onClick={() => setActiveWorkspace('empty')}
            className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Ledger
          </button>
        </div>

        {activeWorkspace === 'empty' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-200">
            <div className="w-14 h-14 border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] flex items-center justify-center mb-5 text-[#4169E1]">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-white mb-2 tracking-tight">How can we assist you?</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mb-6 leading-relaxed font-normal">
              Select an ongoing inquiry from the left ledger to review message timelines, or launch a direct terminal entry link parameter below.
            </p>
            <button
              onClick={handleCreateNew}
              className="h-10 px-5 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider transition-colors rounded-none cursor-pointer shadow-none"
            >
              Raise a New Ticket
            </button>
          </div>
        )}

        {activeWorkspace === 'new' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 [scrollbar-width:thin] animate-in fade-in duration-200">
            <div className="max-w-3xl mx-auto text-left">

              <div className="mb-8 flex justify-between items-start border-b border-zinc-100 dark:border-white/5 pb-5 select-none">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight font-serif text-zinc-900 dark:text-white">Create Support Request</h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">Submit structured documentation queries. Specialist teams typically respond inline within 120 minutes.</p>
                </div>
                <button
                  onClick={() => setActiveWorkspace('empty')}
                  className="hidden md:flex p-2 rounded-none hover:bg-zinc-50 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block select-none">Inquiry Category</label>
                    <div className="grid grid-cols-1 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={cn(
                            "p-3.5 rounded-none border text-xs font-semibold tracking-wide transition-colors text-left cursor-pointer outline-none",
                            category === cat
                              ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white/10 dark:border-white/20"
                              : "bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block select-none">Core Priority Level</label>
                    <div className="grid grid-cols-1 gap-2">
                      {PRIORITIES.map((pri) => {
                        const borderColors =
                          pri === "High" ? "hover:border-red-500/40 hover:bg-red-500/[0.02]" :
                            pri === "Medium" ? "hover:border-amber-500/40 hover:bg-amber-500/[0.02]" :
                              "hover:border-zinc-400 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]";

                        return (
                          <button
                            key={pri}
                            type="button"
                            onClick={() => setPriority(pri)}
                            className={cn(
                              "p-3.5 rounded-none border text-xs font-semibold tracking-wide transition-colors text-left cursor-pointer outline-none",
                              priority === pri
                                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white/10 dark:border-white/20"
                                : `bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 ${borderColors}`
                            )}
                          >
                            <div className="flex items-center gap-2.5 font-sans">
                              <span className={cn("w-1.5 h-1.5 rounded-none", pri === 'High' ? 'bg-red-500' : pri === 'Medium' ? 'bg-amber-500' : 'bg-zinc-400')} />
                              {pri} Priority Target
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* DYNAMIC REFUND PANEL */}
                {category === "Refund Request" && (
                  <div className="border border-red-500/20 bg-red-500/[0.02] rounded-none p-5 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400 select-none">
                      <Receipt size={16} />
                      <h3 className="font-bold font-serif text-sm">Refund Details Mapping Vector Required</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block select-none">Gateway Transaction ID</label>
                        <input
                          required
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. pay_XXXXX..."
                          className="w-full h-10 px-3 border border-red-500/30 bg-white dark:bg-[#080D1A] rounded-none text-xs font-medium focus:outline-none focus:border-red-500 text-zinc-800 dark:text-zinc-200 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block select-none">Reason for Reversal</label>
                        <select
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          className="w-full h-10 px-2.5 border border-red-500/30 bg-white dark:bg-[#080D1A] rounded-none text-xs font-medium focus:outline-none focus:border-red-500 text-zinc-800 dark:text-zinc-200 transition-colors"
                        >
                          {REFUND_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 relative">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block select-none">Detailed Case Log Premise</label>
                  <textarea
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Provide exhaustive context regarding logs, diagnostic codes, or subscription anomalies..."
                    className="w-full min-h-[160px] p-4 border border-zinc-200 dark:border-white/10 bg-transparent rounded-none text-xs font-normal leading-relaxed placeholder:text-zinc-400 focus:outline-none focus:border-[#4169E1] text-zinc-800 dark:text-zinc-200 transition-colors resize-y font-sans"
                  />

                  {/* AI DEFLECTION DRAWER */}
                  {(isDeflecting || aiSuggestion) && (
                    <div className="border border-[#4169E1]/20 bg-[#4169E1]/5 p-4 rounded-none flex gap-3.5 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="w-8 h-8 shrink-0 rounded-none border border-[#4169E1]/10 bg-white dark:bg-[#080D1A] flex items-center justify-center text-[#4169E1]">
                        {isDeflecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Lightbulb className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[9px] font-bold text-[#4169E1] font-mono uppercase tracking-widest select-none">
                          {isDeflecting ? 'AI Analyzing Case Vectors...' : 'Instant Resolve Suggestion'}
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal font-sans">
                          {isDeflecting ? (
                            <span className="flex items-center gap-1 opacity-70">Scanning legal training cache records<span className="animate-pulse">...</span></span>
                          ) : (
                            aiSuggestion
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block select-none">Evidence Uploads (Max 2MB Allocation)</label>

                  {!selectedFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                      onDrop={(e) => handleFileDrop(e, setSelectedFile)}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-none p-8 flex flex-col items-center justify-center transition-colors cursor-pointer select-none",
                        isDragging
                          ? 'border-[#4169E1] bg-[#4169E1]/5'
                          : 'border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A]/20 hover:bg-zinc-50 dark:hover:bg-white/5 hover:border-[#4169E1]/40'
                      )}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileSelect(e, setSelectedFile)} />
                      <div className={cn(
                        "w-10 h-10 rounded-none flex items-center justify-center mb-3 border text-zinc-400 transition-colors",
                        isDragging ? 'border-[#4169E1] text-[#4169E1] bg-white dark:bg-[#080D1A]' : 'bg-white dark:bg-[#080D1A] border-zinc-200 dark:border-white/10'
                      )}>
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold mb-0.5 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Click or drag document to partition</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Accepts structural JPG, PNG, PDF, or DOCX formats</p>
                    </div>
                  ) : (
                    <div className="border border-zinc-200 dark:border-white/10 rounded-none p-4 bg-white dark:bg-[#080D1A] flex items-center gap-4 group text-left shadow-none animate-in zoom-in-95 duration-150">
                      <div className="w-12 h-12 shrink-0 rounded-none bg-zinc-50 dark:bg-[#0C1222] flex items-center justify-center border border-zinc-200 dark:border-white/10 text-zinc-400">
                        <FileText className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200 font-serif">{selectedFile.name}</p>
                        <p className="text-[10px] font-mono font-medium text-zinc-400 mt-0.5 uppercase tracking-wide">
                          {formatBytes(selectedFile.size)} • {selectedFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="p-2 border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-[#0C1222] hover:bg-red-500/10 hover:text-red-500 text-zinc-400 rounded-none transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-zinc-100 dark:border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-6 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider transition-colors rounded-none flex items-center justify-center gap-2 disabled:opacity-50 shadow-none cursor-pointer"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : 'File Support Ticket'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* 3. TICKET DETAILS VIEW */}
        {activeWorkspace === 'details' && selectedTicket && (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
            <div className="p-5 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] shrink-0 text-left">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase">{selectedTicket.queryId}</span>
                      <CategoryBadge category={selectedTicket.category} />
                      {selectedTicket.priority && <PriorityBadge priority={selectedTicket.priority} />}
                    </div>
                    <h2 className="text-xl font-bold tracking-tight font-serif text-zinc-900 dark:text-white">Active Ticket Feed</h2>
                  </div>
                  <button
                    onClick={() => setActiveWorkspace('empty')}
                    className="hidden md:flex p-2 rounded-none hover:bg-zinc-50 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Close Workspace"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="pb-3 overflow-x-auto [scrollbar-width:none]">
                  <StatusStepper currentStatus={selectedTicket.status} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/20 dark:bg-[#080D1A]/5 [scrollbar-width:thin]">
              <div className="max-w-4xl mx-auto space-y-6">

                {/* User Original Issue */}
                <div className="flex flex-col items-end w-full">
                  <div className="max-w-[85%] md:max-w-[75%]">
                    <div className="flex items-center gap-2 mb-1.5 justify-end select-none font-mono text-[9px] font-bold text-zinc-400 uppercase">
                      <span>{new Date(selectedTicket.queryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[#4169E1]">Aspirant (You)</span>
                    </div>
                    <div className="p-4 rounded-none bg-zinc-900 text-white dark:bg-white/10 border border-transparent dark:border-white/5 shadow-none">
                      <TicketMessageRenderer text={selectedTicket.queryText} isUserBubble={true} />
                    </div>
                    {selectedTicket.attachment && (
                      <button 
                        onClick={() => downloadAttachment(selectedTicket.attachment.data, selectedTicket.attachment.name, selectedTicket.attachment.type)} 
                        className="mt-2 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-[#4169E1] transition-colors cursor-pointer"
                      >
                        <Paperclip size={11} /> {selectedTicket.attachment.name}
                      </button>
                    )}
                  </div>
                </div>

                {selectedTicket.responses?.map((response: any, idx: number) => {
                  const isUser = response.responseBy === 'User';
                  return (
                    <div key={idx} className={cn("flex flex-col w-full", isUser ? 'items-end' : 'items-start')}>
                      <div className="max-w-[85%] md:max-w-[75%]">
                        <div className={cn("flex items-center gap-2 mb-1.5 font-mono text-[9px] font-bold text-zinc-400 uppercase", isUser ? 'justify-end' : 'justify-start select-none')}>
                          {!isUser && <span className="text-red-500 font-bold">Juristo Support Desk</span>}
                          <span>{new Date(response.timestamp || response.responseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isUser && <span className="text-[#4169E1]">Aspirant (You)</span>}
                        </div>

                        <div className={cn(
                          "p-4 rounded-none text-sm leading-relaxed whitespace-pre-wrap font-sans",
                          isUser
                            ? 'bg-zinc-900 text-white dark:bg-white/10 border border-transparent dark:border-white/5'
                            : 'bg-white dark:bg-[#0C1222] border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200'
                        )}>
                          <TicketMessageRenderer text={response.text} isUserBubble={isUser} />
                        </div>

                        {response.attachment && (
                          <div className={cn("mt-2 flex", isUser ? 'justify-end' : 'justify-start select-none')}>
                            <button 
                              onClick={() => downloadAttachment(response.attachment.data || response.attachment, response.attachment.name || 'Attachment', response.attachment.type)} 
                              className="flex items-center gap-2 font-mono font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
                            >
                              <Download size={11} /> <span className="truncate max-w-[150px]">{response.attachment.name || 'Download Artifact'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {adminIsTyping && (
                  <div className="flex flex-col items-start w-full select-none animate-in fade-in duration-200">
                    <div className="max-w-[85%] md:max-w-[70%]">
                      <div className="flex items-center gap-2 mb-1.5 justify-start font-mono text-[9px] font-bold text-red-500 uppercase tracking-wider">
                        <span>Specialist is drafting response...</span>
                      </div>
                      <div className="px-4 py-3 rounded-none bg-white dark:bg-[#0C1222] border border-zinc-200 dark:border-white/10 text-zinc-400 w-fit">
                        <div className="flex gap-1.5 items-center justify-center h-4">
                          <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} className="h-4" />
              </div>
            </div>

            {!['resolved', 'closed'].includes(selectedTicket.status?.toLowerCase()) ? (
              <div className="p-4 md:p-5 bg-white dark:bg-[#0C1222] border-t border-zinc-200 dark:border-white/10 shrink-0">
                <div className="max-w-4xl mx-auto">
                  {replyFile && (
                    <div className="mb-2.5 inline-flex items-center gap-2 p-1 bg-zinc-50 dark:bg-[#080D1A] border border-zinc-200 dark:border-white/10 rounded-none font-mono text-[10px] font-bold uppercase tracking-wide select-none">
                      <div className="w-5 h-5 bg-white dark:bg-[#0C1222] border border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400">
                        <FileText size={10} />
                      </div>
                      <span className="max-w-[150px] truncate text-zinc-600 dark:text-zinc-400">{replyFile.name}</span>
                      <button type="button" onClick={() => setReplyFile(null)} className="p-0.5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer">
                        <X size={11} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleUserReply} className="flex items-end gap-3.5">
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="p-3 shrink-0 rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080D1A] hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer outline-none"
                    >
                      <Paperclip size={16} />
                      <input type="file" ref={replyFileInputRef} className="hidden" onChange={(e) => handleFileSelect(e, setReplyFile)} />
                    </button>

                    <textarea
                      value={userReplyText}
                      onChange={handleUserTyping}
                      placeholder="Type secure response message token..."
                      className="flex-1 max-h-[150px] min-h-[42px] p-3 border border-zinc-200 dark:border-white/10 bg-transparent rounded-none text-xs font-normal placeholder:text-zinc-400 focus:outline-none focus:border-[#4169E1] text-zinc-800 dark:text-zinc-200 transition-colors resize-y font-sans [scrollbar-width:thin]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (userReplyText.trim() || replyFile) handleUserReply(e);
                        }
                      }}
                    />

                    <button
                      type="submit"
                      disabled={replying || (!userReplyText.trim() && !replyFile)}
                      className="h-10 px-5 shrink-0 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider transition-colors rounded-none flex items-center justify-center disabled:opacity-50 shadow-none cursor-pointer"
                    >
                      {replying ? <Loader2 className="size-3.5 animate-spin" /> : <Send size={14} />}
                    </button>
                  </form>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 text-center md:text-left select-none font-sans font-medium">Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-white/5 font-mono text-[9px]">Enter</kbd> to broadcast message, <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-white/5 font-mono text-[9px]">Shift + Enter</kbd> for carriage return padding.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-zinc-50 dark:bg-[#080D1A]/50 text-center border-t border-zinc-200 dark:border-white/10 shrink-0 select-none">
                <p className="text-zinc-500 dark:text-zinc-400 font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <CheckCircle size={15} className="text-emerald-500" />
                  This case parameter has been marked resolved and closed.
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
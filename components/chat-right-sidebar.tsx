"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const suggestions = [
    { text: "Explain the doctrine of absolute liability with landmarks", icon: "⚖️" },
    { text: "Give me a quick 5-question drill on Constitutional Law maxims", icon: "📖" },
    { text: "How should I structure my final 30 days for Legal Reasoning?", icon: "📅" },
    { text: "Break down the structural changes in the new criminal codes", icon: "📜" },
    { text: "Analyze my score trends across completed mocks", icon: "📊" },
    { text: "Give me a rapid quiz layout on Contract Act principles", icon: "📝" },
];

const quickLinks = [
    { label: "Dashboard Hub", href: "/clat-exam?tab=dashboard", emoji: "📊" },
    { label: "Simulated Mocks", href: "/clat-exam?tab=mock", emoji: "📝" },
    { label: "Previous Year PYQs", href: "/clat-exam?tab=pyq", emoji: "📖" },
    { label: "Rapid Quizzes", href: "/clat-exam?tab=quick", emoji: "⚡" },
    { label: "Sectional Roadmap", href: "/clat-exam?tab=roadmap", emoji: "🗺️" },
];

export function ChatRightSidebar({
    currentSuggestions = [],
    onSuggestionSelect,
}: {
    currentSuggestions?: string[];
    onSuggestionSelect?: (text: string) => void;
}) {
    const displaySuggestions = currentSuggestions.length > 0
        ? currentSuggestions.map(text => ({ text, icon: "💡" }))
        : suggestions;

    return (
        <div className="hidden xl:flex w-[260px] shrink-0 flex-col gap-6 py-6 px-4 border-l bg-[#fbfaf7]/40 overflow-y-auto">
            {/* Dynamic Suggestions */}
            <div>
                <motion.p
                    key={currentSuggestions.length > 0 ? "follow-up" : "try-asking"}
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1"
                >
                    {currentSuggestions.length > 0 ? "Follow-up questions" : "Try asking your mentor"}
                </motion.p>
                <div className="space-y-1.5">
                    {displaySuggestions.map((item, index) => (
                        <motion.button
                            key={item.text}
                            animate={{ opacity: 1, x: 0 }}
                            initial={{ opacity: 0, x: 12 }}
                            transition={{ delay: 0.1 + index * 0.07, type: "spring", stiffness: 300, damping: 25 }}
                            className="group flex w-full items-start gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-2 text-left transition-all hover:bg-muted/60 hover:border-border/60 hover:shadow-sm"
                            onClick={() => {
                                if (onSuggestionSelect) {
                                    onSuggestionSelect(item.text);
                                    return;
                                }

                                const input = document.querySelector<HTMLTextAreaElement>('textarea');
                                if (input) {
                                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                                        window.HTMLTextAreaElement.prototype, 'value'
                                    )?.set;
                                    nativeInputValueSetter?.call(input, item.text);
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.focus();
                                }
                            }}
                            type="button"
                        >
                            <span className="text-sm mt-0.5 shrink-0">{item.icon}</span>
                            <span className="text-[11px] leading-snug text-muted-foreground group-hover:text-foreground transition-colors">
                                {item.text}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Quick Prep Links */}
            <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 8 }}
                transition={{ delay: 1.2 }}
            >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">
                    Workspace Navigation
                </p>
                <div className="space-y-1">
                    {quickLinks.map((link) => (
                        <Link key={link.label} href={link.href} className="block">
                            <span className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full">
                                <span>{link.emoji}</span>
                                <span>{link.label}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* Student Pro tip */}
            <motion.div
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ delay: 1.4 }}
                className="rounded-lg border border-primary/10 bg-primary/5 p-3"
            >
                <p className="text-[11px] font-medium text-primary mb-1">💡 Mentor Tip</p>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Ask me to analyze any difficult legal comprehension passage — I will isolate the legal logic parameters and track your core pattern answers.
                </p>
            </motion.div>
        </div>
    );
}
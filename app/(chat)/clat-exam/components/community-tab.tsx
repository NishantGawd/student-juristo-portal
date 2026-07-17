"use client";

import { MessageCircle, Users, Sparkles, HelpCircle, Trophy, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CommunityTab() {
  const communityFeatures = [
    {
      title: "Peer Interaction Hub",
      description: "Engage in round-the-clock moderated architectural legal debates and exam methodology discussions.",
      icon: MessageCircle,
      accentClass: "text-[#4169E1] border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    },
    {
      title: "Current Affairs Drops",
      description: "Receive timely, curated breakdowns covering recent legal updates, landmark judgments, and polity news.",
      icon: Sparkles,
      accentClass: "text-amber-500 border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    },
    {
      title: "Doubt Resolution Engine",
      description: "Post complex queries and collaborate with high-ranking aspirants to crowdsource verified structural answers.",
      icon: HelpCircle,
      accentClass: "text-purple-500 border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    },
    {
      title: "Scoreboard Comparisons",
      description: "Share test diagnostics, evaluate baseline accuracy variations, and track competitive percentile standouts.",
      icon: Trophy,
      accentClass: "text-emerald-500 border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A]",
    },
  ];

  return (
    <div className="w-full px-6 pt-12 pb-8 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── MAIN ASYMMETRIC COMMUNITY BENTO FRAMEWORK ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        
        {/* Left Side: Dynamic Engagement Hero Card (Takes 5/12 Columns) */}
        <Card className="lg:col-span-5 border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#0C1222] rounded-none shadow-none flex flex-col justify-between p-6 xl:p-8 relative">
          
          <div className="space-y-6 relative z-10 my-auto w-full text-left">
            <div className="space-y-4">
              <Badge className="rounded-none border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[9px] tracking-widest uppercase px-2.5 py-1 w-fit shadow-none animate-pulse">
                Live Interactivity Active
              </Badge>
              
              <h2 className="font-bold text-2xl xl:text-3xl tracking-tight text-zinc-900 dark:text-white font-serif leading-tight">
                Juristo CLAT Network
              </h2>
              
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-normal">
                Step inside an elite, moderated ecosystem engineered exclusively for high-grade law entrance aspirants. Sync strategy patterns, verify dynamic current affairs drops, and accelerate doubt resolution frameworks instantly.
              </p>
            </div>

            {/* Premium Flat Core Trigger Action Button */}
            <div className="pt-2 w-full">
              <Button className="w-full h-11 rounded-none bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs uppercase tracking-wider shadow-none flex items-center justify-center cursor-pointer transition-colors active:scale-[0.99] whitespace-normal" asChild>
                <a 
                  href="https://chat.whatsapp.com/G8HktiUcEvs9XbAH5PM6VA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full text-center px-2 flex-wrap"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="break-words">Join WhatsApp Community</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Micro Information Ribbon Footer */}
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono font-bold tracking-widest pt-6 border-t border-zinc-200 dark:border-white/10 uppercase select-none flex items-center gap-1.5 mt-6 text-left">
            <Globe className="h-3.5 w-3.5 text-zinc-400" /> Secure network link protocols apply
          </div>
        </Card>

        {/* Right Side: High-Grade Bento Feature Grid Cards (Takes 7/12 Columns) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch w-full">
          {communityFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={idx} 
                className="rounded-none border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-5 flex flex-col justify-between text-left transition-all hover:border-[#4169E1] dark:hover:border-[#4169E1] hover:bg-zinc-50/20 dark:hover:bg-white/5 shadow-none"
              >
                <div className="space-y-4">
                  {/* Styled Geometric Feature Node Icon Box */}
                  <div className={`h-10 w-10 border flex items-center justify-center rounded-none shadow-none shrink-0 ${feature.accentClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm tracking-tight text-zinc-800 dark:text-zinc-200 font-serif">
                      {feature.title}
                    </h4>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs leading-relaxed font-normal">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

      </div>

    </div>
  );
}
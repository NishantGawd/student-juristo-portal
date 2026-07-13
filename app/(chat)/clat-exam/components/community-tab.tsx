"use client";

import { MessageCircle, Users, Sparkles, HelpCircle, Trophy, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CommunityTab() {
  const communityFeatures = [
    {
      title: "Peer Interaction Hub",
      description: "Engage in round-the-clock moderated architectural legal debates and exam methodology discussions.",
      icon: MessageCircle,
      accentClass: "text-[#4169E1] bg-[#4169E1]/10 border-[#4169E1]/20",
    },
    {
      title: "Current Affairs Drops",
      description: "Receive timely, curated breakdowns covering recent legal updates, landmark judgments, and polity news.",
      icon: Sparkles,
      accentClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Doubt Resolution Engine",
      description: "Post complex queries and collaborate with high-ranking aspirants to crowdsource verified structural answers.",
      icon: HelpCircle,
      accentClass: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Scoreboard Comparisons",
      description: "Share test diagnostics, evaluate baseline accuracy variations, and track competitive percentile standouts.",
      icon: Trophy,
      accentClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 pt-12 pb-12 duration-500 w-full text-zinc-900 dark:text-zinc-100 select-none">
      
      {/* ─── MAIN ASYMMETRIC COMMUNITY FRAMEWORK ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
        
        {/* Left Side: Dynamic Engagement Hero Card (Takes 5/12 Columns) */}
        <Card className="lg:col-span-5 border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#080D1A]/40 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col justify-between p-6 xl:p-8 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#4169E1]/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="space-y-6 relative z-10 my-auto w-full">
            <div className="space-y-3.5">
              <Badge className="rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-widest uppercase px-2.5 py-0.5 w-fit shadow-3xs animate-pulse">
                Live Interactivity Active
              </Badge>
              
              <h2 className="font-black text-3xl xl:text-4xl tracking-tight text-zinc-900 dark:text-white leading-tight">
                Juristo CLAT Network
              </h2>
              
              <p className="text-zinc-500 dark:text-zinc-400 text-[14.5px] leading-relaxed font-normal">
                Step inside an elite, moderated ecosystem engineered exclusively for high-grade law entrance aspirants. Sync strategy patterns, verify dynamic current affairs drops, and accelerate doubt resolution frameworks instantly.
              </p>
            </div>

            {/* Premium Dynamic Call To Action Component (Fixed for squished responsive states) */}
            <div className="pt-2 w-full">
              <Button className="w-full h-auto py-3.5 rounded-xl bg-[#4169E1] hover:bg-[#4169E1]/90 text-white font-bold text-[11px] uppercase tracking-wider shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] whitespace-normal" asChild>
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

          {/* Micro Information Ribbon Safeguard Footer */}
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider pt-6 border-t border-zinc-200/60 dark:border-white/5 uppercase select-none flex items-center gap-1.5 mt-auto">
            <Globe className="h-3 w-3" /> Secure network link protocols apply
          </div>
        </Card>

        {/* Right Side: High-Grade Bento Feature Grid Cards (Takes 7/12 Columns) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch w-full">
          {communityFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={idx} 
                className="rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080D1A]/30 p-5 flex flex-col justify-between transition-all duration-300 hover:border-[#4169E1]/30 hover:bg-zinc-50/50 dark:hover:bg-[#4169E1]/5 shadow-3xs"
              >
                <div className="space-y-4">
                  {/* Styled Feature Node Icon Circle */}
                  <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shadow-3xs shrink-0 ${feature.accentClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-bold text-[15px] tracking-tight text-zinc-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[13px] leading-relaxed font-normal">
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
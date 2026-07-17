"use client";

import {
  CalendarClock,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLAT_SECTIONS } from "../clat-config";

export function generatePyqSlug(year: string, set: string) {
  return `${year}-${set}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export type RealPyqPaper = {
  year: string;
  set: string;
  focus: string;
  sourceLabel: string;
  paperUrl: string;
  answerKeyUrl?: string;
  answersEmbedded?: boolean;
};

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://chat.juristo.in";
};

const localPastPapers: RealPyqPaper[] = Array.from({ length: 16 }, (_, i) => {
  const year = 2023 - i;
  return {
    year: `CLAT ${year}`,
    set: "Official Paper",
    focus: "Official previous-year paper with master answer solutions fully embedded in the document text.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/${year}.pdf`,
    answersEmbedded: true,
  };
});

const REAL_PYQ_PAPERS: RealPyqPaper[] = [
  {
    year: "CLAT 2026",
    set: "Set A",
    focus: "Real exam question paper containing the most recent legal paradigm updates and passage matrices.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2026-set A.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2025",
    set: "Set A",
    focus: "Latest real paper conversion using the primary question booklet along with the official final answer key sheet.",
    sourceLabel: "Paper PDF + Final Key",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2025-set A.pdf`,
    answerKeyUrl: "https://knowledgenation.co.in/images/clat2025-final-answer-key.pdf",
  },
  {
    year: "CLAT 2025",
    set: "Set B",
    focus: "Alternative question sequence allocation map synced directly to the verified final master evaluation schedule.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2025-set B.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2025",
    set: "Set C",
    focus: "Third structural sequence configuration layout with complete master answers contained in the file template.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2025-set C.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2025",
    set: "Set D",
    focus: "Fourth cross-referenced booklet layout variant with embedded answer keys for performance breakdown evaluations.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2025-set D.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2024",
    set: "Set A",
    focus: "Complete comprehensive entry pattern containing full comprehension legal passages and chronological general knowledge segments.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2024-set A.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2024",
    set: "Set B",
    focus: "Secondary sequence distribution schema fully formatted and mapped to verify individual test cross-sections.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2024-set B.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2024",
    set: "Set C",
    focus: "Variant C distribution mapping file containing complete question items and analytics breakdowns.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2024 set C.pdf`,
    answersEmbedded: true,
  },
  {
    year: "CLAT 2024",
    set: "Set D",
    focus: "Variant D sequence layout map loaded with raw structural reading comprehension passages.",
    sourceLabel: "Solved source PDF",
    paperUrl: `${getBaseUrl()}/pyq_pdfs/2024-set D.pdf`,
    answersEmbedded: true,
  },
  ...localPastPapers
];

export function getPyqGenerationKey(paper: RealPyqPaper) {
  return `pyq-${paper.year}-${paper.set}`;
}

export function PyqTab({
  activeGenerationKey,
  onCreatePyq,
}: {
  activeGenerationKey?: string | null;
  onCreatePyq: (paper: RealPyqPaper) => void;
}) {
  const isGenerating = Boolean(activeGenerationKey);

  return (
    <div className="w-full px-6 py-0.5 space-y-12 animate-in fade-in duration-300 text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">

      {/* ─── EXACT HEAD-TO-HEAD REPLICA BAR GRID CONTAINER ─── */}
      <div className="w-full border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#0C1222] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 select-none rounded-none shadow-2xs">
        <div className="text-left space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/20 bg-[#4169E1]/10 px-3 py-1 text-xs font-bold text-[#4169E1] shadow-3xs uppercase tracking-wider">
            <FileCheck2 className="h-3.5 w-3.5" />
            Verified PDF Document Repositories Active
          </div>
          
          <div className="space-y-1">
            <h2 className="font-black text-2xl md:text-3xl tracking-tight text-zinc-900 dark:text-white font-serif">
              Real Previous-Year Paper Workspace
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal max-w-2xl leading-relaxed">
              Deploy authentic historical CLAT papers and final evaluation keys as absolute pillars of truth. Core processes strictly map the structural patterns without question item hallucination.
            </p>
          </div>
        </div>

        {/* Sharp Box Parameter Ribbon Aligned Right */}
        <div className="flex items-stretch border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080D1A] rounded-none divide-x divide-zinc-200 dark:divide-white/10 text-center min-w-[280px] shadow-2xs shrink-0 font-sans">
          <div className="flex-1 p-3.5 flex flex-col justify-center text-left">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[9px] uppercase tracking-wider block">Data Source</span>
            <strong className="text-zinc-800 dark:text-zinc-200 text-xs font-black mt-0.5">Official PDF</strong>
          </div>
          <div className="flex-1 p-3.5 flex flex-col justify-center text-left">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[9px] uppercase tracking-wider block">Interval Index</span>
            <strong className="text-zinc-800 dark:text-zinc-200 text-xs font-black mt-0.5">1 Min / Q</strong>
          </div>
          <div className="flex-1 p-3.5 flex flex-col justify-center text-left">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[9px] uppercase tracking-wider block">Metric Log</span>
            <strong className="text-[#4169E1] text-xs font-black mt-0.5">Net Score</strong>
          </div>
        </div>
      </div>

      {/* ─── IMMERSIVE PYQ PAPERS DRILLING GRID DECK ─── */}
      <div className="space-y-3 text-left pt-2">
        <div className="space-y-1.5 border-b border-zinc-100 dark:border-white/5 pb-2 select-none">
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block">
            Historical Blueprint Examination Repositories
          </span>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-normal leading-normal">
            Select an official past paper matrix sequence below to mount structural execution runs instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full items-stretch">
          {REAL_PYQ_PAPERS.map((paper) => {
            const loading = activeGenerationKey === getPyqGenerationKey(paper);
            return (
              <Card
                className="group border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0C1222] p-6 flex flex-col justify-between text-left transition-all hover:border-[#4169E1] dark:hover:border-[#4169E1] hover:bg-zinc-50/20 dark:hover:bg-white/5 min-h-[310px] rounded-none shadow-none relative"
                key={`${paper.year}-${paper.set}`}
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 via-[#4169E1] to-amber-500 opacity-40 dark:opacity-60 group-hover:opacity-100 transition-opacity" />
                
                <div className="space-y-3.5 w-full shrink-0">
                  <div className="flex items-start justify-between gap-4 w-full">
                    <div className="space-y-1">
                      <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
                        <CalendarClock className="h-4.5 w-4.5 text-[#4169E1]" />
                        {paper.year} — {paper.set}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-normal pt-0.5">
                        {paper.focus}
                      </p>
                    </div>
                    
                    <Badge className="rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0 shadow-none" variant="outline">
                      {paper.sourceLabel}
                    </Badge>
                  </div>
                </div>

                {/* Central Weight Mapping Distribution Row */}
                <div className="mt-5 space-y-4 w-full flex-1 flex flex-col justify-end">
                  <div className="grid grid-cols-5 gap-2 w-full select-none">
                    {CLAT_SECTIONS.slice(0, 5).map((section) => (
                      <div
                        className="border border-zinc-100 dark:border-white/5 bg-zinc-50/40 dark:bg-[#080D1A] py-2 text-center"
                        key={section.name}
                      >
                        <p className="font-bold text-[8px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                          {section.shortName}
                        </p>
                        <p className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 font-mono">
                          {section.weight}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Micro Validation Anchor Validation Strip */}
                  <div className="flex items-center gap-2.5 border border-emerald-500/10 dark:border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>
                      Pipeline verification loop locked: Zero generative fabrication variables.
                    </span>
                  </div>

                  {/* Dynamic External Link Extraction Buttons Grid */}
                  <div className="grid gap-2.5 grid-cols-2 w-full pt-0.5">
                    <Button asChild className="h-9 rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 font-medium text-xs uppercase tracking-wider cursor-pointer text-zinc-700 dark:text-zinc-300 shadow-none" variant="outline">
                      <a href={`/clat-pyq/${generatePyqSlug(paper.year, paper.set)}`} rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Paper PDF
                      </a>
                    </Button>

                    {paper.answerKeyUrl ? (
                      <Button asChild className="h-9 rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 font-medium text-xs uppercase tracking-wider cursor-pointer text-zinc-700 dark:text-zinc-300 shadow-none" variant="outline">
                        <a href={paper.answerKeyUrl} rel="noreferrer" target="_blank">
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Answer Key
                        </a>
                      </Button>
                    ) : (
                      <div className="flex h-9 items-center justify-center border border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-black/10 px-3 text-zinc-400 dark:text-zinc-500 text-center font-bold text-[10px] uppercase tracking-wider select-none">
                        Key Embedded
                      </div>
                    )}
                  </div>

                  {/* Primary Trigger Execution Button */}
                  <button
                    disabled={isGenerating}
                    onClick={() => onCreatePyq(paper)}
                    className="w-full h-10 bg-[#4169E1] hover:bg-[#3454c5] text-white font-medium text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PlayCircle className="h-3.5 w-3.5" />
                    )}
                    Create 30Q Real PYQ Drill
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}
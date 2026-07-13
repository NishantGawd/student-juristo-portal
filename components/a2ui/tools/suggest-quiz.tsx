"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";
import type { ToolPartProps } from "@/lib/a2ui/types";
import { Button } from "@/components/ui/button";

export function SuggestQuizTool({ state, input, output }: ToolPartProps) {
  const router = useRouter();
  
  if (state === "call") {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground animate-pulse">
        <GraduationCap className="h-4 w-4" />
        Preparing Quiz Generation...
      </div>
    );
  }

  const result = output || input;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-lg animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 w-full max-w-md my-4 relative">
      {/* Featured Vector Image */}
      <div className="w-full h-48 bg-muted overflow-hidden relative">
        <img 
          src="https://res.cloudinary.com/dkgvldz8m/image/upload/v1780773790/24503338_idea_01_s6zeyu.jpg" 
          alt="Quiz Setup Idea" 
          className="w-full h-full object-cover object-center transition-transform hover:scale-105 duration-500"
        />
        {/* Soft overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none" />
        
        {/* Topic Badge */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <GraduationCap className="h-4 w-4" />
          </div>
          <h4 className="font-bold text-lg leading-tight text-foreground drop-shadow-md">
            {result.topic} Quiz
          </h4>
        </div>
      </div>
      
      <div className="p-5 flex flex-col gap-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Ready to test your knowledge? We can set up a custom interactive flashcard or MCQ session tailored specifically to <strong>{result.subject || "General Law"}</strong>.
        </p>
        
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            onClick={() => {
              const params = new URLSearchParams({
                topic: result.topic,
                subject: result.subject || "General Law",
              });
              router.push(`/clat-exam?${params.toString()}`);
            }}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-5 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Generate Quiz
          </Button>

          <Button
            onClick={() => {
              const params = new URLSearchParams({
                topic: result.topic,
                subject: result.subject || "General Law",
                quizType: "Flashcards",
              });
              router.push(`/clat-exam?${params.toString()}`);
            }}
            variant="outline"
            className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full py-5 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Create Flashcards
          </Button>
        </div>
      </div>
    </div>
  );
}

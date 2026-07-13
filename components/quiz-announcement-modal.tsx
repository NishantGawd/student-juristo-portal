"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, BrainCircuit, LineChart, FileText, LayoutList } from "lucide-react";
import { dismissQuizAnnouncementAction } from "@/app/(chat)/user-actions";

export function QuizAnnouncementModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // We only mount the modal if the prop tells us to, but since it's rendered globally 
  // based on server state, we can just open it on mount if rendered.
  useEffect(() => {
    // Small delay for smooth entrance after login/mount
    const timer = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = async (navigateToQuiz: boolean = false) => {
    setIsDismissing(true);
    try {
      await dismissQuizAnnouncementAction();
    } catch (error) {
      console.error(error);
    }
    setOpen(false);
    
    if (navigateToQuiz) {
      router.push("/clat-exam");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleDismiss(false)}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <div className="w-full h-48 bg-muted overflow-hidden relative">
          <img 
            src="https://res.cloudinary.com/dkgvldz8m/image/upload/v1780773790/24503338_idea_01_s6zeyu.jpg" 
            alt="Quiz Setup Idea" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />
        </div>
        
        <div className="px-6 pb-6 flex flex-col gap-5 -mt-6 relative z-10">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <GraduationCap className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">New Feature</span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Quiz & Exam Preparation is Now Available
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/80 pt-1">
              Prepare for CLAT and other competitive exams directly inside Juristo AI.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">AI Generated Quizzes</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                <LayoutList className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Topic Wise Practice</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Document Based Creation</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                <LineChart className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Performance Analysis</span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-2">
            <Button 
              variant="outline" 
              onClick={() => handleDismiss(false)}
              className="w-full sm:w-auto rounded-full"
              disabled={isDismissing}
            >
              Maybe Later
            </Button>
            <Button 
              onClick={() => handleDismiss(true)}
              className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md"
              disabled={isDismissing}
            >
              Start Preparing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

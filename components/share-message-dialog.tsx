"use client";

import { Copy, Linkedin, Twitter } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Custom Reddit SVG since Lucide doesn't include it by default
const RedditIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .883.175 1.188.469 1.164-.821 2.766-1.373 4.516-1.465l.89-4.148c.036-.168.196-.28.369-.251l3.017.636c.174-.325.518-.543.908-.543z" />
  </svg>
);

interface ShareMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  textToShare: string;
}

export function ShareMessageDialog({ isOpen, onOpenChange, textToShare }: ShareMessageDialogProps) {
  const [_, copyToClipboard] = useCopyToClipboard();
  
  // Truncate text for platforms that have character limits
  const truncatedText = textToShare.length > 200 ? textToShare.substring(0, 200) + "..." : textToShare;
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    await copyToClipboard(currentUrl);
    toast.success("Link copied to clipboard!");
    onOpenChange(false);
  };

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(truncatedText)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(url, "_blank");
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
    window.open(url, "_blank");
  };

  const handleShareReddit = () => {
    const url = `https://reddit.com/submit?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent("Check out this legal response from Juristo AI")}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white shadow-2xl rounded-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-center">Share this response</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-center gap-6 py-6">
          {/* Copy Link */}
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleCopyLink} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 hover:bg-zinc-200">
              <Copy className="size-6" />
            </button>
            <span className="text-xs font-medium text-zinc-400">Copy link</span>
          </div>

          {/* X (Twitter) */}
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleShareX} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 hover:bg-zinc-200">
              <Twitter className="size-6 fill-current" />
            </button>
            <span className="text-xs font-medium text-zinc-400">X</span>
          </div>

          {/* LinkedIn */}
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleShareLinkedIn} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 hover:bg-zinc-200">
              <Linkedin className="size-6 fill-current" />
            </button>
            <span className="text-xs font-medium text-zinc-400">LinkedIn</span>
          </div>

          {/* Reddit */}
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleShareReddit} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 hover:bg-zinc-200">
              <RedditIcon className="size-6" />
            </button>
            <span className="text-xs font-medium text-zinc-400">Reddit</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
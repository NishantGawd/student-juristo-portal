import { useState } from "react";

export function useRegenerate(chatId: string, setMessages: any) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const triggerRegenerate = async (promptOverride?: string) => {
    setIsRegenerating(true);
    
    // Optimistically clear the last assistant message if it was a pure "Try Again"
    if (!promptOverride) {
      setMessages((prev: any) => prev.filter((m: any, i: number) => 
        !(m.role === 'assistant' && i === prev.length - 1)
      ));
    }

    try {
      const response = await fetch("/api/chat/regenerate", {
        method: "POST",
        body: JSON.stringify({ chatId, promptOverride }),
      });

      // Handle the stream manually or connect it back to your main stream provider
      // For simplicity, we trigger a standard refresh after the call to sync the DB
    } catch (error) {
      console.error("Regeneration failed", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return { isRegenerating, triggerRegenerate };
}
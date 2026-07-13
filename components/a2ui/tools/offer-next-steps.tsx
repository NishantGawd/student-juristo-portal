import { useState, useEffect } from "react";
import { ContractNextSteps } from "@/components/elements/next-steps";
import type { ToolPartProps } from "@/lib/a2ui/types";
import { useArtifact } from "@/hooks/use-artifact";
import { FileText, PanelRightOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OfferNextStepsTool({ toolCallId, state, output }: ToolPartProps) {
  const { artifact, setArtifact } = useArtifact();
  const [isLoading, setIsLoading] = useState(false);
  const [prefetchedContent, setPrefetchedContent] = useState<string>("");

  // 1. SILENT PRE-FETCH: Load the document in the background so it's instantly ready
  useEffect(() => {
    let isMounted = true;
    if (!output?.documentId) return;

    // If the global state already has it, just sync it locally
    if (artifact.documentId === output.documentId && artifact.content) {
      setPrefetchedContent(artifact.content);
      return;
    }

    // Otherwise, pre-fetch it silently
    fetch(`/api/document?id=${output.documentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && (data.content || data.text)) {
          setPrefetchedContent(data.content || data.text);
        }
      })
      .catch((err) => console.error("Prefetch failed:", err));

    return () => {
      isMounted = false;
    };
  }, [output?.documentId, artifact.documentId, artifact.content]);

  if (state !== "output-available") return null;

  const {
    contractSlug,
    templateName,
    price,
    documentId,
    paymentRequired,
    lawyerMarketplaceUrl,
  } = output || {};

  if (!contractSlug) return null;

  const handleOpenDocument = async () => {
    // Determine the content to inject (either from prefetch or existing global state)
    const contentToInject = prefetchedContent || (artifact.documentId === documentId ? artifact.content : "");

    // 2. INSTANT OPEN: If we have the content, open the panel and inject text simultaneously
    if (contentToInject) {
      setArtifact((prev) => ({
        ...prev,
        documentId: documentId,
        title: templateName || "Generated Document",
        isVisible: true,
        kind: "text",
        content: contentToInject, // Inject content in the exact same state update
      }));
      return;
    }

    // 3. FAILSAFE: If clicked before background pre-fetch completes
    setIsLoading(true);
    try {
      const res = await fetch(`/api/document?id=${documentId}`);
      if (res.ok) {
        const doc = await res.json();
        const text = doc.content || doc.text || "";
        setPrefetchedContent(text);
        
        // Single unified state update to prevent blank flashes
        setArtifact((prev) => ({
          ...prev,
          documentId: documentId,
          title: templateName || "Generated Document",
          isVisible: true,
          kind: "text",
          content: text,
        }));
      } else {
        throw new Error("Document not found");
      }
    } catch (error) {
      console.error("Failed to fetch document content:", error);
      toast.error("Could not load the latest document content. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex w-full flex-col gap-3" key={toolCallId}>
      
      {/* PREMIUM ARTIFACT REOPEN CARD */}
      <button
        onClick={handleOpenDocument}
        disabled={isLoading}
        className="group flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText size={16} className="opacity-90" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-foreground tracking-tight text-left">
              {templateName || "Generated Document"}
            </span>
            <span className="text-xs text-muted-foreground text-left">
              Click to view and edit contract
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center size-8 rounded-full bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
           {isLoading ? <Loader2 size={14} className="animate-spin text-primary" /> : <PanelRightOpen size={14} />}
        </div>
      </button>

      {/* Original Next Steps Component */}
      <ContractNextSteps
        contractSlug={contractSlug}
        documentId={documentId}
        lawyerMarketplaceUrl={lawyerMarketplaceUrl}
        paymentRequired={paymentRequired}
        price={price}
        templateName={templateName}
      />
    </div>
  );
}
import { Landmark, Loader2, ShieldCheck } from "lucide-react";
import { Citation } from "@/components/tool-ui/citation/citation";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function SearchTemplatesTool({ toolCallId, state, output }: ToolPartProps) {
  if (!output || ["call", "partial-call", "input-streaming"].includes(state)) {
    return (
      <div className="flex flex-col gap-2" key={toolCallId}>
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-blue-500" />
          <span>Searching Juristo database...</span>
        </div>
      </div>
    );
  }

  if (output && "error" in output) return null;

  const juristoTpl = output.juristoTemplate;
  const lawyerTpls = output.lawyerContracts || [];

  return (
    <div className="flex flex-col gap-3">
      <details
        className="group order-last mt-4 mb-2 flex w-full max-w-[600px] flex-col gap-3 rounded-xl border bg-card text-card-foreground shadow-sm"
        key={toolCallId}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 transition-opacity hover:opacity-80">
          <div className="flex size-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
            <Landmark className="size-3.5" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {output.status === "found"
              ? "View Discovered Contract Templates"
              : "No exact matches in Vault"}
          </span>
        </summary>

        <div className="flex flex-col gap-3 p-3 pt-0">
          {juristoTpl && (
            <Citation
              id={`jt-${toolCallId}`}
              type="document"
              title={juristoTpl.name}
              domain="Juristo Vault"
              href={juristoTpl.sourceUrl || `https://juristo.in/templates/${juristoTpl.slug}`}
              snippet={
                juristoTpl.description +
                (juristoTpl.applicableActs
                  ? `\nJurisdiction: ${juristoTpl.state}\nGovernance: ${juristoTpl.applicableActs}`
                  : "")
              }
              className="w-full max-w-none"
            />
          )}

          {lawyerTpls.length > 0 && (
            <div className="mt-2 space-y-2">
              <span className="ml-1 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <ShieldCheck className="size-3" /> Marketplace Alternatives
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lawyerTpls.map((lt: any, i: number) => (
                  <Citation
                    key={`lt-${i}`}
                    id={`lt-${toolCallId}-${i}`}
                    type="document"
                    title={lt.name}
                    domain="Juristo Marketplace"
                    href={`https://chat.juristo.in/contracts/${lt.slug}`}
                    snippet={`By ${lt.lawyerName} · ${lt.price === 0 ? "Free" : "₹" + lt.price}`}
                    className="w-full min-w-0"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

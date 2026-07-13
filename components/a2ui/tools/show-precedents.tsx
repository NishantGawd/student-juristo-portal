import { PrecedentCards } from "@/components/a2ui/text/precedents";
import type { ToolPartProps } from "@/lib/a2ui/types";

export function ShowPrecedentsTool({ input }: ToolPartProps) {
  if (!input || !input.cases) return null;

  // Map the tool's input format to the format expected by PrecedentCards
  const formattedCases = input.cases.map((c: any) => ({
    name: c.name,
    cit: c.citation,
    summary: c.summary,
  }));

  return (
    <PrecedentCards 
      cases={formattedCases} 
      otherText={[]} 
      messageId="tool-precedents" 
      rawText="" 
    />
  );
}

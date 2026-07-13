import type { ComponentType } from "react";
import type { ToolPartProps } from "./types";

import { WeatherTool } from "@/components/a2ui/tools/weather";
import { CreateDocumentTool } from "@/components/a2ui/tools/create-document";
import { CreateResearchReportTool } from "@/components/a2ui/tools/create-research-report";
import { UpdateDocumentTool } from "@/components/a2ui/tools/update-document";
import { RequestSuggestionsTool } from "@/components/a2ui/tools/request-suggestions";
import { SearchTemplatesTool } from "@/components/a2ui/tools/search-templates";
import { OfferNextStepsTool } from "@/components/a2ui/tools/offer-next-steps";
import { FindLawyerTool } from "@/components/a2ui/tools/find-lawyer";
import { RunLegalResearchTool } from "@/components/a2ui/tools/run-legal-research";
import { WebSearchTool } from "@/components/a2ui/tools/web-search";
import { SearchMemoryTool } from "@/components/a2ui/tools/memory-search";
import { AddMemoryTool } from "@/components/a2ui/tools/memory-add";
import { DeleteMemoryTool } from "@/components/a2ui/tools/memory-delete";
import { ShowPrecedentsTool } from "@/components/a2ui/tools/show-precedents";
import { SuggestQuizTool } from "@/components/a2ui/tools/suggest-quiz";
import { VisualizePropertyDisputeTool } from "@/components/a2ui/tools/visualize-property-dispute";

export const toolCatalog: Record<string, ComponentType<ToolPartProps>> = {
  // Built-in tools
  getWeather: WeatherTool,
  createDocument: CreateDocumentTool,
  createResearchReport: CreateResearchReportTool,
  updateDocument: UpdateDocumentTool,
  requestSuggestions: RequestSuggestionsTool,

  // Legal domain tools
  searchContractTemplates: SearchTemplatesTool,
  offerNextSteps: OfferNextStepsTool,
  findLawyer: FindLawyerTool,
  runLegalResearch: RunLegalResearchTool,

  // Search & Memory
  webSearch: WebSearchTool,
  searchMemory: SearchMemoryTool,
  addMemory: AddMemoryTool,
  deleteMemory: DeleteMemoryTool,

  // UX & Display Tools
  showPrecedents: ShowPrecedentsTool,
  suggestQuizCreation: SuggestQuizTool,
  visualizePropertyDispute: VisualizePropertyDisputeTool,
};

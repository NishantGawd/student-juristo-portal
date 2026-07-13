import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { createResearchReport } from "./ai/tools/create-research-report";
import type { draftContract } from "./ai/tools/draft-contract";
import type { fileOdr } from "./ai/tools/file-odr";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { runLegalResearch } from "./ai/tools/run-legal-research";
import type { updateDocument } from "./ai/tools/update-document";
import type { visualizePropertyDispute } from "./ai/tools/visualize-property-dispute";
import type { Suggestion } from "./db/schema";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type VisibilityType = "public" | "private";

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type draftContractTool = InferUITool<ReturnType<typeof draftContract>>;
type createResearchReportTool = InferUITool<
  ReturnType<typeof createResearchReport>
>;
type runLegalResearchTool = InferUITool<ReturnType<typeof runLegalResearch>>;
type fileOdrTool = InferUITool<ReturnType<typeof fileOdr>>;
type visualizePropertyDisputeTool = InferUITool<
  ReturnType<typeof visualizePropertyDispute>
>;

import type { askContractDetails } from "./ai/tools/ask-contract-details";
import type { offerNextSteps } from "./ai/tools/offer-next-steps";
import type { searchContractTemplates } from "./ai/tools/search-templates";

type searchContractTemplatesTool = InferUITool<
  ReturnType<typeof searchContractTemplates>
>;
type askContractDetailsTool = InferUITool<
  ReturnType<typeof askContractDetails>
>;
type offerNextStepsTool = InferUITool<ReturnType<typeof offerNextSteps>>;

import type { webSearch } from "./ai/tools/web-search";

type webSearchTool = InferUITool<typeof webSearch>;

import type { showPrecedents } from "./ai/tools/show-precedents";

type showPrecedentsTool = InferUITool<ReturnType<typeof showPrecedents>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  createResearchReport: createResearchReportTool;
  runLegalResearch: runLegalResearchTool;
  fileOdr: fileOdrTool;
  visualizePropertyDispute: visualizePropertyDisputeTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  draftContract: draftContractTool;
  searchContractTemplates: searchContractTemplatesTool;
  askContractDetails: askContractDetailsTool;
  offerNextSteps: offerNextStepsTool;
  webSearch: webSearchTool;
  showPrecedents: showPrecedentsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  propertyVisualizerDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "contract-meta": {
    contractSlug: string;
    price: number;
    isFree: boolean;
    hasAccess?: boolean;
  };
  "chat-title": string;
  "research-progress": {
    chatId: string;
    runId: string;
    legalIssue: string;
    jurisdiction: string;
    startedAt: number;
    status: "running" | "complete";
    stage:
      | "issue-graph"
      | "authorities"
      | "treatment"
      | "forum"
      | "citation-audit"
      | "ready-for-writing";
    message: string;
    activeQuery?: string;
    plan?: Array<{
      id: string;
      label: string;
      query: string;
      issueNodeId?: string;
    }>;
    sources?: Array<{
      title: string;
      url: string;
      domain: string;
      content?: string;
      publishedDate?: string;
      sourceType?: string;
      query?: string;
      status?: "found" | "used";
    }>;
    issueGraph?: Array<{
      id: string;
      parentId?: string;
      issue: string;
      subQuestion: string;
      forum: string;
      confidence: string;
    }>;
    authorities?: Array<{
      id: string;
      title: string;
      sourceRole: string;
      authorityType: string;
    }>;
    claims?: Array<{
      claimId: string;
      proposition: string;
      confidence: string;
      loadBearing: boolean;
    }>;
    nodeExecutions?: Array<{
      issueNodeId: string;
      status: string;
      researchPlanIds: string[];
      authorityIds: string[];
      claimIds: string[];
      failedGates: string[];
      retryQueries: string[];
    }>;
    audits?: {
      status: "pass" | "needs_revision";
      citationAudit?: Array<{ status: string; message: string }>;
      sourceHierarchyAudit?: Array<{ status: string; message: string }>;
      treatmentAudit?: Array<{ status: string; message: string }>;
      completenessAudit?: Array<{ status: string; message: string }>;
    };
  };
  "odr-progress": {
    chatId: string;
    runId: string;
    startedAt: number;
    disputeType: string;
    status: "running" | "blocked" | "complete";
    stage:
      | "intake"
      | "plan-check"
      | "details"
      | "route-map"
      | "drafting"
      | "saving"
      | "ready";
    message: string;
    missing?: string[];
    used?: number;
    limit?: number;
    route?: {
      forum: string;
      portal: string;
      link: string;
      beforeFiling: string[];
      note: string;
    };
    sources?: Array<{
      title: string;
      url: string;
      domain: string;
      sourceType: "official-portal" | "government" | "mediation" | "guidance";
      note: string;
    }>;
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

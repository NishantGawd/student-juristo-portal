"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Map,
  PanelRightOpen,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useArtifact } from "@/hooks/use-artifact";
import type { ToolPartProps } from "@/lib/a2ui/types";
import { cn } from "@/lib/utils";

type IntakeData = {
  propertyAddress: string;
  surveyNumber: string;
  propertyType: string;
  plotLength: string;
  plotWidth: string;
  plotUnit: string;
  northDirection: string;
  adjacentNorth: string;
  adjacentSouth: string;
  adjacentEast: string;
  adjacentWest: string;
  currentOwner: string;
  previousOwners: string;
  officialBoundary: string;
  claimedBoundary: string;
  uncertainBoundary: string;
  encroachmentDetails: string;
  siteFeatures: string;
  boundaryVertices: string;
  caseNotes: string;
};

function text(value?: string) {
  return value?.trim() || "";
}

function fallbackMissingFields(input: any) {
  const missing: string[] = [];

  if (!text(input?.propertyAddress) && !text(input?.surveyNumber)) {
    missing.push("property address or Survey/Khasra number");
  }
  if (!text(input?.currentOwner)) {
    missing.push("current owner");
  }
  if (!input?.plotLength || !input?.plotWidth) {
    missing.push("plot dimensions");
  }
  if (!text(input?.northDirection)) {
    missing.push("north direction");
  }
  if (
    !text(input?.adjacentNorth) &&
    !text(input?.adjacentSouth) &&
    !text(input?.adjacentEast) &&
    !text(input?.adjacentWest) &&
    !text(input?.officialBoundary)
  ) {
    missing.push("adjacent properties or official boundary");
  }

  return missing;
}

function PropertyVisualizerIntakeForm({
  input,
  missing,
  disabled,
  sendMessage,
}: {
  input: any;
  missing: string[];
  disabled?: boolean;
  sendMessage?: (message: any) => unknown;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<IntakeData>({
    propertyAddress: input?.propertyAddress || "",
    surveyNumber: input?.surveyNumber || "",
    propertyType: input?.propertyType || "",
    plotLength: input?.plotLength ? String(input.plotLength) : "",
    plotWidth: input?.plotWidth ? String(input.plotWidth) : "",
    plotUnit: input?.plotUnit || "m",
    northDirection: input?.northDirection || "",
    adjacentNorth: input?.adjacentNorth || "",
    adjacentSouth: input?.adjacentSouth || "",
    adjacentEast: input?.adjacentEast || "",
    adjacentWest: input?.adjacentWest || "",
    currentOwner: input?.currentOwner || "",
    previousOwners: "",
    officialBoundary: input?.officialBoundary || "",
    claimedBoundary: input?.claimedBoundary || "",
    uncertainBoundary: input?.uncertainBoundary || "",
    encroachmentDetails: input?.encroachmentDetails || "",
    siteFeatures: "",
    boundaryVertices: "",
    caseNotes: input?.caseNotes || "",
  });

  const update = (key: keyof IntakeData, value: string) =>
    setFormData((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!sendMessage) return;

    const lines = [
      "Create the property dispute visualizer with these structured details:",
      formData.propertyAddress &&
        `- Property address: ${formData.propertyAddress}`,
      formData.surveyNumber &&
        `- Survey/Khasra number: ${formData.surveyNumber}`,
      formData.propertyType && `- Property type: ${formData.propertyType}`,
      (formData.plotLength || formData.plotWidth) &&
        `- Plot dimensions: ${formData.plotLength} x ${formData.plotWidth} ${formData.plotUnit}`,
      formData.northDirection &&
        `- North direction: ${formData.northDirection}`,
      formData.adjacentNorth && `- Adjacent north: ${formData.adjacentNorth}`,
      formData.adjacentSouth && `- Adjacent south: ${formData.adjacentSouth}`,
      formData.adjacentEast && `- Adjacent east: ${formData.adjacentEast}`,
      formData.adjacentWest && `- Adjacent west: ${formData.adjacentWest}`,
      formData.currentOwner && `- Current owner: ${formData.currentOwner}`,
      formData.previousOwners &&
        `- Previous owners and transfers: ${formData.previousOwners}`,
      formData.officialBoundary &&
        `- Official boundary: ${formData.officialBoundary}`,
      formData.claimedBoundary &&
        `- Claimed boundary: ${formData.claimedBoundary}`,
      formData.uncertainBoundary &&
        `- Uncertain boundary: ${formData.uncertainBoundary}`,
      formData.encroachmentDetails &&
        `- Encroachment details: ${formData.encroachmentDetails}`,
      formData.siteFeatures &&
        `- Site features/infrastructure: ${formData.siteFeatures}`,
      formData.boundaryVertices &&
        `- Boundary coordinates/vertices: ${formData.boundaryVertices}`,
      formData.caseNotes && `- Case notes: ${formData.caseNotes}`,
    ].filter(Boolean);

    sendMessage({
      role: "user" as const,
      parts: [{ type: "text", text: lines.join("\n") }],
    });
    setSubmitted(true);
  };

  if (submitted) return null;

  const inputClass =
    "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary";
  const areaClass =
    "min-h-20 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="mt-3 rounded-xl border bg-background shadow-sm">
      <div className="border-b px-4 py-3">
        <p className="font-semibold text-sm">Property details needed</p>
        <p className="mt-1 text-muted-foreground text-xs">
          Missing: {missing.join(", ")}
        </p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("propertyAddress", event.target.value)}
          placeholder="Property address"
          value={formData.propertyAddress}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("surveyNumber", event.target.value)}
          placeholder="Survey/Khasra number"
          value={formData.surveyNumber}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("currentOwner", event.target.value)}
          placeholder="Current owner"
          value={formData.currentOwner}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("propertyType", event.target.value)}
          placeholder="Property type"
          value={formData.propertyType}
        />
        <div className="grid grid-cols-[1fr_1fr_72px] gap-2">
          <input
            className={inputClass}
            disabled={disabled}
            onChange={(event) => update("plotLength", event.target.value)}
            placeholder="Length"
            type="number"
            value={formData.plotLength}
          />
          <input
            className={inputClass}
            disabled={disabled}
            onChange={(event) => update("plotWidth", event.target.value)}
            placeholder="Width"
            type="number"
            value={formData.plotWidth}
          />
          <input
            className={inputClass}
            disabled={disabled}
            onChange={(event) => update("plotUnit", event.target.value)}
            placeholder="Unit"
            value={formData.plotUnit}
          />
        </div>
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("northDirection", event.target.value)}
          placeholder="North direction"
          value={formData.northDirection}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("adjacentNorth", event.target.value)}
          placeholder="Adjacent north"
          value={formData.adjacentNorth}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("adjacentSouth", event.target.value)}
          placeholder="Adjacent south"
          value={formData.adjacentSouth}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("adjacentEast", event.target.value)}
          placeholder="Adjacent east"
          value={formData.adjacentEast}
        />
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => update("adjacentWest", event.target.value)}
          placeholder="Adjacent west"
          value={formData.adjacentWest}
        />
        <textarea
          className={cn(areaClass, "sm:col-span-2")}
          disabled={disabled}
          onChange={(event) => update("previousOwners", event.target.value)}
          placeholder="Previous owners and transfers, e.g. 1987 Ram Kumar, 1998 sale to Shyam Singh"
          value={formData.previousOwners}
        />
        <textarea
          className={areaClass}
          disabled={disabled}
          onChange={(event) => update("officialBoundary", event.target.value)}
          placeholder="Official boundary"
          value={formData.officialBoundary}
        />
        <textarea
          className={areaClass}
          disabled={disabled}
          onChange={(event) => update("claimedBoundary", event.target.value)}
          placeholder="Claimed boundary"
          value={formData.claimedBoundary}
        />
        <textarea
          className={areaClass}
          disabled={disabled}
          onChange={(event) =>
            update("encroachmentDetails", event.target.value)
          }
          placeholder="Encroachment details"
          value={formData.encroachmentDetails}
        />
        <textarea
          className={areaClass}
          disabled={disabled}
          onChange={(event) => update("siteFeatures", event.target.value)}
          placeholder="Site features, e.g. Borewell north-west, electric pole east, drain south, shed near centre"
          value={formData.siteFeatures}
        />
        <textarea
          className={areaClass}
          disabled={disabled}
          onChange={(event) => update("boundaryVertices", event.target.value)}
          placeholder="Boundary coordinates/vertices, e.g. P1 28.6139,77.2090; P2 easting/northing..."
          value={formData.boundaryVertices}
        />
        <textarea
          className={cn(areaClass, "sm:col-span-2")}
          disabled={disabled}
          onChange={(event) => update("caseNotes", event.target.value)}
          placeholder="Case notes"
          value={formData.caseNotes}
        />
      </div>
      <div className="border-t p-4">
        <Button
          className="w-full gap-2"
          disabled={disabled}
          onClick={submit}
          type="button"
        >
          <Send className="size-4" />
          Submit details
        </Button>
      </div>
    </div>
  );
}

function ExtractionReviewCard({
  output,
  disabled,
  sendMessage,
}: {
  output: any;
  disabled?: boolean;
  sendMessage?: (message: any) => unknown;
}) {
  const [corrections, setCorrections] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const workspace = output?.workspace;
  const facts = Array.isArray(output?.extractedFacts)
    ? output.extractedFacts
    : [];
  const issues = Array.isArray(output?.issues) ? output.issues : [];
  const chronology = Array.isArray(output?.chronology) ? output.chronology : [];
  const evidenceClaims = Array.isArray(workspace?.evidenceClaims)
    ? workspace.evidenceClaims
    : [];
  const sourceChunks = Array.isArray(workspace?.sourceChunks)
    ? workspace.sourceChunks
    : [];

  const confirm = () => {
    if (!sendMessage) return;
    const nextInput = {
      ...(output?.input || {}),
      createWorkspace: true,
      confirmExtractedFacts: true,
      sourceDocuments: workspace?.documents || [],
      extractedFacts: facts,
    };
    sendMessage({
      role: "user" as const,
      parts: [
        {
          type: "text",
          text: [
            "Confirm the extracted property facts and create the property visualizer now.",
            "Call visualizePropertyDispute with this exact structured JSON input:",
            JSON.stringify(nextInput, null, 2),
            corrections ? `Lawyer corrections: ${corrections}` : "",
            "If plot length/width or another required visual field is still missing, return the guided details card instead of another extraction review card.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });
    setSubmitted(true);
  };

  if (submitted) return null;

  return (
    <div className="mt-3 rounded-xl border bg-background shadow-sm">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
          <ClipboardCheck className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">
            Review extracted property facts
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-5">
            {workspace?.sourceSummary ||
              "Juristo extracted draft facts from the provided documents."}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {facts.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {facts.slice(0, 4).map((fact: any, index: number) => (
              <div
                className="rounded-lg border bg-muted/20 p-3 text-xs"
                key={`${fact.sourceDocumentId || "fact"}-${index}`}
              >
                <p className="mb-2 font-semibold">Source fact {index + 1}</p>
                <p>Owner: {fact.owner || "Not extracted"}</p>
                <p>Survey/Khasra: {fact.surveyNumber || "Not extracted"}</p>
                <p>Area: {fact.area || "Not extracted"}</p>
                <p>Confidence: {fact.confidence || "medium"}</p>
              </div>
            ))}
          </div>
        ) : null}

        {chronology.length ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <p className="mb-2 font-semibold">Transaction chronology</p>
            <div className="space-y-1">
              {chronology.slice(0, 5).map((event: any, index: number) => (
                <p key={`${event.title}-${index}`}>
                  {event.year || event.date || "Date unclear"} - {event.title}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {issues.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-amber-900 text-xs">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              {issues.length} extraction issue{issues.length === 1 ? "" : "s"}{" "}
              need review
            </div>
            <div className="space-y-1">
              {issues.slice(0, 4).map((issue: any, index: number) => (
                <p key={`${issue.field}-${index}`}>
                  {issue.message}
                  {issue.sourceChunkIds?.length
                    ? ` Sources: ${issue.sourceChunkIds.join(", ")}`
                    : ""}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {evidenceClaims.length ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <p className="mb-2 font-semibold">Source-backed claims</p>
            <div className="space-y-1">
              {evidenceClaims.slice(0, 5).map((claim: any) => (
                <p key={claim.id}>
                  {claim.label}: {claim.value}
                  {claim.sourceChunkIds?.length
                    ? ` (${claim.sourceChunkIds.join(", ")})`
                    : ""}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {sourceChunks.length ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <p className="mb-2 font-semibold">Source snippets used</p>
            <div className="space-y-2">
              {sourceChunks.slice(0, 3).map((chunk: any) => (
                <p className="text-muted-foreground" key={chunk.id}>
                  {chunk.id} - {chunk.documentName}: {chunk.text}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <textarea
          className="min-h-20 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          disabled={disabled}
          onChange={(event) => setCorrections(event.target.value)}
          placeholder="Optional corrections before confirming..."
          value={corrections}
        />
      </div>

      <div className="border-t p-4">
        <Button
          className="w-full gap-2"
          disabled={disabled}
          onClick={confirm}
          type="button"
        >
          <CheckCircle2 className="size-4" />
          Confirm and generate visualizer
        </Button>
      </div>
    </div>
  );
}

export function VisualizePropertyDisputeTool({
  toolCallId,
  state,
  output,
  input,
  context,
}: ToolPartProps) {
  const [isOpening, setIsOpening] = useState(false);
  const { artifact, setArtifact } = useArtifact();
  const pendingStates = [
    "call",
    "partial-call",
    "input-streaming",
    "input-available",
  ];
  const isStreamActive =
    context.isLoading ||
    context.status === "streaming" ||
    context.status === "submitted";
  const isPendingState = pendingStates.includes(state);
  const isStalledWithoutOutput =
    !output && !isStreamActive && (!state || isPendingState);
  const displayOutput =
    output ||
    (isStalledWithoutOutput
      ? {
          success: false,
          status: "needs_more_info",
          missing: fallbackMissingFields(input),
          input,
          message:
            "Juristo needs a few structured property details before generating the visualizer.",
        }
      : undefined);
  const isLoading = !displayOutput && isStreamActive;

  const openArtifact = async () => {
    if (!displayOutput?.documentId) return;
    if (artifact.documentId === displayOutput.documentId && artifact.content) {
      setArtifact((current) => ({
        ...current,
        documentId: displayOutput.documentId,
        title: displayOutput.title || "Property Visualizer",
        kind: "property-visualizer",
        isVisible: true,
        status: "idle",
      }));
      return;
    }

    setIsOpening(true);
    try {
      const response = await fetch(
        `/api/document?id=${displayOutput.documentId}`
      );
      if (!response.ok) throw new Error("Document not found");
      const documents = await response.json();
      const doc = Array.isArray(documents) ? documents.at(-1) : documents;
      setArtifact((current) => ({
        ...current,
        documentId: displayOutput.documentId,
        title: doc?.title || displayOutput.title || "Property Visualizer",
        kind: "property-visualizer",
        content: doc?.content || "",
        isVisible: true,
        status: "idle",
      }));
    } catch {
      toast.error("Could not open the property visualizer.");
    } finally {
      setIsOpening(false);
    }
  };

  const isDone = displayOutput?.status === "visualizer_created";
  const needsInfo = displayOutput?.status === "needs_more_info";
  const awaitingConfirmation =
    displayOutput?.status === "awaiting_lawyer_confirmation";
  const isUnavailable =
    Boolean(displayOutput) && !isDone && !needsInfo && !awaitingConfirmation;

  return (
    <div className="my-3 w-full max-w-full sm:max-w-2xl" key={toolCallId}>
      <div
        className={cn(
          "rounded-xl border bg-card/80 p-3 shadow-sm sm:rounded-2xl sm:p-4",
          isDone && "border-emerald-200 bg-emerald-50/60",
          needsInfo && "border-amber-200 bg-amber-50/60",
          isUnavailable && "border-destructive/30 bg-destructive/5"
        )}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isDone ? (
              <CheckCircle2 className="size-5 text-emerald-700" />
            ) : isUnavailable ? (
              <AlertTriangle className="size-5 text-destructive" />
            ) : (
              <Map className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">
              {isDone
                ? "Property visualizer ready"
                : awaitingConfirmation
                  ? "Property extraction needs review"
                  : needsInfo
                    ? "Property details needed"
                    : isUnavailable
                      ? "Property visualizer unavailable"
                      : "Preparing property visualizer"}
            </p>
            <p className="mt-1 text-muted-foreground text-xs leading-5">
              {displayOutput?.message ||
                "Juristo is preparing schematic property visuals from structured facts."}
            </p>
          </div>
        </div>
        {isDone ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="gap-2"
              disabled={isOpening}
              onClick={openArtifact}
              size="sm"
              variant="outline"
            >
              {isOpening ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PanelRightOpen className="size-4" />
              )}
              Open visualizer
            </Button>
            <Button asChild className="gap-2" size="sm" variant="outline">
              <a href={`/document/${displayOutput.documentId}?from=chat`}>
                <FileText className="size-4" />
                Open document
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {needsInfo ? (
        <PropertyVisualizerIntakeForm
          disabled={context.isReadonly}
          input={displayOutput?.input || input}
          missing={displayOutput?.missing || fallbackMissingFields(input)}
          sendMessage={context.sendMessage}
        />
      ) : null}

      {awaitingConfirmation ? (
        <ExtractionReviewCard
          disabled={context.isReadonly}
          output={displayOutput}
          sendMessage={context.sendMessage}
        />
      ) : null}
    </div>
  );
}

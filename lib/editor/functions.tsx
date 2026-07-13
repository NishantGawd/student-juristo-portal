"use client";

import { marked } from "marked";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { DOMParser, type Node } from "prosemirror-model";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { documentSchema } from "./config";
import { createSuggestionWidget, type UISuggestion } from "./suggestions";

export const buildDocumentFromContent = (content: string) => {
  console.log("[BUILD DOC] buildDocumentFromContent called, content length:", content?.length || 0);

  if (!content || content.trim() === "") {
    console.log("[BUILD DOC] Empty content, returning empty document");
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = "<p></p>";
    const parser = DOMParser.fromSchema(documentSchema);
    return parser.parse(tempContainer);
  }

  try {
    const parser = DOMParser.fromSchema(documentSchema);
    // Use marked to convert markdown to HTML properly
    const htmlContent = marked.parse(content, { async: false }) as string;
    console.log("[BUILD DOC] Rendered HTML length:", htmlContent?.length || 0);
    console.log("[BUILD DOC] HTML preview:", htmlContent?.substring(0, 200));

    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = htmlContent;
    const result = parser.parse(tempContainer);
    console.log("[BUILD DOC] Parsed document successfully");
    return result;
  } catch (error) {
    console.error("[BUILD DOC] ERROR:", error);
    // Fallback: create a simple text node
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = `<p>${content.substring(0, 500)}...</p>`;
    const parser = DOMParser.fromSchema(documentSchema);
    return parser.parse(tempContainer);
  }
};

export const buildContentFromDocument = (document: Node) => {
  return defaultMarkdownSerializer.serialize(document);
};

export const createDecorations = (
  suggestions: UISuggestion[],
  view: EditorView
) => {
  const decorations: Decoration[] = [];

  for (const suggestion of suggestions) {
    decorations.push(
      Decoration.inline(
        suggestion.selectionStart,
        suggestion.selectionEnd,
        {
          class: "suggestion-highlight",
        },
        {
          suggestionId: suggestion.id,
          type: "highlight",
        }
      )
    );

    decorations.push(
      Decoration.widget(
        suggestion.selectionStart,
        (currentView) => {
          const { dom } = createSuggestionWidget(suggestion, currentView);
          return dom;
        },
        {
          suggestionId: suggestion.id,
          type: "widget",
        }
      )
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
};


"use client";

import { jsPDF } from "jspdf";
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType, BorderStyle, Header, Footer, PageNumber, NumberFormat } from "docx";
import { saveAs } from "file-saver";

// --- PDF EXPORT ---

/**
 * Parses markdown content into structured blocks for professional rendering.
 */
function parseMarkdownBlocks(content: string): Array<{
    type: "heading1" | "heading2" | "heading3" | "paragraph" | "bullet" | "separator" | "table" | "bold-paragraph" | "blockquote";
    text: string;
    rows?: string[][];
}> {
    const blocks: Array<{
        type: "heading1" | "heading2" | "heading3" | "paragraph" | "bullet" | "separator" | "table" | "bold-paragraph" | "blockquote";
        text: string;
        rows?: string[][];
    }> = [];
    const lines = content.split("\n");

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Separator
        if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
            blocks.push({ type: "separator", text: "" });
            i++;
            continue;
        }

        // Table detection
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            const tableRows: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                const row = lines[i].trim();
                // Skip separator rows like |---|---|
                if (!/^\|[\s\-:|]+\|$/.test(row)) {
                    const cells = row.split("|").filter(c => c.trim() !== "").map(c => c.trim());
                    tableRows.push(cells);
                }
                i++;
            }
            if (tableRows.length > 0) {
                blocks.push({ type: "table", text: "", rows: tableRows });
            }
            continue;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
            blocks.push({ type: "heading3", text: trimmed.replace("### ", "") });
            i++;
            continue;
        }
        if (trimmed.startsWith("## ")) {
            blocks.push({ type: "heading2", text: trimmed.replace("## ", "") });
            i++;
            continue;
        }
        if (trimmed.startsWith("# ")) {
            blocks.push({ type: "heading1", text: trimmed.replace("# ", "") });
            i++;
            continue;
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
            blocks.push({ type: "blockquote", text: trimmed.replace(/^>\s*/, "").replace(/\*\*/g, "") });
            i++;
            continue;
        }

        // Bullets
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
            const bulletText = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
            blocks.push({ type: "bullet", text: bulletText });
            i++;
            continue;
        }

        // Bold-only paragraph (like **GOVERNMENT OF INDIA**)
        if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
            blocks.push({ type: "bold-paragraph", text: trimmed.replace(/\*\*/g, "") });
            i++;
            continue;
        }

        // Empty line
        if (trimmed === "") {
            i++;
            continue;
        }

        // Regular paragraph
        blocks.push({ type: "paragraph", text: trimmed });
        i++;
    }

    return blocks;
}

/**
 * Strips markdown formatting from text for PDF rendering.
 */
function stripMarkdown(text: string): string {
    return text
        .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function downloadAsProfessionalPDF(content: string, title: string) {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 20;
    const topMargin = 22;
    const bottomMargin = 22;
    const maxWidth = pageWidth - marginX * 2;
    const contentRight = pageWidth - marginX;
    const footerY = pageHeight - 13;
    let y = topMargin;

    const profileText = `${title}\n${content}`;
    const isResearchReport = /legal research report|executive summary|research method|full source list/i.test(profileText);
    const isContract = /agreement|contract|deed|whereas|governing law|arbitration|party|parties/i.test(profileText);
    const documentLabel = isResearchReport ? "Legal Research Report" : isContract ? "Legal Draft" : "Legal Document";

    doc.setProperties({
        title: stripMarkdown(title),
        subject: "Juristo legal document",
        author: "Juristo Legal AI Platform",
        creator: "Juristo",
    });
    doc.setLineHeightFactor(1.25);

    const drawPageFrame = () => {
        doc.setDrawColor(215, 219, 224);
        doc.setLineWidth(0.25);
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
        doc.setDrawColor(236, 238, 241);
        doc.setLineWidth(0.15);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
    };

    const addPage = () => {
        doc.addPage();
        drawPageFrame();
        y = topMargin;
    };

    const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - bottomMargin) {
            addPage();
        }
    };

    const setTextStyle = (
        size: number,
        style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
        color: [number, number, number] = [32, 32, 32]
    ) => {
        doc.setFont("times", style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
    };

    const writeWrapped = ({
        text,
        x = marginX,
        width = maxWidth,
        lineHeight = 4.8,
        indent = 0,
        firstPrefix,
        align = "left",
    }: {
        text: string;
        x?: number;
        width?: number;
        lineHeight?: number;
        indent?: number;
        firstPrefix?: string;
        align?: "left" | "center" | "right";
    }) => {
        const clean = stripMarkdown(text);
        if (!clean) return;

        const prefixWidth = firstPrefix ? doc.getTextWidth(firstPrefix) + 2 : 0;
        const lines = doc.splitTextToSize(clean, width - indent - prefixWidth);
        for (let index = 0; index < lines.length; index++) {
            ensureSpace(lineHeight + 1);
            const lineX = x + indent + (index === 0 ? prefixWidth : 0);
            if (index === 0 && firstPrefix) {
                doc.text(firstPrefix, x + indent, y);
            }
            doc.text(lines[index], lineX, y, { align });
            y += lineHeight;
        }
    };

    const renderTable = (rows: string[][]) => {
        if (!rows.length) return;
        const colCount = Math.max(...rows.map((row) => row.length));
        const colWidth = maxWidth / colCount;
        const cellPadding = 2;

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const isHeader = rowIndex === 0 && rows.length > 1;
            setTextStyle(isHeader ? 8.8 : 8.4, isHeader ? "bold" : "normal", [34, 34, 34]);

            const cellLines = Array.from({ length: colCount }).map((_, colIndex) =>
                doc.splitTextToSize(stripMarkdown(row[colIndex] || ""), colWidth - cellPadding * 2)
            );
            const rowHeight = Math.max(8, Math.max(...cellLines.map((lines) => lines.length)) * 3.8 + cellPadding * 2);
            ensureSpace(rowHeight + 2);

            if (isHeader) {
                doc.setFillColor(242, 245, 248);
                doc.rect(marginX, y, maxWidth, rowHeight, "F");
            }

            doc.setDrawColor(198, 204, 212);
            doc.setLineWidth(0.18);

            for (let colIndex = 0; colIndex < colCount; colIndex++) {
                const cellX = marginX + colIndex * colWidth;
                doc.rect(cellX, y, colWidth, rowHeight);
                const lines = cellLines[colIndex];
                lines.forEach((line: string, lineIndex: number) => {
                    doc.text(line, cellX + cellPadding, y + cellPadding + 3 + lineIndex * 3.8);
                });
            }

            y += rowHeight;
        }
        y += 4;
    };

    drawPageFrame();

    setTextStyle(7.5, "bold", [94, 101, 112]);
    doc.text(documentLabel.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += 6;

    setTextStyle(16, "bold", [12, 18, 28]);
    const titleLines = doc.splitTextToSize(stripMarkdown(title).toUpperCase(), maxWidth - 12);
    for (const titleLine of titleLines) {
        ensureSpace(8);
        doc.text(titleLine, pageWidth / 2, y, { align: "center" });
        y += 7.5;
    }
    y += 2;
    doc.setDrawColor(40, 72, 112);
    doc.setLineWidth(0.45);
    doc.line(marginX + 18, y, contentRight - 18, y);
    y += 8;

    const blocks = parseMarkdownBlocks(content);
    const hasStampHeader = content.includes("NON-JUDICIAL E-STAMP PAPER") || content.includes("e-Stamp Certificate");
    let skipUntilSeparator = hasStampHeader;
    let separatorCount = 0;

    for (const block of blocks) {
        if (skipUntilSeparator) {
            if (block.type === "separator") {
                separatorCount++;
                if (separatorCount >= 2) skipUntilSeparator = false;
            }
            continue;
        }

        const cleanText = stripMarkdown(block.text);

        switch (block.type) {
            case "heading1": {
                ensureSpace(18);
                y += 3;
                setTextStyle(13.5, "bold", [12, 18, 28]);
                const lines = doc.splitTextToSize(cleanText.toUpperCase(), maxWidth);
                for (const line of lines) {
                    doc.text(line, marginX, y);
                    y += 6.2;
                }
                y += 2.5;
                break;
            }
            case "heading2": {
                ensureSpace(16);
                y += 3;
                setTextStyle(11.6, "bold", [15, 45, 82]);
                const lines = doc.splitTextToSize(cleanText, maxWidth);
                for (const line of lines) {
                    doc.text(line, marginX, y);
                    y += 5.4;
                }
                doc.setDrawColor(86, 111, 143);
                doc.setLineWidth(0.25);
                doc.line(marginX, y, marginX + Math.min(doc.getTextWidth(cleanText), maxWidth), y);
                y += 3.5;
                break;
            }
            case "heading3":
                ensureSpace(13);
                y += 2;
                setTextStyle(10.5, "bold", [35, 35, 35]);
                writeWrapped({ text: cleanText, lineHeight: 4.9 });
                y += 1.5;
                break;
            case "bold-paragraph":
                setTextStyle(10.2, "bold", [20, 20, 20]);
                writeWrapped({ text: cleanText, lineHeight: 4.8 });
                y += 1.5;
                break;
            case "paragraph":
                setTextStyle(10.2, "normal", [32, 32, 32]);
                writeWrapped({ text: cleanText, lineHeight: 4.9 });
                y += 2;
                break;
            case "bullet":
                setTextStyle(10.1, "normal", [34, 34, 34]);
                writeWrapped({
                    text: cleanText,
                    x: marginX + 2,
                    width: maxWidth - 2,
                    indent: 3,
                    firstPrefix: "\u2022",
                    lineHeight: 4.8,
                });
                y += 1.3;
                break;
            case "blockquote": {
                setTextStyle(9.4, "italic", [88, 88, 88]);
                const lines = doc.splitTextToSize(cleanText, maxWidth - 10);
                const quoteHeight = lines.length * 4.4 + 4;
                ensureSpace(quoteHeight);
                doc.setDrawColor(178, 184, 192);
                doc.setLineWidth(1);
                doc.line(marginX + 1, y - 2, marginX + 1, y + quoteHeight - 2);
                for (const line of lines) {
                    doc.text(line, marginX + 6, y);
                    y += 4.4;
                }
                y += 3;
                break;
            }
            case "separator":
                ensureSpace(8);
                y += 2;
                doc.setDrawColor(196, 201, 209);
                doc.setLineWidth(0.25);
                doc.line(marginX, y, contentRight, y);
                y += 5;
                break;
            case "table":
                renderTable(block.rows || []);
                break;
        }
    }

    const pageCount = doc.getNumberOfPages();
    const generationDate = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
        doc.setPage(pageIndex);
        drawPageFrame();
        doc.setDrawColor(196, 201, 209);
        doc.setLineWidth(0.25);
        doc.line(marginX, footerY - 3, contentRight, footerY - 3);
        doc.setFontSize(7.2);
        doc.setFont("times", "normal");
        doc.setTextColor(112, 112, 112);
        doc.text(`Drafted via Juristo Legal AI Platform | ${generationDate}`, marginX, footerY);
        doc.text(`Page ${pageIndex} of ${pageCount}`, contentRight, footerY, { align: "right" });
    }

    doc.save(`${title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

/**
 * Download content as a professional PDF with contract formatting.
 */
export async function downloadAsPDF(content: string, title: string) {
    try {
        await downloadAsProfessionalPDF(content, title);
        return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 18;
        const maxWidth = pageWidth - margin * 2;
        const contentRight = pageWidth - margin;
        let y = margin;

        // Detect if content has a legacy stamp header to skip
        const hasStampHeader = content.includes("NON-JUDICIAL E-STAMP PAPER") || content.includes("e-Stamp Certificate");

        // --- PAGE BORDER ---
        const drawPageBorder = (pageDoc: jsPDF) => {
            pageDoc.setDrawColor(100, 100, 100);
            pageDoc.setLineWidth(0.5);
            pageDoc.rect(8, 8, pageWidth - 16, pageHeight - 16);
            // Inner border
            pageDoc.setLineWidth(0.2);
            pageDoc.rect(10, 10, pageWidth - 20, pageHeight - 20);
        };

        drawPageBorder(doc);

        // Skip any legacy stamp header blocks in the content (they are no longer generated)

        // --- CONTRACT TITLE ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        // Clean title of markdown
        const cleanTitle = stripMarkdown(title).toUpperCase();
        const titleLines = doc.splitTextToSize(cleanTitle, maxWidth);
        for (const tl of titleLines) {
            doc.text(tl, pageWidth / 2, y, { align: "center" });
            y += 7;
        }
        y += 4;

        // --- CONTENT PARSING & RENDERING ---
        const blocks = parseMarkdownBlocks(content);

        // Skip stamp header blocks from content since we rendered them above
        let skipUntilSeparator = hasStampHeader;
        let separatorCount = 0;

        for (const block of blocks) {
            if (skipUntilSeparator) {
                if (block.type === "separator") {
                    separatorCount++;
                    if (separatorCount >= 2) {
                        skipUntilSeparator = false;
                    }
                }
                continue;
            }

            // Page break check
            const neededSpace = block.type === "table" ? (block.rows?.length || 1) * 6 + 10 : 12;
            if (y + neededSpace > pageHeight - 22) {
                doc.addPage();
                drawPageBorder(doc);
                y = margin + 4;
            }

            const cleanText = stripMarkdown(block.text);

            switch (block.type) {
                case "heading1":
                    y += 4;
                    doc.setFontSize(14);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    const h1Lines = doc.splitTextToSize(cleanText.toUpperCase(), maxWidth);
                    for (const l of h1Lines) {
                        doc.text(l, margin, y);
                        y += 6;
                    }
                    y += 2;
                    break;

                case "heading2":
                    y += 3;
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(0, 30, 60);
                    const h2Lines = doc.splitTextToSize(cleanText, maxWidth);
                    for (const l of h2Lines) {
                        doc.text(l, margin, y);
                        y += 5.5;
                    }
                    // Underline for H2
                    doc.setDrawColor(0, 51, 102);
                    doc.setLineWidth(0.3);
                    doc.line(margin, y, margin + Math.min(doc.getTextWidth(cleanText), maxWidth), y);
                    y += 3;
                    break;

                case "heading3":
                    y += 2;
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(30, 30, 30);
                    const h3Lines = doc.splitTextToSize(cleanText, maxWidth);
                    for (const l of h3Lines) {
                        doc.text(l, margin, y);
                        y += 5;
                    }
                    y += 1;
                    break;

                case "bold-paragraph":
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    const boldLines = doc.splitTextToSize(cleanText, maxWidth);
                    for (const l of boldLines) {
                        if (y + 5 > pageHeight - 22) {
                            doc.addPage();
                            drawPageBorder(doc);
                            y = margin + 4;
                        }
                        doc.text(l, margin, y);
                        y += 5;
                    }
                    y += 1;
                    break;

                case "paragraph":
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(30, 30, 30);
                    const pLines = doc.splitTextToSize(cleanText, maxWidth);
                    for (const l of pLines) {
                        if (y + 5 > pageHeight - 22) {
                            doc.addPage();
                            drawPageBorder(doc);
                            y = margin + 4;
                        }
                        doc.text(l, margin, y);
                        y += 5;
                    }
                    y += 2;
                    break;

                case "bullet":
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(30, 30, 30);
                    const bLines = doc.splitTextToSize(cleanText, maxWidth - 8);
                    for (let j = 0; j < bLines.length; j++) {
                        if (y + 5 > pageHeight - 22) {
                            doc.addPage();
                            drawPageBorder(doc);
                            y = margin + 4;
                        }
                        if (j === 0) {
                            doc.text("•", margin + 2, y);
                        }
                        doc.text(bLines[j], margin + 8, y);
                        y += 5;
                    }
                    y += 1;
                    break;

                case "blockquote":
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(100, 100, 100);
                    // Draw left border
                    doc.setDrawColor(180, 180, 180);
                    doc.setLineWidth(1.5);
                    const qLines = doc.splitTextToSize(cleanText, maxWidth - 10);
                    const qHeight = qLines.length * 4.5;
                    doc.line(margin + 2, y - 3, margin + 2, y - 3 + qHeight + 2);
                    for (const l of qLines) {
                        if (y + 5 > pageHeight - 22) {
                            doc.addPage();
                            drawPageBorder(doc);
                            y = margin + 4;
                        }
                        doc.text(l, margin + 6, y);
                        y += 4.5;
                    }
                    y += 2;
                    break;

                case "separator":
                    y += 2;
                    doc.setDrawColor(150, 150, 150);
                    doc.setLineWidth(0.3);
                    doc.line(margin, y, contentRight, y);
                    y += 4;
                    break;

                case "table":
                    {
                    const tableRows = block.rows ?? [];
                    if (tableRows.length > 0) {
                        const colCount = tableRows[0].length;
                        const colWidth = maxWidth / colCount;

                        for (let r = 0; r < tableRows.length; r++) {
                            if (y + 7 > pageHeight - 22) {
                                doc.addPage();
                                drawPageBorder(doc);
                                y = margin + 4;
                            }

                            const row = tableRows[r];
                            const isHeader = r === 0 && tableRows.length > 1;

                            doc.setFontSize(9);
                            doc.setFont("helvetica", isHeader ? "bold" : "normal");
                            doc.setTextColor(30, 30, 30);

                            // Row background for header
                            if (isHeader) {
                                doc.setFillColor(240, 240, 245);
                                doc.rect(margin, y - 4, maxWidth, 7, "F");
                            }

                            // Cell borders
                            doc.setDrawColor(200, 200, 200);
                            doc.setLineWidth(0.2);

                            for (let c = 0; c < colCount; c++) {
                                const cellText = stripMarkdown(row[c] || "");
                                const cellX = margin + c * colWidth;
                                doc.rect(cellX, y - 4, colWidth, 7);
                                const truncated = doc.splitTextToSize(cellText, colWidth - 4);
                                doc.text(truncated[0] || "", cellX + 2, y);
                            }
                            y += 7;
                        }
                        y += 3;
                    }
                    }
                    break;
            }
        }

        // --- FOOTER ON ALL PAGES ---
        const pageCount = doc.getNumberOfPages();
        const generationDate = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Footer separator
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 14, contentRight, pageHeight - 14);

            // Footer text
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Drafted via Juristo Legal AI Platform | ${generationDate}`,
                margin,
                pageHeight - 10
            );
            doc.text(
                `Page ${i} of ${pageCount}`,
                contentRight,
                pageHeight - 10,
                { align: "right" }
            );
        }

        doc.save(`${title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
    } catch (error) {
        console.error("[PDF DOWNLOAD] Error:", error);
        throw error;
    }
}

// --- DOCX EXPORT ---

/**
 * Download content as a professional DOCX with contract formatting.
 */
export async function downloadAsDOCX(content: string, title: string) {
    const lines = content.split("\n");
    const children: Paragraph[] = [];
    const hasStampHeader = content.includes("NON-JUDICIAL E-STAMP PAPER") || content.includes("e-Stamp Certificate");  // legacy detection

    // --- TITLE ---
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: title.toUpperCase(),
                    bold: true,
                    size: 32,
                    font: "Times New Roman",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "003366" },
            },
        })
    );

    // Process content
    let inTable = false;
    let skipStampBlock = hasStampHeader;
    let separatorCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();

        // Skip legacy stamp header blocks entirely
        if (skipStampBlock) {
            if (trimmedLine === "---" || trimmedLine === "***") {
                separatorCount++;
                if (separatorCount >= 2) {
                    skipStampBlock = false;
                }
            }
            continue;
        }

        // Empty line
        if (!trimmedLine) {
            children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
            continue;
        }

        // Separators
        if (trimmedLine === "---" || trimmedLine === "***") {
            children.push(
                new Paragraph({
                    text: "",
                    spacing: { before: 200, after: 200 },
                    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "CCCCCC" } },
                })
            );
            continue;
        }

        // Skip table separator rows
        if (/^\|[\s\-:|]+\|$/.test(trimmedLine)) continue;

        // Table rows
        if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
            const cells = trimmedLine.split("|").filter(c => c.trim() !== "").map(c => c.trim().replace(/\*\*/g, ""));
            if (cells.length >= 2) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: cells[0] + "  ", bold: true, size: 20, font: "Times New Roman" }),
                            new TextRun({ text: cells.slice(1).join("  "), size: 20, font: "Times New Roman" }),
                        ],
                        spacing: { after: 60 },
                        indent: { left: 360 },
                    })
                );
            }
            continue;
        }

        // Blockquotes
        if (trimmedLine.startsWith("> ")) {
            const quoteText = trimmedLine.replace(/^>\s*/, "").replace(/\*\*/g, "").replace(/⚠️/g, "").trim();
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: quoteText, italics: true, size: 18, color: "666666", font: "Times New Roman" })],
                    indent: { left: 720 },
                    spacing: { before: 100, after: 100 },
                    border: { left: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
                })
            );
            continue;
        }

        // Headings
        if (trimmedLine.startsWith("# ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: trimmedLine.replace("# ", "").toUpperCase(), bold: true, size: 28, font: "Times New Roman" })],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                    alignment: AlignmentType.CENTER,
                })
            );
        } else if (trimmedLine.startsWith("## ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: trimmedLine.replace("## ", ""), bold: true, size: 24, font: "Times New Roman", color: "003366" })],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "003366" } },
                })
            );
        } else if (trimmedLine.startsWith("### ")) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: trimmedLine.replace("### ", ""), bold: true, size: 22, font: "Times New Roman" })],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                })
            );
        } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
            // Bullet items
            const bulletText = trimmedLine.substring(2);
            const runs = parseInlineMarkdown(bulletText, 20);
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: "• ", size: 20, font: "Times New Roman" }), ...runs],
                    indent: { left: 720 },
                    spacing: { after: 60 },
                })
            );
        } else {
            // Regular paragraph with inline markdown parsing
            const runs = parseInlineMarkdown(trimmedLine, 20);
            children.push(
                new Paragraph({
                    children: runs,
                    spacing: { after: 100 },
                })
            );
        }
    }

    // --- FOOTER ---
    children.push(
        new Paragraph({
            text: "",
            spacing: { before: 400 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" } },
        })
    );
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Drafted via Juristo Legal AI Platform | ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`,
                    italics: true,
                    size: 16,
                    color: "808080",
                    font: "Times New Roman",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
        })
    );

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.replace(/[^a-z0-9]/gi, "_")}.docx`);
}

/**
 * Parse inline markdown (bold, italic) into TextRun array.
 */
function parseInlineMarkdown(text: string, fontSize: number): TextRun[] {
    const runs: TextRun[] = [];
    // Simple regex-based parsing for bold and italic
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
            runs.push(new TextRun({
                text: part.slice(2, -2),
                bold: true,
                size: fontSize,
                font: "Times New Roman",
            }));
        } else if (part.startsWith("*") && part.endsWith("*")) {
            runs.push(new TextRun({
                text: part.slice(1, -1),
                italics: true,
                size: fontSize,
                font: "Times New Roman",
            }));
        } else if (part) {
            runs.push(new TextRun({
                text: part,
                size: fontSize,
                font: "Times New Roman",
            }));
        }
    }

    return runs.length > 0 ? runs : [new TextRun({ text: text, size: fontSize, font: "Times New Roman" })];
}

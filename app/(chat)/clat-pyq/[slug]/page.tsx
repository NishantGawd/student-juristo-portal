import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Updated for Next.js 15: params is now a Promise
interface PageProps {
  params: Promise<{ slug: string }>;
}

// 1. Helper to decode the slug back into usable data mapping to your pyq_pdfs folder
function decodeSlug(slug: string) {
  if (!slug) return null;
  
  const matches = slug.match(/clat-(\d{4})-?(.*)?/i);
  if (!matches) return null;

  const year = matches[1];
  let set = "Official Paper";
  
  if (matches[2]) {
    // Converts "set-a" back to "Set A"
    set = matches[2].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  // Map back to your exact PDF filenames in the public/pyq_pdfs folder
  let pdfPath = `/pyq_pdfs/${year}.pdf`; // Default for 2023 to 2008 official papers
  if (set === "Set A") pdfPath = `/pyq_pdfs/${year}-set A.pdf`;
  if (set === "Set B") pdfPath = `/pyq_pdfs/${year}-set B.pdf`;
  if (set === "Set C") pdfPath = year === "2024" ? `/pyq_pdfs/2024 set C.pdf` : `/pyq_pdfs/${year}-set C.pdf`;
  if (set === "Set D") pdfPath = `/pyq_pdfs/${year}-set D.pdf`;

  // Restore the KnowledgeNation link specifically for 2025 Set A
  if (year === "2025" && set === "Set A") {
    pdfPath = "https://knowledgenation.co.in/images/clat-2025-question-paper.pdf";
  }

  return { year, set, pdfPath };
}

// 2. Generate Dynamic SEO Meta Tags for Google Bots
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await the params promise before accessing the slug
  const resolvedParams = await params;
  const details = decodeSlug(resolvedParams.slug);
  
  if (!details) return { title: "CLAT Past Year Question Paper | Juristo AI" };

  const title = `CLAT ${details.year} Solved Previous Year Question Paper (${details.set}) | Juristo AI`;
  const description = `Practice the official CLAT ${details.year} ${details.set} past year question paper. Download the PDF, view the answer key, or convert it into a highly interactive AI mock drill on Juristo AI.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://chat.juristo.in/clat-pyq/${resolvedParams.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://chat.juristo.in/clat-pyq/${resolvedParams.slug}`,
      siteName: "Juristo AI",
      type: "website",
    },
  };
}

// 3. Render the UI
export default async function ClatPyqSeoPage({ params }: PageProps) {
  // Await the params promise before accessing the slug
  const resolvedParams = await params;
  const details = decodeSlug(resolvedParams.slug);

  if (!details) {
    notFound(); // Triggers your Next.js 404 page if the URL is invalid
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background font-sans">
      {/* Top Navigation Bar */}
      <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3 shadow-sm md:px-6 md:py-4">
        
        {/* ADDED ml-10 md:ml-12 HERE: This pushes the back button rightwards, clearing the sidebar toggle */}
        <div className="flex items-center gap-2 md:gap-4 ml-10 md:ml-12">
          
          {/* Desktop Back Button */}
          <Button asChild size="sm" variant="ghost" className="hidden md:flex">
            <Link href="/clat-exam?tab=pyq">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          
          {/* Mobile Back Button */}
          <Button asChild size="icon" variant="ghost" className="md:hidden">
            <Link href="/clat-exam?tab=pyq">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight md:text-lg">
                CLAT {details.year} Past Paper
              </h1>
              <p className="text-xs text-muted-foreground">{details.set}</p>
            </div>
          </div>
        </div>
      </header>

      {/* The Embedded PDF Viewer */}
      <main className="flex-1 bg-muted/30 p-2 md:p-6">
        <div className="h-full w-full overflow-hidden rounded-xl border bg-background shadow-lg">
          <iframe
            src={`${details.pdfPath}#toolbar=1&navpanes=0`}
            className="h-full w-full"
            title={`CLAT ${details.year} ${details.set} Question Paper PDF`}
          />
        </div>
      </main>
    </div>
  );
}
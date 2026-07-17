import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Helper to decode the slug back into usable data mapping to your pyq_pdfs folder
function decodeSlug(slug: string) {
  if (!slug) return null;
  
  const matches = slug.match(/clat-(\d{4})-?(.*)?/i);
  if (!matches) return null;

  const year = matches[1];
  let set = "Official Paper";
  
  if (matches[2]) {
    set = matches[2].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  let pdfPath = `/pyq_pdfs/${year}.pdf`;
  if (set === "Set A") pdfPath = `/pyq_pdfs/${year}-set A.pdf`;
  if (set === "Set B") pdfPath = `/pyq_pdfs/${year}-set B.pdf`;
  if (set === "Set C") pdfPath = year === "2024" ? `/pyq_pdfs/2024 set C.pdf` : `/pyq_pdfs/${year}-set C.pdf`;
  if (set === "Set D") pdfPath = `/pyq_pdfs/${year}-set D.pdf`;

  if (year === "2025" && set === "Set A") {
    pdfPath = "https://knowledgenation.co.in/images/clat-2025-question-paper.pdf";
  }

  return { year, set, pdfPath };
}

// Generate Dynamic SEO Meta Tags
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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

export default async function ClatPyqSeoPage({ params }: PageProps) {
  const resolvedParams = await params;
  const details = decodeSlug(resolvedParams.slug);

  if (!details) {
    notFound();
  }

  return (
    <div className="flex h-screen w-full flex-col bg-white dark:bg-[#0C1222] font-sans text-zinc-900 dark:text-zinc-100 selection:bg-[#4169E1]/10 selection:text-[#4169E1]">
      
      {/* ─── PREMIUM OUTLINED TOP NAVIGATION HEADER ─── */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] px-4 py-3 md:px-6 md:py-4 select-none">
        
        {/* Margin adjusted to push elements comfortably clearing sidebar icons */}
        <div className="flex items-center gap-4 ml-12 md:ml-14">
          
          {/* Desktop Back Trigger */}
          <Button asChild size="sm" variant="ghost" className="hidden md:flex rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 font-medium text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 h-9 px-4">
            <Link href="/clat-exam?tab=pyq">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          
          {/* Mobile Back Trigger */}
          <Button asChild size="icon" variant="ghost" className="md:hidden rounded-none border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 h-9 w-9">
            <Link href="/clat-exam?tab=pyq">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#080D1A] text-zinc-500 dark:text-zinc-400">
              <FileText className="h-4 w-4" />
            </div>
            <div className="text-left space-y-0.5">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-zinc-900 dark:text-white font-serif">
                CLAT {details.year} Past Paper
              </h1>
              <p className="text-[10px] font-mono font-bold uppercase text-[#4169E1] tracking-wider leading-none">
                {details.set}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── FULL-WIDTH EMBEDDED DOCUMENT VIEWPORT ─── */}
      <main className="flex-1 bg-zinc-50 dark:bg-[#080D1A]/40 p-2 md:p-6">
        <div className="h-full w-full overflow-hidden rounded-none border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0C1222] shadow-none">
          <iframe
            src={`${details.pdfPath}#toolbar=1&navpanes=0`}
            className="h-full w-full invert-0 dark:brightness-[0.95] dark:contrast-[1.05]"
            title={`CLAT ${details.year} ${details.set} Question Paper PDF`}
          />
        </div>
      </main>
    </div>
  );
}
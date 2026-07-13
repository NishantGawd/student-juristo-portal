import { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Create Account",
  description:
    "Create a Juristo AI account for Indian legal research, contract drafting, document review, CLAT learning, and lawyer consultations.",
  path: "/register",
  noIndex: true,
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

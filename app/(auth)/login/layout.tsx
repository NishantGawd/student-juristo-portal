import { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Login",
  description:
    "Sign in to Juristo AI to manage legal chats, contract drafts, document reviews, and lawyer consultations.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

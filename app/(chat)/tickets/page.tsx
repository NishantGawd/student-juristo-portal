import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/app/(auth)/auth";
import { TicketsContent } from "@/components/tickets-content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
    title: "Support Tickets",
    description:
        "View and manage private Juristo AI support tickets for your legal AI workspace.",
    path: "/tickets",
    noIndex: true,
});

export default async function TicketsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    return (
        <TicketsContent 
            userEmail={session.user.email || ""} 
        />
    );
}
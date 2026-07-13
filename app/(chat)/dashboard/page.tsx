import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { DashboardContent } from "@/components/dashboard-new";
import {
  getChatCountByUserId,
  getContractPurchasesByUserId,
  getDocumentsByUserId,
  getLiveChatSessionsByUserId,
  getUserUsage,
} from "@/lib/db/queries";
import { getMemories } from "@/lib/mem0/client";
import { NotificationService } from "@/lib/notifications/service";
import { getRazorpaySubscription } from "@/lib/razorpay";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Legal AI Dashboard",
  description:
    "Manage your Juristo AI legal document drafts, contract purchases, chat usage, memories, notifications, and consultations.",
  path: "/dashboard",
  noIndex: true,
});

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [
    userStats,
    allPurchases,
    actualChatCount,
    allDraftedDocuments,
    allConsultations,
    initialMemories,
    notifications,
  ] = await Promise.all([
    getUserUsage(session.user.id),
    getContractPurchasesByUserId({ userId: session.user.id }),
    getChatCountByUserId(session.user.id),
    getDocumentsByUserId({ userId: session.user.id }),
    getLiveChatSessionsByUserId(session.user.id),
    getMemories(session.user.id),
    NotificationService.getUserNotifications(session.user.id),
  ]);

  if (!userStats) {
    redirect("/login");
  }

  const recentPurchases = allPurchases.slice(0, 50);
  const recentDocuments = allDraftedDocuments.slice(0, 50);

  let usedConsultationMins = 0;
  for (const c of allConsultations) {
    if (c.status === "completed" && c.vettingStartedAt && c.endTime) {
      const dur =
        new Date(c.endTime).getTime() - new Date(c.vettingStartedAt).getTime();
      usedConsultationMins += Math.max(0, dur / (1000 * 60));
    }
  }

  let subscriptionData = null;
  if ((userStats as any).subscriptionId?.startsWith("sub_")) {
    const sub = await getRazorpaySubscription((userStats as any).subscriptionId);
    if (sub) {
      subscriptionData = {
        status: sub.status,
        currentStart: sub.current_start ? new Date(sub.current_start * 1000).toLocaleDateString() : null,
        currentEnd: sub.current_end ? new Date(sub.current_end * 1000).toLocaleDateString() : null,
        nextCharge: sub.charge_at ? new Date(sub.charge_at * 1000).toLocaleDateString() : null,
      };
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DashboardContent
        notifications={notifications}
        consultations={allConsultations}
        draftedDocuments={recentDocuments}
        initialMemories={initialMemories}
        purchases={recentPurchases}
        totalDocuments={allDraftedDocuments.length}
        totalPurchases={allPurchases.length}
        user={{
          id: session.user.id,
          email: session.user.email || "",
          plan: userStats.plan || "free",
          subscriptionData,
          tokensUsed: userStats.tokensUsed || "0",
          miniTokensUsed: (userStats as any).miniTokensUsed || "0",
          macroTokensUsed: (userStats as any).macroTokensUsed || "0",
          maxTokensUsed: (userStats as any).maxTokensUsed || "0",
          chatCount: String(actualChatCount),
          draftCount: userStats.draftCount || "0",
          analysisCount: userStats.analysisCount || "0",
          odrPacketCount: (userStats as any).odrPacketCount || "0",
          consultationCount: String(allConsultations.length),
          usedConsultationMins,
          phone: userStats.phone || "",
          phoneVerified: userStats.phoneVerified || false,
          workArea: userStats.workArea || "",
          referralSource: (userStats as any).referralSource || "",
        }}
      />
    </div>
  );
}

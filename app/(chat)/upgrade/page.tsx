import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getUserUsage } from "@/lib/db/queries";
import { UpgradeUI } from "@/components/upgrade-ui";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing & Upgrade",
  description:
    "Upgrade Juristo AI for higher legal AI usage, premium contract templates, advanced drafting, and priority legal workflow features.",
  path: "/upgrade",
  keywords: [
    "Juristo AI pricing",
    "legal AI subscription India",
    "legal AI plans",
    "contract template pricing",
  ],
  noIndex: true,
});

export default async function UpgradePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const userStats = await getUserUsage(session.user.id);
    const plan = userStats?.plan || "free";

    return <UpgradeUI currentPlan={plan} />;
}


import { auth } from "@/app/(auth)/auth";
import { getUserUsage } from "@/lib/db/queries";
import { getLimit } from "@/lib/usage/plan-limits";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await getUserUsage(session.user.id);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const tokensUsed = parseInt(user.tokensUsed || "0", 10);
        const tokensLimit = getLimit(user.plan, "tokens");
        const chatsUsed = parseInt(user.chatCount || "0", 10);
        const chatsLimit = getLimit(user.plan, "chats");
        const draftsUsed = parseInt(user.draftCount || "0", 10);
        const draftsLimit = getLimit(user.plan, "drafts");
        const odrPacketsUsed = parseInt((user as any).odrPacketCount || "0", 10);
        const odrPacketsLimit = getLimit(user.plan, "odrPackets");

        return NextResponse.json({
            plan: user.plan,
            tokens: {
                used: tokensUsed,
                limit: tokensLimit,
                percentage: tokensLimit === -1 ? 0 : Math.min(100, (tokensUsed / tokensLimit) * 100),
            },
            chats: {
                used: chatsUsed,
                limit: chatsLimit,
                percentage: chatsLimit === -1 ? 0 : Math.min(100, (chatsUsed / chatsLimit) * 100),
            },
            drafts: {
                used: draftsUsed,
                limit: draftsLimit,
                percentage: draftsLimit === -1 ? 0 : Math.min(100, (draftsUsed / draftsLimit) * 100),
            },
            odrPackets: {
                used: odrPacketsUsed,
                limit: odrPacketsLimit,
                percentage: odrPacketsLimit === -1 ? 0 : odrPacketsLimit === 0 ? 100 : Math.min(100, (odrPacketsUsed / odrPacketsLimit) * 100),
            },
        });
    } catch (error) {
        console.error("Error fetching usage:", error);
        return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
    }
}


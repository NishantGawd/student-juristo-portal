import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;

        const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
        const startingAfter = searchParams.get("starting_after");
        const endingBefore = searchParams.get("ending_before");

        if (startingAfter && endingBefore) {
            return NextResponse.json(
                { error: "Only one of starting_after or ending_before can be provided." },
                { status: 400 }
            );
        }

        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const chatsData = await getChatsByUserId({
            id: session.user.id,
            limit,
            startingAfter: startingAfter ?? null,
            endingBefore: endingBefore ?? null,
        });

        // Strict Filter: Keep entries focused on student learning & drop corporate legal workflows
        const corporateKeywords = ["odr", "contract", "agreement", "nda", "lawyer", "rental", "deed", "dispute", "incorporation", "notice for unpaid"];
        
        const filteredChats = chatsData.chats.filter(c => {
            const titleLower = (c.title || "").toLowerCase();
            return !corporateKeywords.some(keyword => titleLower.includes(keyword));
        });

        return NextResponse.json({
            chats: filteredChats,
            hasMore: chatsData.hasMore
        });
    } catch (error) {
        console.error("History GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const result = await deleteAllChatsByUserId({ userId: session.user.id });

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("History DELETE Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
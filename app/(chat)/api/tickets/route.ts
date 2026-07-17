import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { helpdeskTickets, helpdeskMessages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tickets = await db.query.helpdeskTickets.findMany({
            where: eq(helpdeskTickets.userId, session.user.id),
            orderBy: [desc(helpdeskTickets.createdAt)],
            with: {
                messages: { orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)] }
            }
        });

        const formattedTickets = tickets.map((t: any) => ({
            ...t,
            userID: t.userId,
            queryDate: t.createdAt,
            lastUpdated: t.updatedAt,
            responses: t.messages.map((m: any) => ({
                text: m.text,
                responseBy: m.senderType,
                responseDate: m.createdAt,
                attachment: m.attachment,
                attachmentURL: typeof m.attachment === 'object' && m.attachment !== null
                    ? (m.attachment as any).url || (m.attachment as any).data
                    : m.attachment || null
            }))
        }));

        return NextResponse.json(
            { success: true, tickets: formattedTickets },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            }
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { queryId, replyText, attachmentURL } = body;

        await db.insert(helpdeskMessages).values({
            ticketId: queryId,
            senderType: "User",
            text: replyText || "",
            attachment: attachmentURL || null, 
        });

        const [updatedTicket] = await db.update(helpdeskTickets)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(helpdeskTickets.queryId, queryId))
            .returning();

        return NextResponse.json({ success: true, ticket: updatedTicket });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: "Reply failed" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const queryId = `Q${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const newTicket = {
            queryId,
            userId: session.user.id,
            username: session.user.name || "User",
            userEmail: session.user.email || "",
            userPlan: body.userPlan || "basic",
            category: body.category || "General Inquiry",
            priority: body.priority || "medium",
            platform: "v2", // Explicitly tag as V2
            status: "Opened",
            queryText: body.queryText,
            attachment: body.attachment || null,
        };

        const [insertedTicket] = await db.insert(helpdeskTickets).values(newTicket).returning();

        const formattedTicket = {
            ...insertedTicket,
            userID: insertedTicket.userId,
            queryDate: insertedTicket.createdAt,
            lastUpdated: insertedTicket.updatedAt,
            responses: []
        };

        return NextResponse.json({
            success: true,
            ticket: formattedTicket
        }, { status: 201 });
    } catch (error: any) {
        console.error("Create Ticket Error:", error.message);
        return NextResponse.json({ success: false, error: "Failed to create ticket", details: error.message }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserUsage } from "@/lib/db/queries";
import {
  addMemory,
  deleteAllMemories,
  deleteMemory,
  getMemories,
  updateMemory,
} from "@/lib/mem0/client";
import { getLimit } from "@/lib/usage/plan-limits";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memories = await getMemories(session.user.id);
    return NextResponse.json({ memories });
  } catch (error: any) {
    console.error("[Memory API] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch memories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, metadata } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Check memory limit
    const user = await getUserUsage(session.user.id);
    const memoryLimit = getLimit(user?.plan, "memories" as any);

    if (memoryLimit !== -1) {
      const existing = await getMemories(session.user.id);
      if (existing.length >= memoryLimit) {
        return NextResponse.json(
          {
            error: "LIMIT_REACHED",
            message: `Memory limit reached (${memoryLimit}). Upgrade your plan for more memories.`,
            limit: memoryLimit,
            used: existing.length,
          },
          { status: 403 }
        );
      }
    }

    const result: any = await addMemory(session.user.id, content, metadata);

    if (result?._error || result?.error) {
      const isUpstreamDown = result.status >= 500;
      return NextResponse.json(
        {
          error: isUpstreamDown
            ? "Memory service is temporarily unavailable. Your message was processed but the memory wasn't saved. Please try again shortly."
            : result.message || result.error || "Failed to add memory",
          status: result.status,
          retryable: isUpstreamDown,
        },
        { status: result.status === 429 ? 429 : isUpstreamDown ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[Memory API] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add memory" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, content } = await request.json();
    if (!id || !content) {
      return NextResponse.json(
        { error: "id and content are required" },
        { status: 400 }
      );
    }

    const result: any = await updateMemory(id, content);

    if (result?._error || result?.error || result?.success === false) {
      return NextResponse.json(
        {
          error: result.message || result.error || "Failed to update memory",
        },
        { status: result.status === 429 ? 429 : 500 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[Memory API] PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update memory" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("id");
    const deleteAll = searchParams.get("all");

    if (deleteAll === "true") {
      await deleteAllMemories(session.user.id);
      return NextResponse.json({ success: true, deleted: "all" });
    }

    if (!memoryId) {
      return NextResponse.json(
        { error: "Memory id is required" },
        { status: 400 }
      );
    }

    const result: any = await deleteMemory(memoryId);

    if (result?._error || result?.error || result?.success === false) {
      return NextResponse.json(
        {
          error: result.message || result.error || "Failed to delete memory",
        },
        { status: result.status === 429 ? 429 : 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: memoryId });
  } catch (error: any) {
    console.error("[Memory API] DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete memory" },
      { status: 500 }
    );
  }
}

"use server";

import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function dismissQuizAnnouncementAction() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db
      .update(user)
      .set({ quizAnnouncementSeen: true })
      .where(eq(user.id, session.user.id));
      
    // Set the cookie for 1 year
    cookieStore.set("quiz_announcement_dismissed", "true", { maxAge: 31536000, path: "/" });
      
    // Revalidate the layout so the modal doesn't show again
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update user preference:", error);
    return { error: "Failed to dismiss announcement" };
  }
}

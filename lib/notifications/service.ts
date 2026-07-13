import { db } from "@/lib/db/queries";
import { notification } from "@/lib/db/schema";
import { sendEmail, type EmailAttachment } from "@/lib/email/index";
import { NotificationTemplates } from "./templates";
import { eq, and, ne, desc, inArray } from "drizzle-orm";

export type EventType =
  | "USER_ONBOARDED"
  | "PAYMENT_ABANDONED"
  | "PAYMENT_FAILED"
  | "PAYMENT_SUCCESSFUL"
  | "CONSULTATION_REQUESTED"
  | "CONSULTATION_ACCEPTED"
  | "CONSULTATION_REMINDER"
  | "USAGE_THRESHOLD_REACHED"
  | "UPGRADE_RECOMMENDED"
  | "SUBSCRIPTION_EVENT"
  | "DOCUMENT_GENERATED"
  | "DOCUMENT_FAILED";

interface TriggerPayload {
  userId?: string;
  userEmail: string;
  userName?: string;
  targetName?: string; // document, consultation subject, plan name
  targetUrl?: string; // meet link, checkout link, doc link
  extraData?: any; // any percentage, paymentId, etc.
}

export class NotificationService {
  /**
   * Main entry point to trigger an event in the system.
   */
  static async triggerEvent(event: EventType, payload: TriggerPayload) {
    try {
      // 1. Generate Email Content based on Event
      let emailContent = null;
      switch (event) {
        case "USER_ONBOARDED":
          emailContent = NotificationTemplates.WelcomeEmail(payload.userName || "");
          break;
        case "PAYMENT_ABANDONED":
          emailContent = NotificationTemplates.AbandonedCheckoutEmail(
            payload.userName || "",
            payload.targetName || "your item",
            payload.targetUrl || "#"
          );
          break;
        case "PAYMENT_FAILED":
          emailContent = NotificationTemplates.PaymentFailedEmail(
            payload.userName || "",
            payload.targetName || "your item",
            payload.targetUrl || "#"
          );
          break;
        case "PAYMENT_SUCCESSFUL":
          emailContent = NotificationTemplates.PaymentSuccessfulEmail(
            payload.userName || "",
            payload.targetName || "your purchase",
            payload.extraData?.amount || "your payment",
            payload.targetUrl || ""
          );
          break;
        case "CONSULTATION_REQUESTED":
          emailContent = NotificationTemplates.ConsultationRequestedEmail(
            payload.userName || "",
            payload.targetName || "your lawyer"
          );
          break;
        case "CONSULTATION_ACCEPTED":
          emailContent = NotificationTemplates.ConsultationAcceptedEmail(
            payload.userName || "",
            payload.targetName || "Your lawyer",
            payload.targetUrl || ""
          );
          break;
        case "CONSULTATION_REMINDER":
          emailContent = NotificationTemplates.ConsultationReminderEmail(
            payload.userName || "",
            payload.targetName || "the lawyer"
          );
          break;
        case "USAGE_THRESHOLD_REACHED":
          emailContent = NotificationTemplates.UsageThresholdEmail(
            payload.userName || "",
            payload.extraData?.threshold || "80"
          );
          break;
        case "UPGRADE_RECOMMENDED":
          emailContent = NotificationTemplates.UpgradeRecommendedEmail(payload.userName || "");
          break;
        case "SUBSCRIPTION_EVENT":
          emailContent = NotificationTemplates.SubscriptionEventEmail(
            payload.userName || "",
            payload.targetName || "Your subscription has been updated."
          );
          break;
        case "DOCUMENT_GENERATED":
          emailContent = NotificationTemplates.DocumentGeneratedEmail(
            payload.userName || "",
            payload.targetName || "Document",
            payload.targetUrl || "#"
          );
          break;
        case "DOCUMENT_FAILED":
          emailContent = NotificationTemplates.DocumentFailedEmail(
            payload.userName || "",
            payload.targetName || "Document"
          );
          break;
      }

      let status: "PENDING" | "SENT" | "FAILED" = "PENDING";
      let errorMsg = null;

      // 2. Dispatch Email
      if (emailContent) {
        try {
          let attachments: EmailAttachment[] | undefined

          await sendEmail({
            to: payload.userEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            attachments,
          });
          status = "SENT";
        } catch (e: any) {
          console.error(`[NotificationService] Failed to send email for ${event}`, e);
          status = "FAILED";
          errorMsg = e.message || "Email dispatch failed";
        }
      } else {
        // If no email content matched, maybe it's IN_APP only.
        status = "SENT"; 
      }

      // 3. Log to Database
      if (payload.userId) {
        await db.insert(notification).values({
          userId: payload.userId,
          userEmail: payload.userEmail,
          type: emailContent ? "EMAIL" : "IN_APP",
          event: event,
          title: emailContent?.subject || event,
          message: emailContent ? "Email notification sent." : "System notification.",
          status: status,
          payload: payload,
          errorMessage: errorMsg,
        });

        // Auto-delete old notifications (keep only latest 20)
        const userNotifs = await db
          .select({ id: notification.id })
          .from(notification)
          .where(eq(notification.userId, payload.userId))
          .orderBy(desc(notification.createdAt))
          .offset(20);
          
        if (userNotifs.length > 0) {
          const idsToDelete = userNotifs.map(n => n.id);
          await db.delete(notification).where(inArray(notification.id, idsToDelete));
        }
      }

      return { success: status === "SENT", status };
    } catch (error) {
      console.error("[NotificationService] Critical error triggering event:", error);
      return { success: false, error };
    }
  }

  /**
   * Fetches unread notifications for a user
   */
  static async getUserNotifications(userId: string) {
    return await db
      .select()
      .from(notification)
      .where(and(eq(notification.userId, userId), ne(notification.status, "FAILED")))
      .orderBy(desc(notification.createdAt))
      .limit(20);
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return await db
      .update(notification)
      .set({ status: "READ" })
      .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";

const OPTIONAL_KEYS = ["quiz", "newsletter", "reminder", "marketing"] as const;
const LOCKED_KEYS = ["transactional", "account"] as const;
const DEFAULT_ORDER = [...LOCKED_KEYS, ...OPTIONAL_KEYS];

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function getEmailTokenSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || "juristo-email-preferences";
}

function verifyEmailPreferenceToken(email: string, token: string | null, purpose: "preferences") {
  if (!token) {
    return false;
  }

  const expected = createHmac("sha256", getEmailTokenSecret())
    .update(`${purpose}:${normalizeEmail(email)}`)
    .digest("hex");
  const tokenBuffer = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}

function normalizeOrder(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_ORDER;
  }

  const allowed = new Set<string>([...LOCKED_KEYS, ...OPTIONAL_KEYS]);
  const clean = value.filter((item): item is string => typeof item === "string" && allowed.has(item));
  const missing = DEFAULT_ORDER.filter((item) => !clean.includes(item));

  return [...clean, ...missing];
}

async function validatePreferenceRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get("email") || "");
  const token = searchParams.get("token");

  if (email && verifyEmailPreferenceToken(email, token, "preferences")) {
    return { email };
  }

  const session = await auth();
  const sessionEmail = normalizeEmail(session?.user?.email || "");

  if (!sessionEmail) {
    return { error: NextResponse.json({ success: false, error: "Invalid email preference link" }, { status: 400 }) };
  }

  return { email: sessionEmail };
}

export async function GET(request: NextRequest) {
  const result = await validatePreferenceRequest(request);
  if (result.error) {
    return result.error;
  }

  const email = result.email;
  const subscriber = await db.query.newsletterSubscribers.findFirst({
    where: eq(newsletterSubscribers.email, email),
  });

  return NextResponse.json({
    success: true,
    email,
    locked: {
      transactional: {
        enabled: true,
        locked: true,
        label: "Security, OTP and payment alerts",
      },
      account: {
        enabled: true,
        locked: true,
        label: "Critical account information",
      },
    },
    optional: {
      quiz: subscriber?.quizEmailsEnabled !== false,
      newsletter: subscriber?.newsletterEmailsEnabled !== false,
      reminder: subscriber?.onboardingReminderEmailsEnabled !== false,
      marketing: subscriber?.marketingEmailsEnabled !== false,
    },
    order: normalizeOrder(subscriber?.emailPreferenceOrder),
  });
}

export async function PATCH(request: NextRequest) {
  const result = await validatePreferenceRequest(request);
  if (result.error) {
    return result.error;
  }

  const email = result.email;
  const body = await request.json().catch(() => ({}));
  const optional = body.optional && typeof body.optional === "object" ? body.optional : {};
  const now = new Date().toISOString();
  const values = {
    email,
    name: email.split("@")[0],
    source: "v2_notification_center",
    type: "Email Preferences",
    isActive: true,
    isConfirmed: true,
    marketingEmailsEnabled: optional.marketing !== false,
    newsletterEmailsEnabled: optional.newsletter !== false,
    quizEmailsEnabled: optional.quiz !== false,
    onboardingReminderEmailsEnabled: optional.reminder !== false,
    emailPreferenceOrder: normalizeOrder(body.order),
    unsubscribedAt: null,
    updatedAt: now,
  };

  await db
    .insert(newsletterSubscribers)
    .values(values)
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: values,
    });

  return NextResponse.json({ success: true, message: "Email preferences updated." });
}

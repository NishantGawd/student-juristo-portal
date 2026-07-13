"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { createUser, getUser } from "@/lib/db/queries";
import { signIn, signOut } from "./auth";

const authFormSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Fixed: Swapped default route hook from legacy corporate chat to student dashboard
const DEFAULT_AUTH_REDIRECT = "/clat-exam?tab=dashboard";
const POST_ONBOARDING_COOKIE = "post_onboarding_callback";

const registerFormSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    audience: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function getSafeRedirect(rawRedirect: FormDataEntryValue | string | null) {
  if (typeof rawRedirect !== "string" || !rawRedirect.trim()) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (!rawRedirect.startsWith("/") || rawRedirect.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (
    rawRedirect === "/" ||
    rawRedirect.startsWith("/login") ||
    rawRedirect.startsWith("/register")
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return rawRedirect;
}

async function rememberPostOnboardingRedirect(redirectTo: string) {
  const cookieStore = await cookies();
  cookieStore.set(POST_ONBOARDING_COOKIE, redirectTo, {
    httpOnly: true,
    maxAge: 60 * 30,
    path: "/",
    sameSite: "lax",
  });
}

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const redirectTo = getSafeRedirect(formData.get("callbackUrl"));
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await rememberPostOnboardingRedirect(redirectTo);

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirectTo,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    if (error instanceof AuthError) {
      console.error("[Auth] Login failed:", error.type);
      return { status: "failed" };
    }

    throw error;
  }
};

export const loginWithGoogle = async (callbackUrl?: string) => {
  const redirectTo = getSafeRedirect(callbackUrl ?? null);
  await rememberPostOnboardingRedirect(redirectTo);
  await signIn("google", { redirectTo });
};

export const logOut = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("chat-model");
  cookieStore.delete(POST_ONBOARDING_COOKIE);
  revalidatePath("/", "layout");
  await signOut({ redirect: false });
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  let validatedData: z.infer<typeof registerFormSchema>;

  try {
    const redirectTo = getSafeRedirect(formData.get("callbackUrl"));
    validatedData = registerFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("mobile") || undefined,
      audience: formData.get("audience") || undefined,
    });
    await rememberPostOnboardingRedirect(redirectTo);
  } catch (error) {
    console.error("[v0] Validation error during registration:", error);
    return { status: "invalid_data" };
  }

  try {
    const existingUser = await getUser(validatedData.email);

    if (existingUser && existingUser.length > 0) {
      return { status: "user_exists" };
    }

    await createUser(
      validatedData.email,
      validatedData.password,
      validatedData.firstName,
      validatedData.lastName,
      validatedData.phone,
      validatedData.audience
    );
  } catch (error) {
    console.error(
      "[Auth] Database insertion error during registration:",
      error
    );
    return { status: "failed" };
  }

  try {
    const redirectTo = getSafeRedirect(formData.get("callbackUrl"));
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirectTo,
    });
    return { status: "success" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "failed" };
    }
    throw error;
  }
};
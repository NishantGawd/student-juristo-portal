import { NextRequest, NextResponse } from "next/server";
import { createUser, getUser } from "@/lib/db/queries";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import disposableDomains from 'disposable-email-domains';

// Password validation - minimum 8 characters
const isPasswordValid = (password: string): boolean => {
  return password.length >= 8;
};

// Trim and validate email format and check against disposable domains
const isEmailValid = (email: string): boolean => {
  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_REGEX.test(normalizedEmail)) return false;
  
  const domain = normalizedEmail.split('@')[1];
  if (disposableDomains.includes(domain)) return false;
  
  return true;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword, firstName, lastName, phone } = body;

    // ✅ Validate required fields
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, confirmPassword" },
        { status: 400 }
      );
    }

    if (!isEmailValid(email)) {
      return NextResponse.json(
        { error: "Invalid email format or disposable email addresses are not allowed." },
        { status: 400 }
      );
    }

    // ✅ Validate password strength
    if (!isPasswordValid(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ✅ Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // ✅ Check if email already exists
    const existingUsers = await getUser(email.toLowerCase().trim());
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Email already registered. Please sign in instead." },
        { status: 409 }
      );
    }

    // ✅ Create new user with profile info
    const newUser = await createUser(
      email.toLowerCase().trim(),
      password,
      firstName?.trim() || undefined,
      lastName?.trim() || undefined,
      phone?.trim() || undefined
    );

    if (!newUser || newUser.length === 0) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    const user = newUser[0];

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[v0] Registration error:", error);
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 }
    );
  }
}
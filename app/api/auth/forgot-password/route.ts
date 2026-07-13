import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/queries';
import { user } from '@/lib/db/schema';
import { sendPasswordResetEmail } from '@/lib/email';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);

    const foundUser = users[0];

    if (!foundUser) {
      // Don't reveal if email exists (security best practice)
      return NextResponse.json(
        { 
          message: 'If an account with this email exists, a password reset link will be sent.' 
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await db
      .update(user)
      .set({
        passwordResetToken: resetTokenHash,
        passwordResetTokenExpiry: resetTokenExpiry,
      })
      .where(eq(user.id, foundUser.id));

    // Send email with reset link
    const resetUrl = `https://chat.juristo.in/reset-password?token=${resetToken}&email=${email}`;
    await sendPasswordResetEmail(
      email,
      foundUser.firstName || 'User',
      resetUrl
    );

    return NextResponse.json(
      { 
        message: 'Password reset link has been sent to your email. Please check your inbox.' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

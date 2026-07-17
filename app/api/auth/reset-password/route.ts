import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { validatePasswordStrength } from '@/lib/auth/password-validation';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { token, email, newPassword } = await request.json();

        // Validate inputs
        if (!token || !email || !newPassword) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                { error: passwordValidation.message },
                { status: 400 }
            );
        }

        // Hash the token to match what's in the database
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with matching token and check expiry
        const users = await db
            .select()
            .from(user)
            .where(
                and(
                    eq(user.email, email.toLowerCase()),
                    eq(user.passwordResetToken, resetTokenHash),
                    gt(user.passwordResetTokenExpiry, new Date())
                )
            )
            .limit(1);

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        const foundUser = users[0];

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password and clear reset token
        await db
            .update(user)
            .set({
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetTokenExpiry: null,
            })
            .where(eq(user.id, foundUser.id));

        return NextResponse.json(
            { message: 'Password has been reset successfully.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('[v0] Reset password error:', error);
        return NextResponse.json(
            { error: 'An error occurred. Please try again later.' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        // ✅ BUG FIX: Read from the secure custom headers we set on the frontend
        const token = request.headers.get('x-reset-token');
        const email = request.headers.get('x-reset-email');

        console.log("Header Token:", token ? "Exists" : "null");
        console.log("Header Email:", email);

        if (!token || !email) {
            return NextResponse.json(
                { error: 'Missing token or email in headers' },
                { status: 400 }
            );
        }

        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const users = await db
            .select()
            .from(user)
            .where(
                and(
                    eq(user.email, email.toLowerCase()),
                    eq(user.passwordResetToken, resetTokenHash),
                    gt(user.passwordResetTokenExpiry, new Date())
                )
            )
            .limit(1);

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        return NextResponse.json({ valid: true }, { status: 200 });
    } catch (error) {
        console.error('[v0] Token verification error:', error);
        return NextResponse.json(
            { error: 'An error occurred while verifying the token' },
            { status: 500 }
        );
    }
}
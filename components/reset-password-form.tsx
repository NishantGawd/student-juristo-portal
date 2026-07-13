'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordStrengthIndicator } from '@/components/password-strength-indicator';
import { Spinner } from '@/components/ui/spinner';
import { validatePasswordStrength } from '@/lib/auth/password-validation';

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);

    // --- FORM CHECKER LOGIC ---
    const { isFormValid, matchError, strengthError } = useMemo(() => {
        const validation = validatePasswordStrength(password);

        // 1. Check if passwords match
        const passwordsMatch = password === confirmPassword && password !== '';

        // 2. Check industry norms (Length, Upper, Lower, Number, Special)
        // Your current validatePasswordStrength logic defines 'fair' as >= 3 checks passed
        // For "Industry Norms" we typically want 'good' (4/5) or 'strong' (5/5).
        // If you want at least medium strength, we check validation.strength !== 'weak'
        const isStrongEnough = validation.isValid; // isValid in your lib means it hits the core regex requirements

        return {
            isFormValid: passwordsMatch && isStrongEnough,
            matchError: confirmPassword && !passwordsMatch ? "Passwords do not match" : null,
            strengthError: password && !isStrongEnough ? validation.message : null
        };
    }, [password, confirmPassword]);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token || !email) {
                setError('Invalid reset link. Missing token or email.');
                setVerifying(false);
                return;
            }

            try {
                // ✅ BUG FIX: Send data securely through HTTP Headers instead of the URL string
                const response = await fetch('/api/auth/reset-password', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-reset-token': token,
                        'x-reset-email': email
                    },
                    cache: 'no-store',
                });

                if (!response.ok) {
                    setError('This reset link has expired or is invalid. Please request a new one.');
                    setVerifying(false);
                    return;
                }

                setTokenValid(true);
            } catch (err) {
                setError('Failed to verify reset link. Please try again.');
                console.error('[v0] Token verification error:', err);
            } finally {
                setVerifying(false);
            }
        };

        verifyToken();
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return; // Guard clause

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    email,
                    newPassword: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('[v0] Reset password error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="flex justify-center py-8">
                <Spinner />
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-red-800 font-medium mb-2">Link Expired or Invalid</p>
                <p className="text-red-700 text-sm mb-4">{error}</p>
                <a
                    href="/login"
                    className="inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
                >
                    Back to Login
                </a>
            </div>
        );
    }

    if (success) {
        return (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-green-800 font-medium mb-2">✓ Password Reset Successful</p>
                <p className="text-green-700 text-sm">
                    Your password has been reset. Redirecting to login...
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    New Password
                </label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                />
            </div>

            <PasswordStrengthIndicator password={password} />

            <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                </label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={matchError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    disabled={loading}
                    required
                />
                {matchError && <p className="text-xs text-red-500 mt-1">{matchError}</p>}
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <Button
                type="submit"
                // ✅ BUTTON ENABLED ONLY IF ALL CONDITIONS ARE MET
                disabled={loading || !isFormValid}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Spinner className="mr-2" />
                        Resetting...
                    </>
                ) : (
                    'Reset Password'
                )}
            </Button>

            {/* Visual hint for why the button is disabled */}
            {!isFormValid && password && confirmPassword && (
                <p className="text-[10px] text-gray-400 text-center uppercase tracking-wider">
                    Please ensure passwords match and meet strength requirements
                </p>
            )}
        </form>
    );
}
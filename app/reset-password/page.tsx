import { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
    title: 'Reset Password',
    description: 'Reset your Juristo AI account password securely.',
    path: '/reset-password',
    noIndex: true,
});

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Reset Password
                        </h1>
                        <p className="text-gray-600">
                            Enter your new password below to regain access to your account.
                        </p>
                    </div>

                    <Suspense fallback={<div className="text-center text-sm text-gray-600">Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Remember your password?{' '}
                        <a
                            href="/login"
                            className="font-medium text-blue-600 hover:text-blue-700 transition"
                        >
                            Sign in
                        </a>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-500">
                    <p>
                        If you didn&apos;t request a password reset, you can safely ignore this email.
                    </p>
                </div>
            </div>
        </div>
    );
}

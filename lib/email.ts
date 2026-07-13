import { sendEmail } from "@/lib/email/index";

export async function sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string
) {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #000; }
        .content { background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
        .title { font-size: 20px; font-weight: 600; color: #000; margin-bottom: 15px; }
        .text { font-size: 14px; color: #666; margin-bottom: 15px; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; color: #991b1b; font-size: 13px; }
    </style>
    </head>
    <body>
    <div class="container">
        <div class="header">
            <div class="logo">Juristo</div>
        </div>
        <div class="content">
            <div class="title">Password Reset Request</div>
            <p class="text">Hi ${name},</p>
            <p class="text">We received a request to reset your password. Click below to continue.</p>
            <div class="button-container">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p class="text">Or paste this link:</p>
            <p class="text">${resetUrl}</p>
            <div class="warning">
                This link expires in 1 hour. If you didn’t request this, ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>© 2024 Juristo</p>
        </div>
    </div>
    </body>
    </html>`;

    try {
        await sendEmail({
            to: email,
            subject: "Reset Your Juristo Password",
            html: htmlContent,
            from: "info@juristo.in",
            replyTo: "info@juristo.in",
        });
        console.log("Password reset email sent via AWS SES");
        return { success: true, data: true };

    } catch (error) {
        console.error("Error sending password reset email via AWS SES:", error);
        return { success: false, error };
    }
}

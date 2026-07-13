type EmailTemplateData = {
  subject: string;
  html: string;
};

const baseTemplate = (content: string) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #09090b; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #fafafa; font-size: 28px; font-weight: 600; margin: 0;">Juristo AI</h1>
  </div>
  <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px;">
    ${content}
  </div>
  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #52525b; font-size: 12px;">© ${new Date().getFullYear()} Juristo AI. All rights reserved.</p>
  </div>
</div>
`;

export const NotificationTemplates = {
  WelcomeEmail: (name: string): EmailTemplateData => ({
    subject: "Welcome to Juristo AI!",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Welcome aboard!</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Your account has been successfully set up. Juristo AI is your personal legal assistant, ready to help you with contract reviews, legal queries, and more.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://chat.juristo.in/dashboard" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Get Started</a>
      </div>
    `),
  }),

  AbandonedCheckoutEmail: (name: string, targetName: string, checkoutUrl: string): EmailTemplateData => ({
    subject: "Did you forget something?",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Complete your purchase</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">We noticed you left ${targetName} in your cart. Did you face any issues during checkout? We're here to help.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="${checkoutUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Continue Purchase</a>
      </div>
    `),
  }),

  PaymentFailedEmail: (name: string, targetName: string, checkoutUrl: string): EmailTemplateData => ({
    subject: "Payment Failed Action Required",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Payment Failed</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">We couldn't process your payment for ${targetName}. Please update your payment method to avoid any interruption in service.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="${checkoutUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Try Again</a>
      </div>
    `),
  }),

  PaymentSuccessfulEmail: (name: string, targetName: string, amount: string, _invoiceUrl: string): EmailTemplateData => ({
    subject: `Payment Receipt: ${targetName}`,
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Payment Successful</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">We have successfully received your payment of <strong style="color: #10b981;">${amount}</strong> for <strong>${targetName}</strong>.</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Your invoice is attached to this email as a PDF. Please save it for your records.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://chat.juristo.in/dashboard" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Dashboard</a>
      </div>
    `),
  }),

  ConsultationRequestedEmail: (name: string, lawyerName: string): EmailTemplateData => ({
    subject: "Consultation Request Sent",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Request Sent!</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Your consultation request has been sent to ${lawyerName}. We will notify you as soon as they accept.</p>
    `),
  }),

  ConsultationAcceptedEmail: (name: string, lawyerName: string, meetLink: string): EmailTemplateData => ({
    subject: "Consultation Accepted!",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Good News!</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">${lawyerName} has accepted your consultation request!</p>
      ${meetLink ? `
      <div style="text-align: center; margin-top: 32px;">
        <a href="${meetLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Join Meeting</a>
      </div>` : ''}
    `),
  }),

  ConsultationReminderEmail: (name: string, lawyerName: string): EmailTemplateData => ({
    subject: "Action Required: Pending Consultation",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Pending Request</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Your consultation request to ${lawyerName} is still pending. If you haven't heard back soon, you can cancel it and select another lawyer.</p>
    `),
  }),

  UsageThresholdEmail: (name: string, threshold: string): EmailTemplateData => ({
    subject: `Usage Alert: ${threshold}% of Plan Reached`,
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Usage Update</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">You have reached ${threshold}% of your current plan limits. Consider upgrading to avoid interruptions.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://chat.juristo.in/upgrade" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">View Plans</a>
      </div>
    `),
  }),

  UpgradeRecommendedEmail: (name: string): EmailTemplateData => ({
    subject: "Recommendation: Time to Upgrade!",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Upgrade Your Plan</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Based on your recent heavy usage, we recommend upgrading to a higher tier plan so you can continue working without limits.</p>
    `),
  }),

  SubscriptionEventEmail: (name: string, eventDetails: string): EmailTemplateData => ({
    subject: "Subscription Update",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Subscription Status</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">${eventDetails}</p>
    `),
  }),

  DocumentGeneratedEmail: (name: string, documentTitle: string, documentUrl: string): EmailTemplateData => ({
    subject: "Your Document is Ready",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Document Ready!</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Good news! Your document "${documentTitle}" has been successfully generated.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="${documentUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">View Document</a>
      </div>
    `),
  }),

  DocumentFailedEmail: (name: string, documentTitle: string): EmailTemplateData => ({
    subject: "Document Generation Failed",
    html: baseTemplate(`
      <h2 style="color: #fafafa; font-size: 20px; margin-top: 0;">Action Required</h2>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Hi ${name || 'there'},</p>
      <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">Unfortunately, the generation for "${documentTitle}" failed. Please try again or contact support if the issue persists.</p>
    `),
  }),
};

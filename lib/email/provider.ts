import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export interface EmailAttachment {
  name: string;
  content: string;
  mime_type: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

const region = process.env.AWS_SES_REGION || process.env.AWS_REGION;
const defaultFromEmail = process.env.AWS_SES_FROM || process.env.AWS_SES_FROM_EMAIL || "info@juristo.in";
const defaultFromName = process.env.AWS_SES_FROM_NAME || "Juristo";
const defaultReplyToEmail = process.env.AWS_SES_REPLY_TO || process.env.AWS_SES_REPLY_TO_EMAIL || defaultFromEmail;

let sesClient: SESv2Client | null = null;

function getSesClient() {
  if (sesClient) {
    return sesClient;
  }

  if (!region) {
    throw new Error("AWS region is not configured.");
  }

  sesClient = new SESv2Client({ region });
  return sesClient;
}

function htmlToText(html: string) {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function encodeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function buildRawEmail(params: {
  from: string;
  fromName: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const boundaryMixed = `mixed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const boundaryAlternative = `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

  const headers = [
    `From: "${encodeHeaderValue(params.fromName)}" <${encodeHeaderValue(params.from)}>`,
    `To: ${encodeHeaderValue(params.to)}`,
    `Reply-To: ${encodeHeaderValue(params.replyTo)}`,
    `Subject: ${encodeHeaderValue(params.subject)}`,
    `MIME-Version: 1.0`,
  ];

  if (params.attachments?.length) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundaryMixed}"`);

    const parts = [
      `--${boundaryMixed}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlternative}"`,
      "",
      `--${boundaryAlternative}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      "",
      params.text,
      "",
      `--${boundaryAlternative}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      "",
      params.html,
      "",
      `--${boundaryAlternative}--`,
      "",
    ];

    for (const attachment of params.attachments) {
      parts.push(
        `--${boundaryMixed}`,
        `Content-Type: ${attachment.mime_type}; name="${encodeHeaderValue(attachment.name)}"`,
        `Content-Disposition: attachment; filename="${encodeHeaderValue(attachment.name)}"`,
        `Content-Transfer-Encoding: base64`,
        "",
      );

      const base64Chunks = attachment.content.match(/.{1,76}/g) || [attachment.content];
      parts.push(...base64Chunks, "");
    }

    parts.push(`--${boundaryMixed}--`, "");
    return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  }

  headers.push(`Content-Type: multipart/alternative; boundary="${boundaryAlternative}"`);

  const body = [
    `--${boundaryAlternative}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    params.text,
    "",
    `--${boundaryAlternative}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    params.html,
    "",
    `--${boundaryAlternative}--`,
    "",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${body.join("\r\n")}`;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const {
    to,
    subject,
    html,
    from = defaultFromEmail,
    replyTo = defaultReplyToEmail,
    attachments,
  } = options;

  const rawEmail = buildRawEmail({
    from,
    fromName: defaultFromName,
    to,
    replyTo,
    subject,
    html,
    text: htmlToText(html),
    attachments,
  });

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: {
      ToAddresses: [to],
    },
    ReplyToAddresses: [replyTo],
    Content: {
      Raw: {
        Data: Buffer.from(rawEmail),
      },
    },
  });

  await getSesClient().send(command);
}

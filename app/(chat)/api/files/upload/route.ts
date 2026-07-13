import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

const { Buffer } = require("buffer");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const bucketName = process.env.S3_BUCKET_NAME;

// Allowed file types for document attachments
const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain", // .txt
  "text/csv", // .csv
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max files per request
const MAX_FILES = 10;

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    })
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
      message: `File type not supported. Allowed types: images, PDF, DOC, DOCX, XLS, XLSX, TXT, CSV`,
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!bucketName) {
    console.error("S3_BUCKET_NAME is not defined in environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const formData = await request.formData();

    // Get all files from formData
    const files: File[] = [];
    formData.forEach((value, key) => {
      if (key === "file" && value instanceof File) {
        files.push(value);
      }
    });

    // If single file upload (backward compatibility)
    if (files.length === 0) {
      const file = formData.get("file") as File | null;
      if (file) {
        files.push(file);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per upload` },
        { status: 400 }
      );
    }

    // Validate all files
    const errors: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validatedFile = FileSchema.safeParse({ file });

      if (!validatedFile.success) {
        const errorMessages = validatedFile.error.errors
          .map((error) => error.message)
          .join(", ");
        errors.push(`File "${file.name}": ${errorMessages}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join("; ") },
        { status: 400 }
      );
    }

    // Upload all files to S3
    const uploadResults = [];

    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueFilename = `${session.user?.id || "anonymous"}/${timestamp}-${safeName}`;

        const uploadCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: uniqueFilename,
          Body: buffer,
          ContentType: file.type,
          CacheControl: "public, max-age=31536000",
        });

        await s3Client.send(uploadCommand);

        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "eu-north-1"}.amazonaws.com/${uniqueFilename}`;

        uploadResults.push({
          url: publicUrl,
          name: file.name,
          contentType: file.type,
          size: file.size,
        });
      } catch (uploadError) {
        console.error(`Failed to upload file ${file.name} to S3:`, uploadError);
        errors.push(`Failed to upload "${file.name}"`);
      }
    }

    if (uploadResults.length === 0) {
      return NextResponse.json(
        { error: "All uploads failed" },
        { status: 500 }
      );
    }

    // Return single file result for backward compatibility, or array for multiple
    if (uploadResults.length === 1) {
      return NextResponse.json(uploadResults[0]);
    }

    return NextResponse.json({
      files: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}


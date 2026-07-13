import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { trackUserActivity } from "@/lib/activity/tracking";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (Images, PDFs, Word Docs)
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isWord = file.type.includes("msword") || file.type.includes("wordprocessingml");

    if (!isImage && !isPdf && !isWord) {
      return NextResponse.json(
        { error: "Only Images, PDFs, and Word Documents are supported." },
        { status: 415 }
      );
    }

    // Validate file size (max 10MB to match the frontend UI limits)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and create unique ID
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniquePublicId = `${Date.now()}-${originalName}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadResponse: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "lawyer_consultation_files", // 🟢 Routes to your requested folder
          resource_type: "auto", // Essential for PDFs and Word docs
          public_id: uniquePublicId,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const session = await auth();
    if (session?.user?.id) {
      trackUserActivity({
        userId: session.user.id,
        eventType: "file_uploaded",
        sourceTable: "Document",
        sourceId: uploadResponse.public_id,
        textPreview: `Uploaded file: ${file.name}`,
        keywords: [file.type, "upload"],
        metadata: {
          filename: file.name,
          size: file.size,
          type: file.type,
          url: uploadResponse.secure_url
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      url: uploadResponse.secure_url,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
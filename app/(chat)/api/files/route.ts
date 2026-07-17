import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getContractPurchase } from "@/lib/db/queries";
import { lawyerContract } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";

const REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.S3_BUCKET_NAME || "juristo-prod-bucket";

const s3Client = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const searchParams = req.nextUrl.searchParams;
        const key = searchParams.get('key');
        const slug = searchParams.get('slug'); // Optional slug to check permissions aggressively

        if (!key) {
            return NextResponse.json({ error: "File key is required" }, { status: 400 });
        }

        // Optional: Implement strong authorization using the slug
        // E.g., if the user isn't an admin and hasn't purchased it, blur or block it
        if (slug) {
            const contracts = await db.select().from(lawyerContract).where(eq(lawyerContract.slug, slug)).limit(1);
            if (contracts.length > 0) {
                const contract = contracts[0];
                if (contract.price && contract.price !== "0") {
                    if (!userId) {
                        return NextResponse.json({ error: "Unauthorized access to file" }, { status: 401 });
                    }
                    if (contract.lawyerId !== userId) {
                        const purchase = await getContractPurchase({ userId, contractSlug: slug });
                        if (!purchase) {
                            return NextResponse.json({ error: "Payment required to access this file" }, { status: 403 });
                        }
                    }
                }
            }
        }

        const getObjectParams = {
            Bucket: BUCKET,
            Key: key,
        };
        const command = new GetObjectCommand(getObjectParams);
        const response = await s3Client.send(command);

        if (!response.Body) {
            return new NextResponse("File not found in storage", { status: 404 });
        }

        // Create a streaming response
        const headers = new Headers();
        headers.set('Content-Type', response.ContentType || 'application/pdf');
        headers.set('Content-Disposition', `inline; filename="${key.split('/').pop()}"`);

        // Need to convert the SDK stream (Readable / ReadableStream) into web-standard ReadableStream
        // Note: In Node environment, response.Body is an async iterable standard web stream under Node >= 18
        // Calling transformToWebStream() properly bridges S3 SDK streams to Next.js Web Streams
        const webStream = response.Body.transformToWebStream();

        return new NextResponse(webStream, {
            status: 200,
            headers: headers,
        });

    } catch (error: any) {
        console.error("Error serving file:", error);
        return new NextResponse(error?.message || "Internal Server Error", { status: 500 });
    }
}

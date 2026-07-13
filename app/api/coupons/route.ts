import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db"; 
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const { couponCode, cartTotal } = await request.json();
        
        if (!couponCode) {
            return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
        }

        // 1. Find the coupon in Neon DB using a raw SQL query
        const result = await db.execute(
            sql`SELECT * FROM "Coupons" WHERE "code" = ${couponCode} LIMIT 1`
        );
        
        const coupon = result[0];

        if (!coupon) {
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
        }
        
        if (coupon.status !== "Active") {
            return NextResponse.json({ error: "Coupon is not active" }, { status: 400 });
        }

        if (Number(coupon.maxUsage) > 0 && Number(coupon.currentUsage) >= Number(coupon.maxUsage)) {
            return NextResponse.json({ 
                error: "This coupon has reached its maximum usage limit." 
            }, { status: 400 });
        }

        return NextResponse.json({ 
            valid: true, 
            discount: coupon.discountPercentage,
            couponTitle: coupon.code,
            discountPercentage: coupon.discountPercentage,
            code: coupon.code,
        }, { status: 200 });
        
    } catch (error) {
        console.error("Error checking coupon validity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/toast";
import { Loader2 } from "lucide-react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

// Load the Razorpay script once globally
let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
    if (typeof window !== "undefined" && window.Razorpay) {
        return Promise.resolve();
    }
    if (razorpayScriptPromise) return razorpayScriptPromise;

    razorpayScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            razorpayScriptPromise = null;
            reject(new Error("Failed to load Razorpay"));
        };
        document.head.appendChild(script);
    });

    return razorpayScriptPromise;
}

interface RazorpayButtonProps {
    type: "contract" | "plan_upgrade";
    itemId: string;
    amount?: number;
    itemName: string;
    purchaseId?: string;
    onSuccess?: () => void;
    onFailure?: (error: string) => void;
    className?: string;
    children: React.ReactNode;
    disabled?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    coupon?: string;
}

export function RazorpayButton({
    type,
    itemId,
    amount,
    itemName,
    purchaseId,
    coupon,
    onSuccess,
    onFailure,
    className,
    children,
    disabled,
    variant = "default",
}: RazorpayButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = useCallback(async () => {
        setIsLoading(true);

        try {
            // Load script on-demand (cached after first load)
            await loadRazorpayScript();

            // Create order
            const response = await fetch("/api/payments/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, itemId, amount, itemName, coupon }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create order");
            }

            const orderData = await response.json();

            // Initialize Razorpay
            const options: any = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Juristo",
                description: orderData.itemName,
                ...(orderData.isSubscription 
                    ? { subscription_id: orderData.orderId } 
                    : { order_id: orderData.orderId }),
                handler: async (response: any) => {
                    try {
                            // Verify payment
                            const verifyResponse = await fetch("/api/payments/verify", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_subscription_id: response.razorpay_subscription_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    type,
                                    itemId,
                                    purchaseId,
                                    amount: orderData.amount,
                                    couponCode: coupon,
                                }),
                            });

                        if (!verifyResponse.ok) {
                            throw new Error("Payment verification failed");
                        }

                        toast({ type: "success", description: "Payment successful!" });
                        onSuccess?.();
                    } catch (error) {
                        toast({ type: "error", description: "Payment verification failed" });
                        onFailure?.("Verification failed");
                    }
                },
                prefill: {},
                theme: {
                    color: "#3B82F6",
                },
                modal: {
                    ondismiss: () => {
                        setIsLoading(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on("payment.failed", (response: any) => {
                toast({ type: "error", description: response.error.description });
                onFailure?.(response.error.description);
                setIsLoading(false);
            });
            razorpay.open();
        } catch (error: any) {
            toast({ type: "error", description: error.message || "Payment failed" });
            onFailure?.(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [type, itemId, amount, itemName, purchaseId, onSuccess, onFailure]);

    return (
        <Button
            onClick={handlePayment}
            disabled={isLoading || disabled}
            className={className}
            variant={variant}
        >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {children}
        </Button>
    );
}

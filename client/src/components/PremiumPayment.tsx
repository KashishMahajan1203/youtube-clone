import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PremiumPaymentProps {
  trigger: React.ReactNode;
  selectedPlan?: "BRONZE" | "SILVER" | "GOLD";
  onSuccess?: () => void;
}

const PLAN_PRICING = {
  BRONZE: 10,
  SILVER: 50,
  GOLD: 100,
} as const;

const PLAN_DETAILS = {
  BRONZE: {
    name: "Bronze Plan",
    description: "14 minutes watch time",
    price: 10,
  },
  SILVER: {
    name: "Silver Plan",
    description: "22 minutes watch time",
    price: 50,
  },
  GOLD: {
    name: "Gold Plan",
    description: "Unlimited watch time",
    price: 100,
  },
} as const;

const PremiumPayment: React.FC<PremiumPaymentProps> = ({
  trigger,
  selectedPlan: initialSelectedPlan,
  onSuccess,
}) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"BRONZE" | "SILVER" | "GOLD">(initialSelectedPlan || "BRONZE");

  const handlePayment = async (): Promise<void> => {
    if (!user || !user._id) {
      toast.error("User authentication required");
      return;
    }

    if (!PLAN_PRICING[selectedPlan]) {
      toast.error("Invalid plan selection");
      return;
    }

    if (typeof window === "undefined" || !window.Razorpay) {
      toast.error("Razorpay SDK not loaded");
      return;
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      toast.error("Payment configuration missing");
      return;
    }

    setIsLoading(true);

    try {
      /**
       * CREATE ORDER (BACKEND)
       */
      const orderRes = await axiosInstance.post("/payment/create-order", {
        plan: selectedPlan, // "BRONZE" | "SILVER" | "GOLD"
        userId: user._id,
      });

      const { orderId, amount } = orderRes.data;

      if (!orderId || !amount) {
        toast.error("Invalid order response");
        setIsLoading(false);
        return;
      }

      /**
       * RAZORPAY CHECKOUT
       */
      const options = {
        key: razorpayKey,
        amount,
        currency: "INR",
        name: "YouTube Downloader",
        description: `${selectedPlan} Plan Subscription`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: selectedPlan,
              userId: user._id,
            });

            if (verifyRes.data.msg === "success") {
              toast.success(`${selectedPlan} plan activated successfully`);
              if (onSuccess) {
                onSuccess();
              } else {
                setTimeout(() => window.location.reload(), 1200);
              }
            } else {
              toast.error("Payment verification failed");
            }
          } catch {
            toast.error("Payment verification error");
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsLoading(false);
            toast.info("Payment cancelled");
          },
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#F97316",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      const errorMessage = (error as any).response?.data?.message || "Unable to initiate payment";
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Unlock extended watch time and premium benefits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => (
              <div
                key={planKey}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedPlan === planKey
                    ? "border-orange-500 bg-orange-900/20"
                    : "border-zinc-800 hover:border-orange-500/50"
                  }`}
                onClick={() => setSelectedPlan(planKey as "BRONZE" | "SILVER" | "GOLD")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-zinc-400">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-500">₹{plan.price}</p>
                    <p className="text-sm text-zinc-500">/ month</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            disabled={isLoading}
            onClick={handlePayment}
          >
            {isLoading ? "Processing..." : `Upgrade to ${PLAN_DETAILS[selectedPlan].name}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumPayment;

"use client";

import { Button } from "@/components/ui";
import { Lock, CreditCard } from "lucide-react";
import { Commitment } from "@/lib/api-client";

interface EscrowPaymentCardProps {
  commitment: Commitment;
  paymentStep: "idle" | "creating_order" | "processing_payment" | "verifying" | "success" | "error";
  onPledgePayment: () => void;
}

export function EscrowPaymentCard({
  commitment,
  paymentStep,
  onPledgePayment,
}: EscrowPaymentCardProps) {
  const amountINR = commitment.amount_paise / 100;
  const isPending = paymentStep !== "idle" && paymentStep !== "error";

  return (
    <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-4">
      <div className="space-y-1 pb-3 border-b border-[#E4E7EB]">
        <h2 className="text-sm font-semibold text-[#18181B] flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#047857]" />
          <span>Authorize Escrow & Lock Stake</span>
        </h2>
        <p className="text-xs text-[#52525B]">
          Deposit your stake into the PledgePay verified escrow. 100% refunded when you complete your target.
        </p>
      </div>

      <div className="space-y-2 text-xs text-[#52525B]">
        <div className="flex items-center justify-between p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
          <span>Commitment Stake</span>
          <span className="font-bold font-numeric text-sm text-[#18181B]">₹{amountINR.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <Button
        onClick={onPledgePayment}
        variant="primary"
        size="md"
        className="w-full"
        isLoading={isPending}
        leftIcon={<CreditCard className="h-4 w-4" />}
      >
        {paymentStep === "creating_order"
          ? "Initializing Order..."
          : paymentStep === "processing_payment"
          ? "Processing Payment..."
          : paymentStep === "verifying"
          ? "Verifying Signature..."
          : `Deposit ₹${amountINR.toLocaleString("en-IN")} to Escrow`}
      </Button>
    </div>
  );
}

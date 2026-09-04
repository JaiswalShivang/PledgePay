"use client";

import { Lock, CreditCard } from "lucide-react";
import { Commitment } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface EscrowPaymentCardProps {
  commitment: Commitment;
  paymentStep: "idle" | "creating_order" | "processing_payment" | "verifying" | "success" | "error";
  onPledgePayment: () => void;
}

export function EscrowPaymentCard({ commitment, paymentStep, onPledgePayment }: EscrowPaymentCardProps) {
  const amountINR = commitment.amount_paise / 100;
  const isPending = paymentStep !== "idle" && paymentStep !== "error";
  const stepLabel =
    paymentStep === "creating_order"    ? "Initializing Order…" :
    paymentStep === "processing_payment" ? "Opening Checkout…" :
    paymentStep === "verifying"          ? "Verifying Payment…" :
    `Deposit ₹${amountINR.toLocaleString("en-IN")} → Escrow`;

  return (
    <div className="rounded-[12px] bg-white border-2 border-[#FF6B35] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#F2F3F7]">
        <div className="h-8 w-8 rounded-[12px] bg-[#FF6B35] text-white flex items-center justify-center shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-subhead text-[#16161A]">
            Authorize Escrow Deposit
          </h3>
          <p className="text-[14px] text-[#16161A]/70 font-body">
            100% principal refunded on goal completion
          </p>
        </div>
      </div>

      <div className="px-6 pt-6 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[32px] font-bold font-display text-[#FF6B35]">
            ₹{amountINR.toLocaleString("en-IN")}
          </span>
          <span className="text-[14px] text-[#16161A]/60 font-body">into escrow vault</span>
        </div>
        {commitment.charity && (
          <p className="text-[14px] text-[#16161A]/80 font-body mt-2">
            On missed deadline → routes directly to <strong className="text-[#FF3D71]">{commitment.charity.name}</strong>
          </p>
        )}
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div className="rounded-[12px] p-4 bg-[#F2F3F7] space-y-2 text-[14px] font-body text-[#16161A]">
          <p className="font-bold text-[#16161A]">Razorpay Test Sandbox</p>
          <ul className="space-y-1 text-[14px] text-[#16161A]/80">
            <li>&bull; <strong>NetBanking</strong>: Pick any test bank &rarr; select <strong>Success</strong></li>
            <li>&bull; <strong>UPI</strong>: Enter <code className="bg-white px-1.5 py-0.5 rounded-[12px] border border-[#D8DBE0]">success@razorpay</code></li>
            <li>&bull; <strong>Card</strong>: <code className="bg-white px-1.5 py-0.5 rounded-[12px] border border-[#D8DBE0]">4012 0000 0000 0002</code></li>
          </ul>
        </div>

        <Button
          onClick={onPledgePayment}
          disabled={isPending}
          variant="stake"
          size="lg"
          className="w-full"
          isLoading={isPending}
          leftIcon={<CreditCard className="h-4 w-4" />}
        >
          {stepLabel}
        </Button>
      </div>
    </div>
  );
}

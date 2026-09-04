"use client";

import { Lock, CreditCard } from "lucide-react";
import { Commitment } from "@/lib/api-client";

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
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        backgroundColor: "#F0FDF4",
        border: "1px solid #6EE7B7",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(110,231,183,0.5)" }}
      >
        <div
          className="h-7 w-7 rounded-[6px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(10,102,64,0.12)" }}
        >
          <Lock className="h-4 w-4 text-[#0A6640]" />
        </div>
        <div>
          <h3
            className="text-sm font-semibold text-[#065535]"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Authorize Escrow Deposit
          </h3>
          <p className="text-[11px] text-[#6B7485]">
            100% refunded on goal completion
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-bold text-[#0A6640]"
            style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
          >
            ₹{amountINR.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-[#6B7485]">into escrow</span>
        </div>
        {commitment.charity && (
          <p className="text-xs text-[#4B5263] mt-1">
            On miss → transferred to <strong className="text-[#C44B0A]">{commitment.charity.name}</strong>
          </p>
        )}
      </div>

      {/* Test guide */}
      <div className="px-5 pb-5 space-y-4">
        <div
          className="rounded-[8px] p-3 space-y-1.5"
          style={{ backgroundColor: "rgba(30,79,216,0.06)", border: "1px solid rgba(30,79,216,0.15)" }}
        >
          <p className="text-[11px] font-semibold text-[#1E4FD8]">Razorpay Test Mode</p>
          <ul className="text-[11px] text-[#1E3A8A] space-y-0.5 list-disc pl-4">
            <li><strong>NetBanking</strong>: Pick any bank → click <strong>&quot;Success&quot;</strong></li>
            <li><strong>UPI</strong>: Enter <code className="font-data bg-[#DBEAFE] px-1 rounded">success@razorpay</code></li>
            <li><strong>Card</strong>: <code className="font-data bg-[#DBEAFE] px-1 rounded">4012 0000 0000 0002</code></li>
          </ul>
        </div>

        <button
          onClick={onPledgePayment}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 h-10 text-sm font-semibold text-white rounded-[8px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#0A6640", fontFamily: "var(--font-body, Inter, sans-serif)" }}
          onMouseOver={(e) => !isPending && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#085535")}
          onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A6640")}
        >
          {isPending ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {stepLabel}
        </button>
      </div>
    </div>
  );
}

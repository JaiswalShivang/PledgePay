import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-[12px] bg-[#3D5AFE]/10 flex items-center justify-center text-[#3D5AFE]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-[14px] font-medium text-[#16161A]/60 font-body">
          Loading PledgePay protocol…
        </p>
      </div>
    </div>
  );
}

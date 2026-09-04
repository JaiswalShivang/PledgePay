"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface CoachChatProps {
  commitmentId: string;
  onProgressUpdated?: () => void;
}

export function CoachChat({ commitmentId, onProgressUpdated }: CoachChatProps) {
  const [messages, setMessages] = useState<Array<{ role: "coach" | "user"; text: string }>>([
    {
      role: "coach",
      text: "I am your AI accountability coach. Ask for advice on pacing, commit strategies, or unblocking your milestone.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setIsLoading(true);

    try {
      const res = await apiClient.commitments.askCoach(commitmentId, q);
      setMessages((prev) => [...prev, { role: "coach", text: res.reply }]);
      onProgressUpdated?.();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: "Unable to consult the coaching model right now. Keep coding!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-[12px] bg-white border border-[#F2F3F7] overflow-hidden flex flex-col h-[380px]">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#F2F3F7]">
        <Sparkles className="h-4 w-4 text-[#3D5AFE]" />
        <h3 className="text-subhead text-[#16161A]">AI Accountability Coach</h3>
      </div>

      <div className="flex-1 p-5 overflow-y-auto space-y-3 font-body text-[14px]">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-[12px] max-w-[85%] ${
              m.role === "user"
                ? "ml-auto bg-[#3D5AFE] text-white"
                : "mr-auto bg-[#F2F3F7] text-[#16161A]"
            }`}
          >
            {m.text}
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto p-3 rounded-[12px] bg-[#F2F3F7] text-[#16161A]/60 animate-pulse">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-[#F2F3F7] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything…"
          className="flex-1 rounded-[12px] border border-[#D8DBE0] px-3.5 py-2 text-[14px] text-[#16161A] outline-none focus:border-[#3D5AFE]"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!input.trim() || isLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

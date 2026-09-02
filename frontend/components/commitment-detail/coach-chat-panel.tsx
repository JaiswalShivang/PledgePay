"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Send, Loader2 } from "lucide-react";

export interface CoachMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
}

interface CoachChatPanelProps {
  messages: CoachMessage[];
  isAskingCoach: boolean;
  onSendMessage: (text: string) => void;
}

const QUICK_PROMPTS = [
  "How is my daily pace?",
  "Will I make the deadline?",
  "Suggest a 3-day recovery plan",
];

export function CoachChatPanel({
  messages,
  isAskingCoach,
  onSendMessage,
}: CoachChatPanelProps) {
  const [input, setInput] = useState("");

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim()) return;
    onSendMessage(q.trim());
    setInput("");
  };

  return (
    <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="pb-3 border-b border-[#E4E7EB]">
        <h2 className="text-sm font-semibold text-[#18181B]">AI Commitment Coach</h2>
        <p className="text-xs text-[#52525B]">
          Advice conditioned on your mathematical completion pace.
        </p>
      </div>

      {/* Message List */}
      <div className="space-y-2.5 max-h-72 min-h-[160px] overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs sm:max-w-md rounded-[8px] p-2.5 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#047857] text-white"
                  : "bg-[#F1F3F5] text-[#18181B] border border-[#E4E7EB]"
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <div
                className={`text-[10px] mt-1 text-right font-numeric ${
                  msg.sender === "user" ? "text-white/75" : "text-[#71717A]"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
        {isAskingCoach && (
          <div className="flex items-center gap-2 text-xs text-[#52525B] p-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#047857]" />
            <span>AI Coach analyzing...</span>
          </div>
        )}
      </div>

      {/* Input & Suggestions */}
      <div className="space-y-2 pt-2 border-t border-[#E4E7EB]">
        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={isAskingCoach}
              className="rounded-[4px] border border-[#E4E7EB] bg-[#F8F9FA] px-2 py-0.5 text-[11px] text-[#52525B] hover:text-[#18181B] hover:border-[#D1D5DB] transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask your coach anything about your pace..."
            className="w-full rounded-[6px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs text-[#18181B] placeholder-[#9CA3AF] outline-none focus:border-[#047857]"
          />
          <Button
            onClick={() => handleSend()}
            variant="primary"
            size="sm"
            disabled={isAskingCoach || !input.trim()}
            className="shrink-0"
            leftIcon={<Send className="h-3.5 w-3.5" />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

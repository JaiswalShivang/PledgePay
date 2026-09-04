"use client";

import { useState } from "react";
import { Send, Loader2, Bot } from "lucide-react";

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

export function CoachChatPanel({ messages, isAskingCoach, onSendMessage }: CoachChatPanelProps) {
  const [input, setInput] = useState("");

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim()) return;
    onSendMessage(q.trim());
    setInput("");
  };

  return (
    <div
      className="rounded-[12px] overflow-hidden flex flex-col"
      style={{ backgroundColor: "#1A1F2E", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="h-7 w-7 rounded-[6px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(30,79,216,0.2)" }}
        >
          <Bot className="h-4 w-4 text-[#60A5FA]" />
        </div>
        <div>
          <h3
            className="text-sm font-semibold text-white"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            AI Commitment Coach
          </h3>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Conditioned on your verified pace
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 space-y-3 max-h-72 min-h-[160px] overflow-y-auto px-5 py-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-[10px] px-3.5 py-2.5 text-xs leading-relaxed"
              style={
                msg.sender === "user"
                  ? {
                      backgroundColor: "#0A6640",
                      color: "white",
                      borderRadius: "10px 10px 2px 10px",
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(30,79,216,0.25)",
                      borderLeft: "3px solid #1E4FD8",
                      borderRadius: "10px 10px 10px 2px",
                    }
              }
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <div
                className="text-[10px] mt-1.5 text-right"
                style={{
                  color: msg.sender === "user" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)",
                  fontFamily: "var(--font-data)",
                }}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
        {isAskingCoach && (
          <div className="flex items-center gap-2 px-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#60A5FA]" />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI Coach analyzing…
            </span>
          </div>
        )}
        {messages.length === 0 && !isAskingCoach && (
          <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>
            Ask your coach anything about your commitment pace and strategy.
          </p>
        )}
      </div>

      {/* Input */}
      <div
        className="px-5 pb-5 pt-3 space-y-2.5 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={isAskingCoach}
              className="text-[11px] px-2.5 py-1 rounded-[6px] transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-body, Inter, sans-serif)",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "white";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            id="coach-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask your coach anything…"
            className="flex-1 rounded-[8px] px-3 py-2 text-xs outline-none transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              fontFamily: "var(--font-body, Inter, sans-serif)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(30,79,216,0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(30,79,216,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isAskingCoach || !input.trim()}
            className="h-8 w-8 flex items-center justify-center rounded-[8px] shrink-0 transition-all disabled:opacity-40"
            style={{ backgroundColor: "#1E4FD8", color: "white" }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

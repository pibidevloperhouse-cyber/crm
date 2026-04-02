"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Brief welcome message from assistant
const WELCOME_MESSAGE = `
Hello 👋

I’m your **GTM AI Assistant**.

I can help with:

**Operations:**
- Sales orders, production planning, inventory & warehouse
- Invoicing, billing, financial workflows

**Go-To-Market & Growth:**
- AI-driven GTM engine, campaigns, marketing automation
- Demand-based outreach & predictive insights

**Platform Features:**
- CRM, HRMS, task & field operations management

Ask me anything about optimizing manufacturing operations, GTM, or platform features.
`;

export default function ChatPage({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME_MESSAGE }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to backend
  async function sendMessage() {
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content || "Apologies, I’m unable to provide an answer right now. Try asking about sales, operations, or GTM features.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I’m having trouble responding right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Render assistant messages with headings bold only
  function renderMessageContent(msg) {
    if (!msg || !msg.content) return null;
    if (msg.role !== "assistant") return msg.content;

    const content = String(msg.content);

    return (
      <div className="space-y-1">
        {content.split("\n").map((line, i) => {
          const trimmed = line.trim();
          const isHeading = trimmed.endsWith(":") || /^\*\*(.+)\*\*$/.test(trimmed);

          const formattedLine = line.replace(/\*\*(.+)\*\*/g, (_, text) => text);

          return (
            <p
              key={i}
              className={cn(
                isHeading ? "font-semibold text-slate-900 mt-2" : "text-slate-800",
                "text-sm leading-relaxed"
              )}
            >
              {formattedLine}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 top-10  right-6 z-50 w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600 to-sky-600 text-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold text-lg">GTM AI Assistant</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-2",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <Bot className="h-6 w-6 text-sky-600 mt-1" />
            )}

            <div
              className={cn(
                "max-w-[75%] rounded-xl px-4 py-3 whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-sky-600 text-white"
                  : "bg-white text-slate-800 shadow"
              )}
            >
              {renderMessageContent(msg)}
            </div>

            {msg.role === "user" && (
              <User className="h-6 w-6 text-slate-500 mt-1" />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Bot className="h-5 w-5" />
            Typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2 bg-white">
        <Input
          value={input}
          placeholder="Ask about GTM, sales, campaigns..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

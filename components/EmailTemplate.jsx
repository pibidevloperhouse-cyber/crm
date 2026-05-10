"use client";

import React, { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog_1";
import {
  X,
  Maximize2,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Paperclip,
} from "lucide-react";
import { Label } from "@radix-ui/react-dropdown-menu";
import { supabase } from "@/utils/supabase/client";
import { Input } from "./ui/input";
import { DialogClose } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { toast } from "react-toastify";

// Toolbar button
const ToolbarButton = ({ children, onClick }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
  >
    {children}
  </button>
);

// Dropdown
const Dropdown = ({ options, onChange, value }) => (
  <div className="relative inline-block">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-transparent border border-gray-300 dark:border-gray-500 rounded px-2 py-1 pr-6 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
      <ChevronDown size={16} />
    </div>
  </div>
);

export default function EmailTemplate({ id, type, email, onOpenChange }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [fontSize, setFontSize] = useState("14px");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // ── Safely read user from localStorage ──────────────────────────────────────
  let userEmail = "";
  let refreshToken = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsedUser = JSON.parse(raw);
      userEmail = parsedUser.email || "";
      refreshToken = parsedUser.refresh_token || null;
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage:", e);
  }

  const [form, setForm] = useState({
    from_email: userEmail,
    refresh_token: refreshToken,
    to_email: email || "",
    subject: "",
    body: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendEmail = async () => {
    // ── Bug Fix #1: Guard missing refresh_token ─────────────────────────────
    if (!form.refresh_token) {
      toast.error(
        "❌ Gmail not connected. Please connect your Gmail account first via Settings → Connect Gmail."
      );
      return;
    }

    if (!form.to_email || !form.subject || !form.body) {
      toast.error("Please fill in To, Subject, and Body before sending.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("✅ Email sent successfully!");

        // ── Bug Fix #2: Build the message object locally (not from stale state) ─
        const newMessage = {
          message: `${form.subject} - ${form.body}`,
          type: "User-Sent",
          timestamp: new Date().toISOString().split("T")[0],
        };

        // ── Bug Fix #3: Fix variable shadowing & correct error key ───────────
        const { data: recordData, error: fetchError } = await supabase
          .from(type)
          .select("*")
          .eq("id", id)
          .eq("user_email", userEmail)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching record:", fetchError);
        }

        const oldMessages = Array.isArray(recordData?.messages)
          ? recordData.messages
          : [];

        const { error: updateError } = await supabase
          .from(type)
          .update({ messages: [...oldMessages, newMessage] })
          .eq("id", id)
          .eq("user_email", userEmail);

        if (updateError) {
          console.error("Error saving message to DB:", updateError);
        }

        // ── Bug Fix #4: Call onOpenChange(false) not onOpenChange() ──────────
        onOpenChange(false);
        setForm((prev) => ({ ...prev, subject: "", body: "" }));
      } else {
        console.error("Gmail API error:", data.error);
        toast.error(`❌ Failed to send email: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Send email exception:", err);
      toast.error("❌ Failed to send email. Check console for details.");
    } finally {
      setSending(false);
    }
  };

  // ── Bug Fix #5: form.body is a string, not a ref — removed form.body.current.focus() ──
  const applyStyle = useCallback((command, value = null) => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");

    switch (command) {
      case "bold":
        span.style.fontWeight = "bold";
        range.surroundContents(span);
        break;
      case "italic":
        span.style.fontStyle = "italic";
        range.surroundContents(span);
        break;
      case "underline":
        span.style.textDecoration = "underline";
        range.surroundContents(span);
        break;
      case "fontSize":
        span.style.fontSize = value;
        range.surroundContents(span);
        break;
      case "color":
        span.style.color = value;
        range.surroundContents(span);
        break;
      default:
        console.warn(`Unsupported command: ${command}`);
    }
  }, []);

  const handleFileAttach = () => fileInputRef.current?.click();
  const handleFileChange = (e) =>
    console.log(
      "Attached:",
      Array.from(e.target.files).map((f) => f.name)
    );

  return (
    <>
      <DialogContent
        className={`fixed bottom-0 right-0 p-0 shadow-2xl rounded-t-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col transition-all duration-300 ease-in-out ${
          isMaximized
            ? "w-full h-full md:w-3/5 md:h-4/5"
            : "w-full md:w-[550px] h-[60vh] md:h-auto"
        }`}
      >
        <DialogHeader className="bg-gray-600 dark:bg-gray-900 text-white px-4 py-2 flex justify-between rounded-t-lg">
          <div className="flex justify-between text-center space-x-2">
            <Label className="text-sm">New Message</Label>
            <div className="gap-25 ml-auto">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1 hover:bg-gray-600 rounded"
              >
                <Maximize2 size={16} />
              </button>
              <DialogClose asChild>
                <button className="p-1 hover:bg-gray-600 rounded">
                  <X size={16} />
                </button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-1">
              <label className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                To
              </label>
              <Input
                name="to_email"
                type="email"
                value={form.to_email}
                onChange={handleChange}
                className="flex-grow focus:outline-none text-sm bg-transparent"
              />
            </div>
            <div className="flex items-center py-1">
              <label className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                Subject
              </label>
              <Input
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                className="flex-grow focus:outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          <Textarea
            name="body"
            value={form.body}
            onChange={handleChange}
            className="flex-grow p-4 focus:outline-none overflow-y-auto text-sm"
            aria-label="Email body"
            style={{ fontSize }}
          />

          {/* Footer / Toolbar */}
          <footer className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-1">
              <button
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendEmail}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send"}
              </button>
              <div className="flex items-center ml-2 space-x-1">
                <Dropdown
                  options={[
                    { value: "12px", label: "Small" },
                    { value: "14px", label: "Normal" },
                    { value: "18px", label: "Large" },
                  ]}
                  onChange={(size) => {
                    setFontSize(size);
                    applyStyle("fontSize", size);
                  }}
                  value={fontSize}
                />
                <ToolbarButton onClick={() => applyStyle("bold")}>
                  <Bold size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={() => applyStyle("italic")}>
                  <Italic size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={() => applyStyle("underline")}>
                  <Underline size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={handleFileAttach}>
                  <Paperclip size={18} />
                </ToolbarButton>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </footer>
        </div>
      </DialogContent>
    </>
  );
}

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog_1"; // ShadCN Dialog
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
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState({});
  const user = localStorage.getItem("user");
  const parsedUser = JSON.parse(user);
  const userEmail = parsedUser.email;
  const [form, setForm] = useState({
    from_email: userEmail || "",
    refresh_token: parsedUser.refresh_token,
    to_email: email || "",
    subject: "",
    body: "",
  });
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSendEmail = async () => {
    try {
      const res = await fetch("/api/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setMessage({
        message: form.subject.concat(" - ", form.body),
        type: "User-Sent",
        timestamp: new Date().toISOString().split("T")[0],
      });
      const data = await res.json();
      if (data.success) {
        toast.success("✅ Email sent successfully!");

        const { data, error_1 } = await supabase
          .from(type)
          .select("*")
          .eq("id", id)
          .eq("user_email", userEmail)
          .maybeSingle();
        const oldMessages = Array.isArray(data?.messages) ? data.messages : [];
        if (error_1) {
          console.error("Error fetching email:", error_1);
        }
        const { error } = await supabase
          .from(type)
          .update({ ...data, messages: [...oldMessages, message] })
          .eq("email", email)
          .eq("user_email", userEmail);
        if (error) {
          console.error("Error updating email:", error);
        } else {
          toast.success("Email updated successfully", {
            position: "top-right",
            autoClose: 3000,
          });
        }
        onOpenChange();
        setForm({ from_email: "", to_email: "", subject: "", body: "" });
      } else {
        toast.error("❌ Failed to send email.");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  // FIX: wrap selection with span to persist styles
  const applyStyle = useCallback((command, value = null) => {
    if (!form.body) return;
    if (typeof window === "undefined") return;

    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Create a span wrapper for styling commands
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

      case "insertText": // replacing execCommand('insertText', false, value)
        range.deleteContents();
        range.insertNode(document.createTextNode(value));
        break;

      default:
        console.warn(`Unsupported command: ${command}`);
    }

    form.body.current.focus();
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
                placeholder={form.subject}
                onChange={handleChange}
                className="flex-grow focus:outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          <Textarea
            name="body"
            onChange={handleChange}
            className="flex-grow p-4 focus:outline-none overflow-y-auto text-sm"
            aria-label="Email body"
            style={{ fontSize }}
          />

          {/* Footer / Toolbar */}
          <footer className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-1">
              <button
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm"
                onClick={handleSendEmail}
              >
                Send
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

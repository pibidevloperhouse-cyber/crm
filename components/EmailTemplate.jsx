"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { DialogContent, DialogHeader } from "@/components/ui/dialog_1";
import {
  X,
  Maximize2,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Paperclip,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";
import { Label } from "@radix-ui/react-dropdown-menu";
import { supabase } from "@/utils/supabase/client";
import { Input } from "./ui/input";
import { DialogClose } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { toast } from "react-toastify";

// ── Toolbar button ────────────────────────────────────────────────────────────
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

// ── Font-size dropdown ────────────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function EmailTemplate({ id, type, email, onOpenChange }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [fontSize, setFontSize] = useState("14px");
  const [sending, setSending] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  // Inline status message shown inside the dialog (not just as a toast)
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success'|'error', text }
  const fileInputRef = useRef(null);

  // ── Read user from localStorage safely ───────────────────────────────────
  const readUser = () => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [userData, setUserData] = useState(() => readUser());
  const userEmail = userData?.email || "";
  const refreshToken = userData?.refresh_token || null;
  const accessToken  = userData?.access_token  || null;

  const [form, setForm] = useState({
    from_email:    userEmail,
    refresh_token: refreshToken,
    access_token:  accessToken,
    to_email:      email || "",
    subject:       "",
    body:          "",
  });

  // Re-sync tokens into form after OAuth reconnect
  useEffect(() => {
    if (userData?.refresh_token || userData?.access_token) {
      setForm((prev) => ({
        ...prev,
        from_email:    userData.email    || prev.from_email,
        refresh_token: userData.refresh_token || prev.refresh_token,
        access_token:  userData.access_token  || prev.access_token,
      }));
    }
  }, [userData]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Connect Gmail (OAuth popup) ───────────────────────────────────────────
  const handleConnectGmail = () => {
    setConnectingGmail(true);
    setStatusMsg(null);

    const popup = window.open(
      "/api/auth/email",
      "gmail_oauth",
      "width=520,height=660,scrollbars=yes"
    );

    // ── Listen for postMessage from the popup (callback closes it via script) ─
    const onMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "GMAIL_AUTH_RESULT") return;

      window.removeEventListener("message", onMessage);
      clearInterval(fallbackTimer); // clear fallback poll too

      if (event.data.success) {
        // Re-fetch user from Supabase to get the saved tokens
        try {
          const { data, error } = await supabase
            .from("Users")
            .select("*")
            .eq("email", userEmail)
            .maybeSingle();

          if (!error && data?.refresh_token) {
            localStorage.setItem("user", JSON.stringify(data));
            setUserData(data);
            setStatusMsg({ type: "success", text: "✅ Gmail connected! You can now send emails." });
            toast.success("✅ Gmail connected successfully!");
          } else {
            setStatusMsg({ type: "error", text: "❌ Token not saved — check server logs." });
          }
        } catch (err) {
          console.error("Error re-fetching user after OAuth:", err);
          setStatusMsg({ type: "error", text: "❌ Could not verify Gmail connection." });
        }
      } else {
        setStatusMsg({ type: "error", text: `❌ Gmail auth failed: ${event.data.error || "cancelled"}` });
      }
      setConnectingGmail(false);
    };

    window.addEventListener("message", onMessage);

    // Fallback: if popup is closed manually without sending postMessage
    const fallbackTimer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(fallbackTimer);
        window.removeEventListener("message", onMessage);
        setConnectingGmail(false);
      }
    }, 1000);
  };

  // ── Send Email ────────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    setStatusMsg(null);

    // Guard: no refresh_token → show inline error (toast alone gets hidden behind dialog)
    if (!form.refresh_token) {
      setStatusMsg({
        type: "error",
        text: 'Gmail not connected. Click "Connect Gmail" above to authorize.',
      });
      return;
    }

    if (!form.to_email || !form.subject || !form.body) {
      setStatusMsg({ type: "error", text: "Please fill in To, Subject, and Body." });
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
        // Build message locally — avoids stale React state bug
        const newMessage = {
          message: `${form.subject} - ${form.body}`,
          type: "User-Sent",
          timestamp: new Date().toISOString().split("T")[0],
        };

        // Save to Supabase — fixed variable shadowing + correct .eq("id") match
        const { data: recordData, error: fetchError } = await supabase
          .from(type)
          .select("messages")
          .eq("id", id)
          .eq("user_email", userEmail)
          .maybeSingle();

        if (fetchError) console.error("Fetch error:", fetchError);

        const oldMessages = Array.isArray(recordData?.messages)
          ? recordData.messages
          : [];

        const { error: updateError } = await supabase
          .from(type)
          .update({ messages: [...oldMessages, newMessage] })
          .eq("id", id)
          .eq("user_email", userEmail);

        if (updateError) console.error("Update error:", updateError);

        setStatusMsg({ type: "success", text: "✅ Email sent successfully!" });
        toast.success("✅ Email sent successfully!");
        setForm((prev) => ({ ...prev, subject: "", body: "" }));
        // Close after 1.5 s so user can see the success message
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        const errText = data.error || "Unknown error";
        console.error("Gmail API error:", errText);
        setStatusMsg({ type: "error", text: `❌ Failed to send: ${errText}` });
        toast.error(`❌ Failed to send: ${errText}`);
      }
    } catch (err) {
      console.error("Send email exception:", err);
      setStatusMsg({ type: "error", text: "❌ Network error. Check your connection." });
      toast.error("❌ Network error.");
    } finally {
      setSending(false);
    }
  };

  // ── Text formatting helpers ───────────────────────────────────────────────
  const applyStyle = useCallback((command, value = null) => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    switch (command) {
      case "bold":      span.style.fontWeight      = "bold";      break;
      case "italic":    span.style.fontStyle        = "italic";    break;
      case "underline": span.style.textDecoration   = "underline"; break;
      case "fontSize":  span.style.fontSize         = value;       break;
      default: return;
    }
    range.surroundContents(span);
  }, []);

  const handleFileAttach = () => fileInputRef.current?.click();
  const handleFileChange = (e) =>
    console.log("Attached:", Array.from(e.target.files).map((f) => f.name));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <DialogContent
        className={`fixed bottom-0 right-0 p-0 shadow-2xl rounded-t-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col transition-all duration-300 ease-in-out ${
          isMaximized
            ? "w-full h-full md:w-3/5 md:h-4/5"
            : "w-full md:w-[550px] h-auto"
        }`}
        style={{ zIndex: 9999 }}
      >
        {/* ── Header ── */}
        <DialogHeader className="bg-gray-600 dark:bg-gray-900 text-white px-4 py-2 flex justify-between rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <Label className="text-sm font-medium">New Message</Label>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setIsMaximized((v) => !v)}
                className="p-1 hover:bg-gray-500 rounded"
              >
                <Maximize2 size={16} />
              </button>
              <DialogClose asChild>
                <button className="p-1 hover:bg-gray-500 rounded">
                  <X size={16} />
                </button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* ── Gmail Not Connected Banner ── */}
        {!refreshToken && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Gmail not connected
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Authorize Gmail to send emails from this CRM.
              </p>
            </div>
            <button
              onClick={handleConnectGmail}
              disabled={connectingGmail}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-60 flex-shrink-0"
            >
              {connectingGmail ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Waiting…</>
              ) : (
                <><Mail className="w-3 h-3" /> Connect Gmail</>
              )}
            </button>
          </div>
        )}

        {/* ── Inline Status Message ── */}
        {statusMsg && (
          <div
            className={`flex items-start gap-2 px-4 py-2 text-sm border-b flex-shrink-0 ${
              statusMsg.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 text-green-800 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-800 dark:text-red-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* ── Compose Body ── */}
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            {/* To */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-1">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                To
              </label>
              <Input
                name="to_email"
                type="email"
                value={form.to_email}
                onChange={handleChange}
                placeholder="recipient@example.com"
                className="flex-grow focus:outline-none text-sm bg-transparent"
              />
            </div>
            {/* Subject */}
            <div className="flex items-center py-1">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                Subject
              </label>
              <Input
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                placeholder="Email subject…"
                className="flex-grow focus:outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          {/* Body textarea */}
          <Textarea
            name="body"
            value={form.body}
            onChange={handleChange}
            placeholder="Write your message here…"
            className="flex-grow p-4 focus:outline-none overflow-y-auto text-sm min-h-[180px] resize-none border-0 rounded-none focus-visible:ring-0"
            aria-label="Email body"
            style={{ fontSize }}
          />

          {/* ── Footer / Toolbar ── */}
          <footer className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <button
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                onClick={handleSendEmail}
                disabled={sending || !refreshToken}
                title={!refreshToken ? "Connect Gmail first" : "Send email"}
              >
                {sending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                ) : (
                  "Send"
                )}
              </button>

              <div className="flex items-center ml-2 space-x-1">
                <Dropdown
                  options={[
                    { value: "12px", label: "Small" },
                    { value: "14px", label: "Normal" },
                    { value: "18px", label: "Large" },
                  ]}
                  onChange={(size) => { setFontSize(size); applyStyle("fontSize", size); }}
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

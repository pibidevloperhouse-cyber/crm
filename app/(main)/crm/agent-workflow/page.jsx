"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API = "https://crmemail.onrender.com";

const STAGES = [
  "New",
  "Contact Attempted",
  "Contacted",
  "Meeting Booked",
  "Qualified",
  "NotQualified",
];

const STATUS_STYLES = {
  New: { text: "text-blue-600" },
  "Contact Attempted": { text: "text-yellow-600" },
  Contacted: { text: "text-teal-600" },
  "Meeting Booked": { text: "text-purple-600" },
  Qualified: { text: "text-green-600" },
  NotQualified: { text: "text-red-500" },
  "In progress": { text: "text-orange-500" },
};

function getStatusTextClass(status) {
  return (STATUS_STYLES[status] || { text: "text-gray-500" }).text;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function getLeadName(lead) {
  if (lead.name) return lead.name;
  if (lead.email) {
    const part = lead.email.split("@")[0];
    return part.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return `Client ${lead.client_id}`;
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };
  return { toasts, success: (m) => add(m, "success"), error: (m) => add(m, "error"), info: (m) => add(m, "info") };
}

export default function AgentWorkflowPage() {
  const [grouped, setGrouped] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [wakeMsg, setWakeMsg] = useState("");

  const { toasts, success, error: toastError, info } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("email_memory")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        const g = data.reduce((acc, item) => {
          const cid = item.client_id;
          if (!acc[cid]) acc[cid] = [];
          acc[cid].push(item);
          return acc;
        }, {});
        setGrouped(g);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API}/status`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const data = await res.json();
          setIsRunning(!!data.running);
        }
      } catch { } finally {
        setStatusChecked(true);
      }
    };
    checkStatus();
  }, []);

  const handleEmailToggle = async () => {
    if (emailLoading) return;
    setEmailLoading(true);
    setWakeMsg("");
    const endpoint = isRunning ? "stop" : "start";
    try {
      fetch(`${API}/`).catch(() => { });
      setWakeMsg("Waking up backend… (Render cold-start, up to 60s)");
      let alive = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const ping = await fetch(`${API}/status`, { signal: AbortSignal.timeout(4000) });
          if (ping.ok) { alive = true; break; }
        } catch { }
      }
      if (!alive) throw new Error("Backend didn't respond after 60s. Check Render dashboard.");
      setWakeMsg(`Sending ${endpoint} command…`);
      const res = await fetch(`${API}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const nowRunning = data.status === "started";
      setIsRunning(nowRunning);
      setWakeMsg("");
      success(nowRunning ? "✅ Email automation started!" : "🛑 Email automation stopped.");
    } catch (err) {
      setWakeMsg("");
      toastError(`❌ ${err.message}`);
      try {
        const s = await fetch(`${API}/status`, { signal: AbortSignal.timeout(5000) });
        if (s.ok) { const d = await s.json(); setIsRunning(!!d.running); }
      } catch { }
    } finally {
      setEmailLoading(false);
    }
  };

  const leadIds = Object.keys(grouped);
  const filteredLeadIds = leadIds.filter((leadId) => {
    const lead = grouped[leadId][0];
    const name = getLeadName(lead).toLowerCase();
    const email = (lead.email || "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const selectedLeadData = selectedLead ? grouped[selectedLead] : null;
  const selectedLeadFirst = selectedLeadData ? selectedLeadData[0] : null;
  const currentStatus = selectedLeadFirst?.status_after || "New";
  const stageIndex = STAGES.findIndex((s) => s.toLowerCase() === currentStatus.toLowerCase());

  return (
    <div className="flex h-screen overflow-hidden relative bg-[#e6f2f1] dark:bg-[#0d1117]">

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto"
            style={{
              background: t.type === "success" ? "#d1fae5" : t.type === "error" ? "#fee2e2" : "#dbeafe",
              border: `1px solid ${t.type === "success" ? "#6ee7b7" : t.type === "error" ? "#fca5a5" : "#93c5fd"}`,
              color: t.type === "success" ? "#065f46" : t.type === "error" ? "#991b1b" : "#1e40af",
              maxWidth: 360,
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* ════ LEFT PANEL ════ */}
      <div
        className="flex flex-col bg-white dark:bg-[#161b22] transition-all duration-300"
        style={{
          width: selectedLead ? "320px" : "380px",
          minWidth: "280px",
          borderRight: "1px solid",
          borderColor: "inherit",
          flexShrink: 0,
        }}
      >
        {/* border color via className for dark support */}
        <div className="flex flex-col h-full border-r border-[#d1e8e7] dark:border-[#30363d]">

          {/* Top controls */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-2 flex-wrap border-b border-[#e5f0ef] dark:border-[#30363d]">
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
              EMAIL 
            </div>

            <button
              onClick={handleEmailToggle}
              disabled={emailLoading || !statusChecked}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60"
              style={{
                background: emailLoading
                  ? "#9ca3af"
                  : isRunning
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #22c55e, #16a34a)",
                minWidth: 72,
              }}
            >
              {emailLoading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Wait…
                </>
              ) : isRunning ? "■ STOP" : "▶ START"}
            </button>

            {statusChecked && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{isRunning ? "Live" : "Idle"}</span>
              </div>
            )}
          </div>

          {/* Wake-up message */}
          {wakeMsg && (
            <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-yellow-900/30 border border-yellow-600/40 text-yellow-300">
              <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {wakeMsg}
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-[#f0f9f8] dark:bg-[#21262d] border border-[#c8e6e5] dark:border-[#30363d]">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Lead list */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {filteredLeadIds.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No leads found</p>
            )}
            {filteredLeadIds.map((leadId) => {
              const lead = grouped[leadId][0];
              const name = getLeadName(lead);
              const status = lead.status_after || "New";
              const isSelected = selectedLead === leadId;
              return (
                <div
                  key={leadId}
                  onClick={() => setSelectedLead(leadId)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all
                    ${isSelected
                      ? "bg-[#e6f9f8] dark:bg-[#0ea5a420] border-[1.5px] border-[#0ea5a4]"
                      : "bg-white dark:bg-[#21262d] border border-[#e5f0ef] dark:border-[#30363d] hover:border-[#0ea5a4]/50"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{name}</p>
                      <p className={`text-xs font-semibold mt-0.5 ${getStatusTextClass(status)}`}>{status}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{lead.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(lead.created_at)}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════ RIGHT PANEL ════ */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0d1117] overflow-hidden">

        {selectedLead && selectedLeadFirst && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5f0ef] dark:border-[#30363d]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
                >
                  {getLeadName(selectedLeadFirst).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
                    {getLeadName(selectedLeadFirst)}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Client ID: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLead}</span>
                    &nbsp;·&nbsp;{selectedLeadFirst.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition border border-[#d1d5db] dark:border-[#30363d]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                  Email
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition border border-[#d1d5db] dark:border-[#30363d]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 4-2.5 1.5A11 11 0 0014.5 15L16 12.5l4 2v3a2 2 0 01-2 2A16 16 0 013 5z" />
                  </svg>
                  Call
                </button>
              </div>
            </div>

            {/* Stage bar */}
            <div className="px-6 py-3 overflow-x-auto border-b border-[#e5f0ef] dark:border-[#30363d]">
              <div className="flex items-center min-w-max gap-1">
                {STAGES.map((stage, i) => {
                  const isActive = i === stageIndex;
                  const isPast = i < stageIndex;
                  const isNotQual = stage === "NotQualified";
                  return (
                    <div key={stage} className="flex items-center">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap"
                        style={{
                          border: isActive
                            ? isNotQual ? "1.5px solid #fca5a5" : "1.5px solid #0ea5a4"
                            : "1px solid #30363d",
                          background: isActive
                            ? isNotQual ? "rgba(239,68,68,0.15)" : "rgba(14,165,164,0.15)"
                            : isPast ? "rgba(255,255,255,0.04)" : "transparent",
                          color: isActive
                            ? isNotQual ? "#ef4444" : "#0ea5a4"
                            : isPast ? "#6b7280" : "#6b7280",
                        }}
                      >
                        {(isActive || isPast) && (
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: isActive ? (isNotQual ? "#ef4444" : "#0ea5a4") : "#6b7280" }}
                          />
                        )}
                        {stage}
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className="w-4 h-px mx-0.5" style={{ background: i < stageIndex ? "#6b7280" : "#30363d" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#f8fffe] dark:bg-[#0d1117]">
              <div className="relative max-w-4xl mx-auto">
                <div
                  className="absolute top-0 bottom-0 w-px"
                  style={{ left: "50%", transform: "translateX(-50%)", background: "#30363d" }}
                />
                {selectedLeadData.map((item, index) => (
                  <div key={index} className="flex flex-col gap-4">
                    {/* Inbound */}
                    {item.inbound_summary && (
                      <div className="relative flex w-full mb-4">
                        <div className="w-1/2 flex justify-end pr-10">
                          <div
                            className="p-4 rounded-2xl max-w-sm w-full"
                            style={{
                              background: "rgba(37,99,235,0.15)",
                              border: "1px solid rgba(59,130,246,0.25)",
                              boxShadow: "0 1px 4px rgba(59,130,246,0.08)",
                            }}
                          >
                            <p className="text-xs font-bold tracking-wide mb-1.5 text-blue-400">AGENT (INBOUND)</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{item.inbound_summary}</p>
                            <p className="text-xs text-gray-500 mt-2">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                        <div
                          className="absolute z-10 flex items-center justify-center"
                          style={{
                            left: "50%", top: "12px", transform: "translateX(-50%)",
                            width: 32, height: 32, borderRadius: "50%",
                            border: "2px solid #0ea5a4", background: "#161b22",
                            boxShadow: "0 1px 4px rgba(14,165,164,0.25)",
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                          </svg>
                        </div>
                        <div className="w-1/2" />
                      </div>
                    )}

                    {/* Outbound */}
                    {item.outbound_summary && (
                      <div className="relative flex w-full mb-10">
                        <div className="w-1/2" />
                        <div
                          className="absolute z-10 flex items-center justify-center"
                          style={{
                            left: "50%", top: "12px", transform: "translateX(-50%)",
                            width: 32, height: 32, borderRadius: "50%",
                            border: "2px solid #0ea5a4", background: "#161b22",
                            boxShadow: "0 1px 4px rgba(14,165,164,0.25)",
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="w-1/2 flex justify-start pl-10">
                          <div
                            className="p-4 rounded-2xl max-w-sm w-full"
                            style={{
                              background: "rgba(5,150,105,0.15)",
                              border: "1px solid rgba(16,185,129,0.25)",
                              boxShadow: "0 1px 4px rgba(16,185,129,0.08)",
                            }}
                          >
                            <p className="text-xs font-bold tracking-wide mb-1.5 text-emerald-400">HUMAN (OUTBOUND)</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{item.outbound_summary}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                              <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!selectedLead && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="#0ea5a4" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">Select a lead to view the email timeline</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">or use ICP Analyser on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// const API = "https://crmemail.onrender.com";

// const STAGES = [
//   "New",
//   "Contact Attempted",
//   "Contacted",
//   "Meeting Booked",
//   "Qualified",
//   "NotQualified",
// ];

// const STATUS_STYLES = {
//   New: { text: "text-blue-600" },
//   "Contact Attempted": { text: "text-yellow-600" },
//   Contacted: { text: "text-teal-600" },
//   "Meeting Booked": { text: "text-purple-600" },
//   Qualified: { text: "text-green-600" },
//   NotQualified: { text: "text-red-500" },
//   "In progress": { text: "text-orange-500" },
// };

// function getStatusTextClass(status) {
//   return (STATUS_STYLES[status] || { text: "text-gray-500" }).text;
// }

// function formatDate(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   return d.toLocaleString("en-GB", {
//     day: "2-digit", month: "short", year: "numeric",
//     hour: "2-digit", minute: "2-digit", hour12: true,
//   });
// }

// function getLeadName(lead) {
//   if (lead.lead_name) return lead.lead_name;
//   if (lead.lead_email) {
//     const part = lead.lead_email.split("@")[0];
//     return part.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
//   }
//   return `Lead ${lead.lead_id}`;
// }

// /* ── Toast helper (no lib needed) ─────────────────────── */
// function useToast() {
//   const [toasts, setToasts] = useState([]);
//   const add = (msg, type = "info") => {
//     const id = Date.now();
//     setToasts((p) => [...p, { id, msg, type }]);
//     setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
//   };
//   return { toasts, success: (m) => add(m, "success"), error: (m) => add(m, "error"), info: (m) => add(m, "info") };
// }

// /* ══════════════════════════════════════════════════════════ */
// export default function AgentWorkflowPage() {
//   const [grouped, setGrouped] = useState({});
//   const [selectedLead, setSelectedLead] = useState(null);
//   const [search, setSearch] = useState("");

//   /* Email auto state */
//   const [isRunning, setIsRunning] = useState(false);
//   const [emailLoading, setEmailLoading] = useState(false);
//   const [statusChecked, setStatusChecked] = useState(false);



//   const { toasts, success, error: toastError, info } = useToast();

//   /* ── 1. Fetch email_memory data ── */
//   useEffect(() => {
//     const fetchData = async () => {
//       const { data, error } = await supabase
//         .from("email_memory")
//         .select("*")
//         .order("created_at", { ascending: true });
//       if (!error && data) {
//         const g = data.reduce((acc, item) => {
//           if (!acc[item.lead_id]) acc[item.lead_id] = [];
//           acc[item.lead_id].push(item);
//           return acc;
//         }, {});
//         setGrouped(g);
//       }
//     };
//     fetchData();
//   }, []);

//   /* ── 2. Check actual backend status on mount ── */
//   useEffect(() => {
//     const checkStatus = async () => {
//       try {
//         const res = await fetch(`${API}/status`, { signal: AbortSignal.timeout(8000) });
//         if (res.ok) {
//           const data = await res.json();
//           setIsRunning(!!data.running);
//         }
//       } catch {
//         /* Render cold-start or network issue — leave as false */
//       } finally {
//         setStatusChecked(true);
//       }
//     };
//     checkStatus();
//   }, []);

//   /* ── Email toggle ── */
//   const handleEmailToggle = async () => {
//     if (emailLoading) return;
//     setEmailLoading(true);
//     const endpoint = isRunning ? "stop" : "start";
//     try {
//       const res = await fetch(`${API}/${endpoint}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         signal: AbortSignal.timeout(12000),
//       });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const data = await res.json();
//       const nowRunning = data.status === "started";
//       setIsRunning(nowRunning);
//       success(nowRunning ? "✅ Email automation started!" : "🛑 Email automation stopped.");
//     } catch (err) {
//       toastError(`❌ Failed to ${endpoint}: ${err.message}. Check if backend is awake (Render cold-start can take 30s).`);
//       /* Re-sync true state */
//       try {
//         const s = await fetch(`${API}/status`, { signal: AbortSignal.timeout(5000) });
//         if (s.ok) { const d = await s.json(); setIsRunning(!!d.running); }
//       } catch { }
//     } finally {
//       setEmailLoading(false);
//     }
//   };



//   /* ── Derived ── */
//   const leadIds = Object.keys(grouped);
//   const filteredLeadIds = leadIds.filter((leadId) => {
//     const lead = grouped[leadId][0];
//     const name = getLeadName(lead).toLowerCase();
//     const email = (lead.lead_email || "").toLowerCase();
//     const q = search.toLowerCase();
//     return name.includes(q) || email.includes(q);
//   });

//   const selectedLeadData = selectedLead ? grouped[selectedLead] : null;
//   const selectedLeadFirst = selectedLeadData ? selectedLeadData[0] : null;
//   const currentStatus = selectedLeadFirst?.status_after || "New";
//   const stageIndex = STAGES.findIndex((s) => s.toLowerCase() === currentStatus.toLowerCase());

//   /* ══════════════ RENDER ══════════════ */
//   return (
//     <div className="flex h-screen overflow-hidden relative" style={{ backgroundColor: "#e6f2f1" }}>

//       {/* ── Toast stack ── */}
//       <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
//         {toasts.map((t) => (
//           <div
//             key={t.id}
//             className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto"
//             style={{
//               background: t.type === "success" ? "#d1fae5" : t.type === "error" ? "#fee2e2" : "#dbeafe",
//               border: `1px solid ${t.type === "success" ? "#6ee7b7" : t.type === "error" ? "#fca5a5" : "#93c5fd"}`,
//               color: t.type === "success" ? "#065f46" : t.type === "error" ? "#991b1b" : "#1e40af",
//               maxWidth: 360,
//             }}
//           >
//             {t.msg}
//           </div>
//         ))}
//       </div>

//       {/* ════════════ LEFT PANEL ════════════ */}
//       <div
//         className="flex flex-col bg-white transition-all duration-300"
//         style={{
//           width: selectedLead ? "320px" : "380px",
//           minWidth: "280px",
//           borderRight: "1px solid #d1e8e7",
//           flexShrink: 0,
//         }}
//       >
//         {/* Top controls */}
//         <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-2 flex-wrap" style={{ borderBottom: "1px solid #e5f0ef" }}>
//           <div
//             className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold"
//             style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
//           >
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
//             </svg>
//             EMAIL
//           </div>

//           {/* Start / Stop */}
//           <button
//             onClick={handleEmailToggle}
//             disabled={emailLoading || !statusChecked}
//             className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60"
//             style={{
//               background: emailLoading
//                 ? "#9ca3af"
//                 : isRunning
//                   ? "linear-gradient(135deg, #ef4444, #dc2626)"
//                   : "linear-gradient(135deg, #22c55e, #16a34a)",
//               minWidth: 72,
//             }}
//           >
//             {emailLoading ? (
//               <>
//                 <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                 </svg>
//                 Wait…
//               </>
//             ) : isRunning ? (
//               "■ STOP"
//             ) : (
//               "▶ START"
//             )}
//           </button>

//           {/* Live indicator */}
//           {statusChecked && (
//             <div className="flex items-center gap-1.5">
//               <div
//                 className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
//               />
//               <span className="text-xs text-gray-500">{isRunning ? "Live" : "Idle"}</span>
//             </div>
//           )}
//         </div>

//         {/* Search */}
//         <div className="px-4 py-3">
//           <div
//             className="flex items-center gap-2 rounded-xl px-3 py-2"
//             style={{ background: "#f0f9f8", border: "1px solid #c8e6e5" }}
//           >
//             <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//               <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
//             </svg>
//             <input
//               className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
//               placeholder="Search leads..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//           </div>
//         </div>

//         {/* Lead list */}
//         <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
//           {filteredLeadIds.length === 0 && (
//             <p className="text-center text-sm text-gray-400 py-8">No leads found</p>
//           )}
//           {filteredLeadIds.map((leadId) => {
//             const lead = grouped[leadId][0];
//             const name = getLeadName(lead);
//             const status = lead.status_after || "New";
//             const isSelected = selectedLead === leadId;
//             return (
//               <div
//                 key={leadId}
//                 onClick={() => setSelectedLead(leadId)}
//                 className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all"
//                 style={{
//                   background: isSelected ? "#e6f9f8" : "#fff",
//                   border: isSelected ? "1.5px solid #0ea5a4" : "1px solid #e5f0ef",
//                   boxShadow: isSelected ? "0 2px 8px rgba(14,165,164,0.1)" : "none",
//                 }}
//               >
//                 <div className="flex items-center gap-3 min-w-0">
//                   <div
//                     className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
//                     style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
//                   >
//                     {name.charAt(0).toUpperCase()}
//                   </div>
//                   <div className="min-w-0">
//                     <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
//                     <p className={`text-xs font-semibold mt-0.5 ${getStatusTextClass(status)}`}>{status}</p>
//                     <p className="text-xs text-gray-400 truncate mt-0.5">{lead.lead_email}</p>
//                     <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
//                   </div>
//                 </div>
//                 <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
//                 </svg>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* ════════════ RIGHT PANEL ════════════ */}
//       <div className="flex-1 flex flex-col bg-white overflow-hidden">

//         {/* ── Timeline Panel ── */}
//         {selectedLead && selectedLeadFirst && (
//           <>
//             {/* Header */}
//             <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5f0ef" }}>
//               <div className="flex items-center gap-3">
//                 <div
//                   className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
//                   style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
//                 >
//                   {getLeadName(selectedLeadFirst).charAt(0).toUpperCase()}
//                 </div>
//                 <div>
//                   <h2 className="font-bold text-gray-900 text-lg leading-tight">
//                     {getLeadName(selectedLeadFirst)}
//                   </h2>
//                   <p className="text-xs text-gray-500">
//                     Lead ID: <span className="font-medium text-gray-700">{selectedLead}</span>
//                     &nbsp;·&nbsp;{selectedLeadFirst.lead_email}
//                   </p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <button
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
//                   style={{ border: "1px solid #d1d5db" }}
//                 >
//                   <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
//                   </svg>
//                   Email
//                 </button>
//                 <button
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
//                   style={{ border: "1px solid #d1d5db" }}
//                 >
//                   <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 4-2.5 1.5A11 11 0 0014.5 15L16 12.5l4 2v3a2 2 0 01-2 2A16 16 0 013 5z" />
//                   </svg>
//                   Call
//                 </button>
//               </div>
//             </div>

//             {/* Stage bar */}
//             <div className="px-6 py-3 overflow-x-auto" style={{ borderBottom: "1px solid #e5f0ef" }}>
//               <div className="flex items-center min-w-max gap-1">
//                 {STAGES.map((stage, i) => {
//                   const isActive = i === stageIndex;
//                   const isPast = i < stageIndex;
//                   const isNotQual = stage === "NotQualified";
//                   return (
//                     <div key={stage} className="flex items-center">
//                       <div
//                         className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap"
//                         style={{
//                           border: isActive
//                             ? isNotQual ? "1.5px solid #fca5a5" : "1.5px solid #0ea5a4"
//                             : "1px solid #e5e7eb",
//                           background: isActive
//                             ? isNotQual ? "#fff1f2" : "#e6f9f8"
//                             : isPast ? "#f9fafb" : "#fff",
//                           color: isActive
//                             ? isNotQual ? "#ef4444" : "#0ea5a4"
//                             : isPast ? "#9ca3af" : "#9ca3af",
//                         }}
//                       >
//                         {(isActive || isPast) && (
//                           <div
//                             className="w-1.5 h-1.5 rounded-full shrink-0"
//                             style={{ background: isActive ? (isNotQual ? "#ef4444" : "#0ea5a4") : "#9ca3af" }}
//                           />
//                         )}
//                         {stage}
//                       </div>
//                       {i < STAGES.length - 1 && (
//                         <div className="w-4 h-px mx-0.5" style={{ background: i < stageIndex ? "#9ca3af" : "#e5e7eb" }} />
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Timeline */}
//             <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "#f8fffe" }}>
//               <div className="relative max-w-4xl mx-auto">
//                 <div
//                   className="absolute top-0 bottom-0 w-px"
//                   style={{ left: "50%", transform: "translateX(-50%)", background: "#cbd5e1" }}
//                 />
//                 {selectedLeadData.map((item, index) => {
//                   const isInbound = item.direction === "inbound";
//                   const content = item.original_content || item.summary || "";
//                   return (
//                     <div key={index} className="relative flex w-full mb-10">
//                       <div className="w-1/2 flex justify-end pr-10">
//                         {isInbound && (
//                           <div
//                             className="p-4 rounded-2xl max-w-sm w-full"
//                             style={{ background: "#dbeafe", boxShadow: "0 1px 4px rgba(59,130,246,0.08)" }}
//                           >
//                             <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: "#2563eb" }}>AGENT (INBOUND)</p>
//                             <p className="text-sm text-gray-700 leading-relaxed">{content.slice(0, 300)}</p>
//                             <p className="text-xs text-gray-400 mt-2">{formatDate(item.created_at)}</p>
//                           </div>
//                         )}
//                       </div>
//                       <div
//                         className="absolute z-10 flex items-center justify-center"
//                         style={{
//                           left: "50%", top: "12px", transform: "translateX(-50%)",
//                           width: 32, height: 32, borderRadius: "50%",
//                           border: "2px solid #0ea5a4", background: "#fff",
//                           boxShadow: "0 1px 4px rgba(14,165,164,0.15)",
//                         }}
//                       >
//                         {isInbound ? (
//                           <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
//                           </svg>
//                         ) : (
//                           <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                           </svg>
//                         )}
//                       </div>
//                       <div className="w-1/2 flex justify-start pl-10">
//                         {!isInbound && (
//                           <div
//                             className="p-4 rounded-2xl max-w-sm w-full"
//                             style={{ background: "#d1fae5", boxShadow: "0 1px 4px rgba(16,185,129,0.08)" }}
//                           >
//                             <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: "#059669" }}>HUMAN (OUTBOUND)</p>
//                             <p className="text-sm text-gray-700 leading-relaxed">{content.slice(0, 300)}</p>
//                             <div className="flex items-center justify-between mt-2">
//                               <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
//                               <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2.5} viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
//                               </svg>
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </>
//         )}

//         {/* Empty state */}
//         {!selectedLead && (
//           <div className="flex-1 flex items-center justify-center">
//             <div className="text-center">
//               <svg className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="#0ea5a4" strokeWidth={1} viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
//               </svg>
//               <p className="text-sm text-gray-400">Select a lead to view the email timeline</p>
//               <p className="text-xs text-gray-300 mt-1">or use ICP Analyser on the left</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }






// //this is old working code start stop doesnt trigger

// // "use client";

// // import { useEffect, useState } from "react";
// // import { createClient } from "@supabase/supabase-js";

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL,
// //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// // );

// // const STAGES = ["New", "Contact Attempted", "Contacted", "Meeting Booked", "Qualified", "NotQualified"];

// // const STATUS_STYLES = {
// //   "New": { text: "text-blue-600", },
// //   "Contact Attempted": { text: "text-yellow-600", },
// //   "Contacted": { text: "text-teal-600", },
// //   "Meeting Booked": { text: "text-purple-600", },
// //   "Qualified": { text: "text-green-600", },
// //   "NotQualified": { text: "text-red-500", },
// //   "In progress": { text: "text-orange-500", },
// // };

// // function getStatusTextClass(status) {
// //   return (STATUS_STYLES[status] || { text: "text-gray-500" }).text;
// // }

// // function formatDate(dateStr) {
// //   if (!dateStr) return "";
// //   const d = new Date(dateStr);
// //   return d.toLocaleString("en-GB", {
// //     day: "2-digit", month: "short", year: "numeric",
// //     hour: "2-digit", minute: "2-digit", hour12: true,
// //   });
// // }

// // function getLeadName(lead) {
// //   if (lead.lead_name) return lead.lead_name;
// //   if (lead.lead_email) {
// //     const part = lead.lead_email.split("@")[0];
// //     return part.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
// //   }
// //   return `Lead ${lead.lead_id}`;
// // }

// // export default function AgentWorkflowPage() {
// //   const [grouped, setGrouped] = useState({});
// //   const [selectedLead, setSelectedLead] = useState(null);
// //   const [search, setSearch] = useState("");
// //   const [isRunning, setIsRunning] = useState(false);

// //   useEffect(() => {
// //     const fetchData = async () => {
// //       const { data, error } = await supabase
// //         .from("email_memory")
// //         .select("*")
// //         .order("created_at", { ascending: true });

// //       if (!error && data) {
// //         const groupedData = data.reduce((acc, item) => {
// //           if (!acc[item.lead_id]) acc[item.lead_id] = [];
// //           acc[item.lead_id].push(item);
// //           return acc;
// //         }, {});
// //         setGrouped(groupedData);
// //       }
// //     };
// //     fetchData();
// //   }, []);

// //   const leadIds = Object.keys(grouped);

// //   const filteredLeadIds = leadIds.filter((leadId) => {
// //     const lead = grouped[leadId][0];
// //     const name = getLeadName(lead).toLowerCase();
// //     const email = (lead.lead_email || "").toLowerCase();
// //     const q = search.toLowerCase();
// //     return name.includes(q) || email.includes(q);
// //   });

// //   const selectedLeadData = selectedLead ? grouped[selectedLead] : null;
// //   const selectedLeadFirst = selectedLeadData ? selectedLeadData[0] : null;
// //   const currentStatus = selectedLeadFirst?.status_after || "New";
// //   const stageIndex = STAGES.findIndex(
// //     (s) => s.toLowerCase() === currentStatus.toLowerCase()
// //   );

// //   const handleEmailToggle = async () => {
// //     try {
// //       const endpoint = isRunning ? "stop" : "start";

// //       // await fetch(`https://crmemail.onrender.com/${endpoint}`, {
// //       //   method: "POST",
// //       // });
// //       await fetch(`https://crmemail.onrender.com/${endpoint}`, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json"
// //         }
// //       });
// //       setIsRunning(!isRunning);
// //     } catch (err) {
// //       console.error("Error:", err);
// //     }
// //   };

// //   return (
// //     <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#e6f2f1" }}>

// //       {/* ── LEFT PANEL ── */}
// //       <div
// //         className="flex flex-col bg-white transition-all duration-500"
// //         style={{
// //           width: selectedLead ? "360px" : "420px",
// //           minWidth: selectedLead ? "300px" : "auto",
// //           borderRight: "1px solid #d1e8e7",
// //         }}
// //       >
// //         {/* Top tabs */}
// //         <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #e5f0ef" }}>
// //           {/* Leads active */}
// //           <button
// //             className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
// //             style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
// //           >
// //             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //               <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
// //             </svg>
// //             EMAIL
// //           </button>
// //           <button
// //             onClick={handleEmailToggle}
// //             className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
// //             style={{
// //               background: isRunning
// //                 ? "linear-gradient(135deg, #ef4444, #dc2626)" // STOP (red)
// //                 : "linear-gradient(135deg, #22c55e, #16a34a)" // START (green)
// //             }}
// //           >
// //             {isRunning ? "STOP" : "START"}
// //           </button>
// //           {/* Deals - display only, no pointer */}
// //           {/* <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 text-sm font-medium" style={{ cursor: "default" }}>
// //             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //               <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM3 18c0-3.314 4.03-6 9-6s9 2.686 9 6" />
// //             </svg>
// //             Deals
// //           </div> */}
// //           {/* Customers - display only */}
// //           {/* <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 text-sm font-medium" style={{ cursor: "default" }}>
// //             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //               <path strokeLinecap="round" strokeLinejoin="round" d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm-8 0C5.67 13 1 14.17 1 16.5V19h6v-2.5c0-.83.33-1.61.87-2.22" />
// //             </svg>
// //             Customers
// //           </div>
// //         */}</div>

// //         {/* Search */}
// //         <div className="px-4 py-3">
// //           <div
// //             className="flex items-center gap-2 rounded-xl px-3 py-2"
// //             style={{ background: "#f0f9f8", border: "1px solid #c8e6e5" }}
// //           >
// //             <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //               <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
// //             </svg>
// //             <input
// //               className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
// //               placeholder="Search leads..."
// //               value={search}
// //               onChange={(e) => setSearch(e.target.value)}
// //             />
// //             <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //               <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4" />
// //             </svg>
// //           </div>
// //         </div>

// //         {/* Lead list */}
// //         <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
// //           {filteredLeadIds.map((leadId) => {
// //             const lead = grouped[leadId][0];
// //             const name = getLeadName(lead);
// //             const status = lead.status_after || "New";
// //             const isSelected = selectedLead === leadId;

// //             return (
// //               <div
// //                 key={leadId}
// //                 onClick={() => setSelectedLead(leadId)}
// //                 className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all"
// //                 style={{
// //                   background: isSelected ? "#e6f9f8" : "#fff",
// //                   border: isSelected ? "1.5px solid #0ea5a4" : "1px solid #e5f0ef",
// //                   boxShadow: isSelected ? "0 2px 8px rgba(14,165,164,0.1)" : "none",
// //                 }}
// //               >
// //                 <div className="flex items-center gap-3 min-w-0">
// //                   {/* Avatar */}
// //                   <div
// //                     className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
// //                     style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
// //                   >
// //                     {name.charAt(0).toUpperCase()}
// //                   </div>
// //                   <div className="min-w-0">
// //                     <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
// //                     <p className={`text-xs font-semibold mt-0.5 ${getStatusTextClass(status)}`}>{status}</p>
// //                     <div className="flex items-center gap-1 mt-1">
// //                       <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //                         <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
// //                       </svg>
// //                       <p className="text-xs text-gray-400 truncate" style={{ maxWidth: 170 }}>{lead.lead_email}</p>
// //                     </div>
// //                     <div className="flex items-center gap-1 mt-0.5">
// //                       <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //                         <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
// //                       </svg>
// //                       <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
// //                     </div>
// //                   </div>
// //                 </div>
// //                 <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
// //                 </svg>
// //               </div>
// //             );
// //           })}
// //         </div>
// //       </div>

// //       {/* ── RIGHT PANEL ── */}
// //       {selectedLead && selectedLeadFirst && (
// //         <div className="flex-1 flex flex-col bg-white overflow-hidden">

// //           {/* Header */}
// //           <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5f0ef" }}>
// //             <div className="flex items-center gap-3">
// //               <div
// //                 className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
// //                 style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
// //               >
// //                 {getLeadName(selectedLeadFirst).charAt(0).toUpperCase()}
// //               </div>
// //               <div>
// //                 <div className="flex items-center gap-2">
// //                   <h2 className="font-bold text-gray-900 text-lg leading-tight">{getLeadName(selectedLeadFirst)}</h2>
// //                   <button className="text-gray-400 hover:text-gray-600">
// //                     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //                       <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
// //                     </svg>
// //                   </button>
// //                 </div>
// //                 <p className="text-xs text-gray-500">
// //                   Lead ID: <span className="font-medium text-gray-700">{selectedLead}</span>
// //                   &nbsp;•&nbsp;Email:&nbsp;
// //                   <span className="text-gray-700">{selectedLeadFirst.lead_email}</span>
// //                 </p>
// //               </div>
// //             </div>
// //             <div className="flex items-center gap-2">
// //               <button
// //                 className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
// //                 style={{ border: "1px solid #d1d5db" }}
// //               >
// //                 <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
// //                 </svg>
// //                 Email
// //               </button>
// //               <button
// //                 className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
// //                 style={{ border: "1px solid #d1d5db" }}
// //               >
// //                 <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
// //                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 4-2.5 1.5A11 11 0 0014.5 15L16 12.5l4 2v3a2 2 0 01-2 2A16 16 0 013 5z" />
// //                 </svg>
// //                 Call
// //               </button>
// //               <button
// //                 className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"
// //                 style={{ border: "1px solid #d1d5db" }}
// //               >
// //                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
// //                   <circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" />
// //                 </svg>
// //               </button>
// //             </div>
// //           </div>

// //           {/* Stage progress bar */}
// //           <div className="px-6 py-3 overflow-x-auto" style={{ borderBottom: "1px solid #e5f0ef" }}>
// //             <div className="flex items-center min-w-max">
// //               {STAGES.map((stage, i) => {
// //                 const isActive = i === stageIndex;
// //                 const isPast = i < stageIndex;
// //                 const isNotQual = stage === "NotQualified";
// //                 return (
// //                   <div key={stage} className="flex items-center">
// //                     <div
// //                       className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full"
// //                       style={{
// //                         border: isActive
// //                           ? isNotQual ? "1.5px solid #fca5a5" : "1.5px solid #0ea5a4"
// //                           : "1px solid #e5e7eb",
// //                         background: isActive
// //                           ? isNotQual ? "#fff1f2" : "#e6f9f8"
// //                           : isPast ? "#f9fafb" : "#fff",
// //                         color: isActive
// //                           ? isNotQual ? "#ef4444" : "#0ea5a4"
// //                           : isPast ? "#9ca3af" : "#9ca3af",
// //                       }}
// //                     >
// //                       {(isActive || isPast) && (
// //                         <div
// //                           className="w-2 h-2 rounded-full shrink-0"
// //                           style={{
// //                             background: isActive
// //                               ? isNotQual ? "#ef4444" : "#0ea5a4"
// //                               : "#9ca3af",
// //                           }}
// //                         />
// //                       )}
// //                       {stage}
// //                     </div>
// //                     {i < STAGES.length - 1 && (
// //                       <div
// //                         className="w-5 h-px mx-0.5"
// //                         style={{ background: i < stageIndex ? "#9ca3af" : "#e5e7eb" }}
// //                       />
// //                     )}
// //                   </div>
// //                 );
// //               })}
// //             </div>
// //           </div>

// //           {/* Timeline */}
// //           <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "#f8fffe" }}>
// //             <div className="relative max-w-4xl mx-auto">
// //               {/* Center vertical line */}
// //               <div
// //                 className="absolute top-0 bottom-0 w-px"
// //                 style={{ left: "50%", transform: "translateX(-50%)", background: "#cbd5e1" }}
// //               />

// //               {selectedLeadData.map((item, index) => {
// //                 const isInbound = item.direction === "inbound";
// //                 const content = item.original_content || item.summary || "";

// //                 return (
// //                   <div key={index} className="relative flex w-full mb-10">

// //                     {/* LEFT: Agent Inbound */}
// //                     <div className="w-1/2 flex justify-end pr-10">
// //                       {isInbound && (
// //                         <div
// //                           className="p-4 rounded-2xl max-w-sm w-full"
// //                           style={{ background: "#dbeafe", boxShadow: "0 1px 4px rgba(59,130,246,0.08)" }}
// //                         >
// //                           <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: "#2563eb" }}>
// //                             AGENT (INBOUND)
// //                           </p>
// //                           <p className="text-sm text-gray-700 leading-relaxed">{content.slice(0, 300)}</p>
// //                           <p className="text-xs text-gray-400 mt-2">{formatDate(item.created_at)}</p>
// //                         </div>
// //                       )}
// //                     </div>

// //                     {/* Center icon */}
// //                     <div
// //                       className="absolute z-10 flex items-center justify-center"
// //                       style={{
// //                         left: "50%", top: "12px",
// //                         transform: "translateX(-50%)",
// //                         width: 32, height: 32,
// //                         borderRadius: "50%",
// //                         border: "2px solid #0ea5a4",
// //                         background: "#fff",
// //                         boxShadow: "0 1px 4px rgba(14,165,164,0.15)",
// //                       }}
// //                     >
// //                       {isInbound ? (
// //                         <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
// //                           <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
// //                         </svg>
// //                       ) : (
// //                         <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
// //                           <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
// //                         </svg>
// //                       )}
// //                     </div>

// //                     {/* RIGHT: Human Outbound */}
// //                     <div className="w-1/2 flex justify-start pl-10">
// //                       {!isInbound && (
// //                         <div
// //                           className="p-4 rounded-2xl max-w-sm w-full"
// //                           style={{ background: "#d1fae5", boxShadow: "0 1px 4px rgba(16,185,129,0.08)" }}
// //                         >
// //                           <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: "#059669" }}>
// //                             HUMAN (OUTBOUND)
// //                           </p>
// //                           <p className="text-sm text-gray-700 leading-relaxed">{content.slice(0, 300)}</p>
// //                           <div className="flex items-center justify-between mt-2">
// //                             <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
// //                             <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2.5} viewBox="0 0 24 24">
// //                               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
// //                             </svg>
// //                           </div>
// //                         </div>
// //                       )}
// //                     </div>

// //                   </div>
// //                 );
// //               })}
// //             </div>
// //           </div>

// //         </div>
// //       )}

// //       {/* Empty state */}
// //       {!selectedLead && (
// //         <div className="flex-1 flex items-center justify-center">
// //           <div className="text-center">
// //             <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="#0ea5a4" strokeWidth={1} viewBox="0 0 24 24" opacity="0.3">
// //               <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
// //             </svg>
// //             <p className="text-sm text-gray-400">Select a lead to view timeline</p>
// //           </div>
// //         </div>
// //       )}

// //     </div>
// //   );
// // }
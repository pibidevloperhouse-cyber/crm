"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STAGES = ["New", "Contact Attempted", "Contacted", "Meeting Booked", "Qualified", "NotQualified"];

const STATUS_STYLES = {
  "New":               { text: "text-blue-600",   },
  "Contact Attempted": { text: "text-yellow-600", },
  "Contacted":         { text: "text-teal-600",   },
  "Meeting Booked":    { text: "text-purple-600", },
  "Qualified":         { text: "text-green-600",  },
  "NotQualified":      { text: "text-red-500",    },
  "In progress":       { text: "text-orange-500", },
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
  if (lead.lead_name) return lead.lead_name;
  if (lead.lead_email) {
    const part = lead.lead_email.split("@")[0];
    return part.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return `Lead ${lead.lead_id}`;
}

export default function AgentWorkflowPage() {
  const [grouped, setGrouped] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("email_memory")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        const groupedData = data.reduce((acc, item) => {
          if (!acc[item.lead_id]) acc[item.lead_id] = [];
          acc[item.lead_id].push(item);
          return acc;
        }, {});
        setGrouped(groupedData);
      }
    };
    fetchData();
  }, []);

  const leadIds = Object.keys(grouped);

  const filteredLeadIds = leadIds.filter((leadId) => {
    const lead = grouped[leadId][0];
    const name = getLeadName(lead).toLowerCase();
    const email = (lead.lead_email || "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const selectedLeadData = selectedLead ? grouped[selectedLead] : null;
  const selectedLeadFirst = selectedLeadData ? selectedLeadData[0] : null;
  const currentStatus = selectedLeadFirst?.status_after || "New";
  const stageIndex = STAGES.findIndex(
    (s) => s.toLowerCase() === currentStatus.toLowerCase()
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#e6f2f1" }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="flex flex-col bg-white transition-all duration-500"
        style={{
          width: selectedLead ? "360px" : "420px",
          minWidth: selectedLead ? "300px" : "auto",
          borderRight: "1px solid #d1e8e7",
        }}
      >
        {/* Top tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #e5f0ef" }}>
          {/* Leads active */}
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            Leads
          </button>
          {/* Deals - display only, no pointer */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 text-sm font-medium" style={{ cursor: "default" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM3 18c0-3.314 4.03-6 9-6s9 2.686 9 6" />
            </svg>
            Deals
          </div>
          {/* Customers - display only */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 text-sm font-medium" style={{ cursor: "default" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm-8 0C5.67 13 1 14.17 1 16.5V19h6v-2.5c0-.83.33-1.61.87-2.22" />
            </svg>
            Customers
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "#f0f9f8", border: "1px solid #c8e6e5" }}
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4" />
            </svg>
          </div>
        </div>

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
          {filteredLeadIds.map((leadId) => {
            const lead = grouped[leadId][0];
            const name = getLeadName(lead);
            const status = lead.status_after || "New";
            const isSelected = selectedLead === leadId;

            return (
              <div
                key={leadId}
                onClick={() => setSelectedLead(leadId)}
                className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all"
                style={{
                  background: isSelected ? "#e6f9f8" : "#fff",
                  border: isSelected ? "1.5px solid #0ea5a4" : "1px solid #e5f0ef",
                  boxShadow: isSelected ? "0 2px 8px rgba(14,165,164,0.1)" : "none",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${getStatusTextClass(status)}`}>{status}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                      <p className="text-xs text-gray-400 truncate" style={{ maxWidth: 170 }}>{lead.lead_email}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
                    </div>
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

      {/* ── RIGHT PANEL ── */}
      {selectedLead && selectedLeadFirst && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5f0ef" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #0ea5a4, #0284c7)" }}
              >
                {getLeadName(selectedLeadFirst).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 text-lg leading-tight">{getLeadName(selectedLeadFirst)}</h2>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Lead ID: <span className="font-medium text-gray-700">{selectedLead}</span>
                  &nbsp;•&nbsp;Email:&nbsp;
                  <span className="text-gray-700">{selectedLeadFirst.lead_email}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                style={{ border: "1px solid #d1d5db" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
                Email
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                style={{ border: "1px solid #d1d5db" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 4-2.5 1.5A11 11 0 0014.5 15L16 12.5l4 2v3a2 2 0 01-2 2A16 16 0 013 5z" />
                </svg>
                Call
              </button>
              <button
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"
                style={{ border: "1px solid #d1d5db" }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stage progress bar */}
          <div className="px-6 py-3 overflow-x-auto" style={{ borderBottom: "1px solid #e5f0ef" }}>
            <div className="flex items-center min-w-max">
              {STAGES.map((stage, i) => {
                const isActive = i === stageIndex;
                const isPast = i < stageIndex;
                const isNotQual = stage === "NotQualified";
                return (
                  <div key={stage} className="flex items-center">
                    <div
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full"
                      style={{
                        border: isActive
                          ? isNotQual ? "1.5px solid #fca5a5" : "1.5px solid #0ea5a4"
                          : "1px solid #e5e7eb",
                        background: isActive
                          ? isNotQual ? "#fff1f2" : "#e6f9f8"
                          : isPast ? "#f9fafb" : "#fff",
                        color: isActive
                          ? isNotQual ? "#ef4444" : "#0ea5a4"
                          : isPast ? "#9ca3af" : "#9ca3af",
                      }}
                    >
                      {(isActive || isPast) && (
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: isActive
                              ? isNotQual ? "#ef4444" : "#0ea5a4"
                              : "#9ca3af",
                          }}
                        />
                      )}
                      {stage}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div
                        className="w-5 h-px mx-0.5"
                        style={{ background: i < stageIndex ? "#9ca3af" : "#e5e7eb" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "#f8fffe" }}>
            <div className="relative max-w-4xl mx-auto">
              {/* Center vertical line */}
              <div
                className="absolute top-0 bottom-0 w-px"
                style={{ left: "50%", transform: "translateX(-50%)", background: "#cbd5e1" }}
              />

              {selectedLeadData.map((item, index) => {
                const isInbound = item.direction === "inbound";
                const content = item.original_content || item.summary || "";

                return (
                  <div key={index} className="relative flex w-full mb-10">

                    {/* LEFT: Agent Inbound */}
                    <div className="w-1/2 flex justify-end pr-10">
                      {isInbound && (
                        <div
                          className="p-4 rounded-2xl max-w-sm w-full"
                          style={{ background: "#dbeafe", boxShadow: "0 1px 4px rgba(59,130,246,0.08)" }}
                        >
                          <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: "#2563eb" }}>
                            AGENT (INBOUND)
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{content.slice(0, 300)}</p>
                          <p className="text-xs text-gray-400 mt-2">{formatDate(item.created_at)}</p>
                        </div>
                      )}
                    </div>

                    {/* Center icon */}
                    <div
                      className="absolute z-10 flex items-center justify-center"
                      style={{
                        left: "50%", top: "12px",
                        transform: "translateX(-50%)",
                        width: 32, height: 32,
                        borderRadius: "50%",
                        border: "2px solid #0ea5a4",
                        background: "#fff",
                        boxShadow: "0 1px 4px rgba(14,165,164,0.15)",
                      }}
                    >
                      {isInbound ? (
                        <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>

                    {/* RIGHT: Human Outbound */}
                    <div className="w-1/2 flex justify-start pl-10">
                      {!isInbound && (
                        <div
                          className="p-4 rounded-2xl max-w-sm w-full"
                          style={{ background: "#d1fae5", boxShadow: "0 1px 4px rgba(16,185,129,0.08)" }}
                        >
                          <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: "#059669" }}>
                            HUMAN (OUTBOUND)
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{content.slice(0, 300)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
                            <svg className="w-4 h-4" fill="none" stroke="#0ea5a4" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!selectedLead && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="#0ea5a4" strokeWidth={1} viewBox="0 0 24 24" opacity="0.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <p className="text-sm text-gray-400">Select a lead to view timeline</p>
          </div>
        </div>
      )}

    </div>
  );
}
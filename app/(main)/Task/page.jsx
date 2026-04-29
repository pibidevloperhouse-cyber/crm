"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Clock,
  Users,
  MapPin,
  Video,
  Phone,
  Calendar,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Mock DB data — replace with your Supabase fetch ─────────────────────────
const MOCK_MEETINGS = [
  { id: 1, title: "Product Demo – Acme Corp", date: "2025-04-29", startTime: "09:00", endTime: "09:45", type: "video", attendees: ["Sarah K.", "Tom H.", "Client"], location: "Zoom", status: "confirmed", color: "#0ea5e9" },
  { id: 2, title: "Pipeline Review", date: "2025-04-29", startTime: "11:00", endTime: "12:00", type: "in-person", attendees: ["Alex M.", "Jordan P."], location: "Conf Room B", status: "confirmed", color: "#14b8a6" },
  { id: 3, title: "Follow-up: Prospect XYZ", date: "2025-04-30", startTime: "14:00", endTime: "14:30", type: "call", attendees: ["You", "Prospect"], location: "Phone", status: "tentative", color: "#f59e0b" },
  { id: 4, title: "Quarterly Business Review", date: "2025-05-01", startTime: "10:00", endTime: "11:30", type: "video", attendees: ["Leadership", "Sales Team"], location: "Google Meet", status: "confirmed", color: "#0ea5e9" },
  { id: 5, title: "Onboarding – New Client", date: "2025-05-05", startTime: "13:00", endTime: "14:00", type: "video", attendees: ["CS Team", "Client"], location: "Zoom", status: "confirmed", color: "#14b8a6" },
  { id: 6, title: "Strategy Sync", date: "2025-05-07", startTime: "09:30", endTime: "10:30", type: "in-person", attendees: ["Director", "You"], location: "HQ – Room 4A", status: "confirmed", color: "#8b5cf6" },
  { id: 7, title: "Cold Outreach Debrief", date: "2025-05-12", startTime: "15:00", endTime: "15:30", type: "call", attendees: ["You", "SDR Team"], location: "Phone", status: "tentative", color: "#f59e0b" },
  { id: 8, title: "Renewal Discussion", date: "2025-05-14", startTime: "11:00", endTime: "11:45", type: "video", attendees: ["Account Mgr.", "Client"], location: "Teams", status: "confirmed", color: "#0ea5e9" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
const typeIcon = (type) => {
  if (type === "video") return <Video size={13} />;
  if (type === "call") return <Phone size={13} />;
  return <MapPin size={13} />;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TaskPage() {
  const router = useRouter();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    setLoading(true);
    setTimeout(() => { setMeetings(MOCK_MEETINGS); setLoading(false); }, 500);
  }, []);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const meetingsOnDate = (dateStr) => meetings.filter((m) => m.date === dateStr);

  const selectedMeetings = meetings
    .filter((m) => m.date === selectedDate)
    .filter((m) => filterType === "all" || m.type === filterType)
    .filter((m) =>
      searchQuery === "" ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.attendees.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const monthMeetings = meetings.filter((m) => {
    const d = new Date(m.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page Header — same style as CRM Dashboard ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
                Task Calendar
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage and track your scheduled meetings
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-9 px-4 bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm font-semibold"
          >
            <Plus size={14} className="mr-1.5" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex h-[calc(100vh-89px)]">

        {/* ── Left: Calendar ── */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col p-5 overflow-y-auto">

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-bold text-slate-700">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = dateStr === selectedDate;
              const dayMeetings = meetingsOnDate(dateStr);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className="relative flex flex-col items-center py-1.5 rounded-lg transition-all duration-150 hover:bg-slate-50"
                  style={{
                    background: isSelected ? "linear-gradient(135deg,#0ea5e9,#14b8a6)" : isToday ? "rgba(14,165,233,0.08)" : "transparent",
                    border: isToday && !isSelected ? "1.5px solid #0ea5e9" : "1.5px solid transparent",
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: isSelected ? "#fff" : isToday ? "#0ea5e9" : "#475569" }}>
                    {day}
                  </span>
                  {dayMeetings.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <div key={m.id} className="w-1 h-1 rounded-full" style={{ background: isSelected ? "rgba(255,255,255,0.9)" : m.color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-4 border-t border-slate-100" />

          {/* Monthly summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{MONTHS[viewMonth]} Summary</p>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-700">{monthMeetings.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Confirmed</span>
              <span className="text-xs font-bold text-emerald-600">{monthMeetings.filter((m) => m.status === "confirmed").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Tentative</span>
              <span className="text-xs font-bold text-amber-500">{monthMeetings.filter((m) => m.status === "tentative").length}</span>
            </div>
          </div>

          <div className="my-4 border-t border-slate-100" />

          {/* Legend */}
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Meeting Types</p>
          {[
            { label: "Video Call", color: "#0ea5e9", icon: <Video size={11} /> },
            { label: "In-person",  color: "#8b5cf6", icon: <MapPin size={11} /> },
            { label: "Phone Call", color: "#f59e0b", icon: <Phone size={11} /> },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: item.color + "18" }}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </div>
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>

        {/* ── Right: Meetings ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">

          {/* Sub-header */}
          <div className="bg-white border-b border-slate-200 px-6 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-slate-700">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
                  <Search size={13} className="text-slate-400" />
                  <input
                    className="bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none w-36"
                    placeholder="Search meetings…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Filter pills */}
                <div className="flex gap-1">
                  {["all", "video", "call", "in-person"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                      style={{
                        background: filterType === t ? "linear-gradient(135deg,#0ea5e9,#14b8a6)" : "#f1f5f9",
                        color: filterType === t ? "#fff" : "#64748b",
                        border: filterType === t ? "none" : "1px solid #e2e8f0",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-teal-300 border-t-teal-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading meetings…</p>
              </div>
            ) : selectedMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl gap-3 bg-white border border-dashed border-slate-300">
                <Calendar size={32} className="text-slate-300" />
                <p className="text-sm text-slate-400">No meetings on this day</p>
                <button className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white mt-1" style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}>
                  + Schedule a meeting
                </button>
              </div>
            ) : (
              selectedMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({ meeting }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 group"
      style={{ borderLeft: `3px solid ${meeting.color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meeting.color + "15" }}>
            <span style={{ color: meeting.color }}>{typeIcon(meeting.type)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-sky-600 transition-colors">{meeting.title}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} />{meeting.startTime} – {meeting.endTime}</span>
              <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} />{meeting.location}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
            style={meeting.status === "confirmed" ? { background: "#d1fae5", color: "#059669" } : { background: "#fef3c7", color: "#d97706" }}
          >
            {meeting.status}
          </span>
          <ChevronRight size={14} className="text-slate-300 transition-transform duration-200" style={{ transform: expanded ? "rotate(90deg)" : "none" }} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-start gap-2">
            <Users size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {meeting.attendees.map((a) => (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{a}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Join Meeting
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              Reschedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
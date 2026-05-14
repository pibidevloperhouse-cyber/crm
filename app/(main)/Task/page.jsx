"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Calendar,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatDateTime(timestamp) {
  if (!timestamp) return "No date set";
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
const categoryIcon = (category) => {
  if (category === "Meeting") return <Users size={13} />;
  if (category === "Call") return <Phone size={13} />;
  return <Calendar size={13} />;
};

// ─── Supabase ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TaskPage() {
  const router = useRouter();
  const today = new Date();

  // ── Auth state ────────────────────────────────────────────────────────────────
  // currentUserEmail holds the logged-in user's email.
  // All DB reads/writes are scoped to this email.
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    title: "", dueAt: "", description: "", category: "Task",
    assigneeId: "", lead_id: "",
  });

  // ── Mobile breakpoint tracker ─────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Theme sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      const t = localStorage.getItem("theme");
      if (t !== null) setDarkMode(t === "true");
    };
    sync();
    const id = setInterval(sync, 200);
    return () => clearInterval(id);
  }, []);

  // ── Get logged-in user email from Supabase Auth ───────────────────────────────
  // This runs once on mount. It reads the active session and extracts the email.
  // If no session exists we redirect to login (adjust the path as needed).
  useEffect(() => {
    const resolveUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // No active session — redirect to your login page
        router.push("/login");
        return;
      }
      setCurrentUserEmail(user.email);
      setAuthLoading(false);
    };
    resolveUser();

    // Also listen for auth state changes (sign-in / sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setCurrentUserEmail(session.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch tasks — scoped to current user's email ──────────────────────────────
  const getCategoryColor = (cat) =>
    ({ Meeting: "#0ea5e9", Call: "#f59e0b", Task: "#8b5cf6", "Follow up": "#14b8a6" }[cat] || "#64748b");

  const fetchTasks = async (email) => {
    if (!email) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        // ✅ Only fetch rows that belong to this user's email
        .eq("email", email)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setTasks(
          data.map((task) => ({
            id: task.id,
            title: task.title || "Untitled Task",
            date: task.dueAt
              ? task.dueAt.split("T")[0]
              : new Date().toISOString().split("T")[0],
            description: task.metadata?.description || "No description",
            category: task.metadata?.category || task.title || "Task",
            status: task.metadata?.status || "active",
            assigneeId: task.assigneeId,
            lead_id: task.lead_id,
            dueAt: task.dueAt,
            metadata: task.metadata,
            email: task.email,
            color: getCategoryColor(task.metadata?.category || task.title || "Task"),
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch once we have the email
  useEffect(() => {
    if (currentUserEmail) fetchTasks(currentUserEmail);
  }, [currentUserEmail]);

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!formData.title) { alert("Please enter a task title"); return; }
    if (!currentUserEmail) { alert("Not logged in"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          title: formData.title,
          dueAt: formData.dueAt
            ? new Date(formData.dueAt).toISOString()
            : new Date().toISOString(),
          assigneeId: formData.assigneeId || null,
          lead_id: formData.lead_id || null,
          // ✅ Store the logged-in user's email
          email: currentUserEmail,
          metadata: {
            description: formData.description || "",
            status: "active",
            category: formData.category || "Task",
          },
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) throw error;
      if (data?.[0]) {
        const t = data[0];
        setTasks([{
          id: t.id,
          title: t.title,
          date: t.dueAt ? t.dueAt.split("T")[0] : new Date().toISOString().split("T")[0],
          description: formData.description || "",
          category: formData.category || "Task",
          status: "active",
          assigneeId: t.assigneeId,
          lead_id: t.lead_id,
          dueAt: t.dueAt,
          metadata: t.metadata,
          email: t.email,
          color: getCategoryColor(formData.category || "Task"),
        }, ...tasks]);
        setIsModalOpen(false);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!currentUserEmail) { alert("Not logged in"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: formData.title,
          dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : null,
          assigneeId: formData.assigneeId || null,
          lead_id: formData.lead_id || null,
          // ✅ Re-stamp email on update (safety: ensure it stays consistent)
          email: currentUserEmail,
          metadata: {
            ...selectedTask.metadata,
            description: formData.description,
            category: formData.category,
          },
        })
        // ✅ Double-check: only update rows owned by this user
        .eq("id", selectedTask.id)
        .eq("email", currentUserEmail);

      if (error) throw error;
      setTasks(tasks.map((t) =>
        t.id === selectedTask.id
          ? {
            ...t,
            title: formData.title,
            dueAt: formData.dueAt,
            date: formData.dueAt,
            description: formData.description,
            category: formData.category,
            assigneeId: formData.assigneeId,
            lead_id: formData.lead_id,
            color: getCategoryColor(formData.category),
          }
          : t
      ));
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to update task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!currentUserEmail) { alert("Not logged in"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", selectedTask.id)
        // ✅ Only delete if this user owns the row
        .eq("email", currentUserEmail);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== selectedTask.id));
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to delete task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTask = async () => {
    if (!currentUserEmail) { alert("Not logged in"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          // ✅ Re-stamp email; mark status closed
          email: currentUserEmail,
          metadata: { ...selectedTask.metadata, status: "closed" },
        })
        .eq("id", selectedTask.id)
        .eq("email", currentUserEmail);

      if (error) throw error;
      setTasks(tasks.map((t) =>
        t.id === selectedTask.id
          ? { ...t, status: "closed", metadata: { ...t.metadata, status: "closed" } }
          : t
      ));
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to close task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (mode, task = null) => {
    setModalMode(mode);
    if (task) {
      setSelectedTask(task);
      setFormData({
        title: task.title,
        dueAt: task.date,
        description: task.description,
        category: task.category,
        assigneeId: task.assigneeId || "",
        lead_id: task.lead_id || "",
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "", dueAt: selectedDate, description: "",
      category: "Task", assigneeId: "", lead_id: "",
    });
    setSelectedTask(null);
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const tasksOnDate = (d) => tasks.filter((t) => t.date === d);
  const selectedTasks = tasks
    .filter((t) => t.date === selectedDate)
    .filter((t) => filterCategory === "all" || t.category === filterCategory)
    .filter((t) =>
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  const monthTasks = tasks.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────────
  const dm = darkMode;
  const pageBg = dm ? "bg-[#0d1117]" : "bg-slate-50";
  const panelBg = dm ? "bg-[#0d1117]" : "bg-white";
  const border = dm ? "border-[#21262d]" : "border-slate-200";
  const divider = dm ? "border-[#21262d]" : "border-slate-100";
  const txtPrimary = dm ? "text-slate-100" : "text-slate-800";
  const txtSub = dm ? "text-slate-400" : "text-slate-600";
  const txtMuted = dm ? "text-slate-500" : "text-slate-400";
  const innerRow = dm ? "bg-[#161b22]" : "bg-slate-50";
  const inputCls = dm
    ? "bg-[#0d1117] border-[#30363d] text-slate-200 placeholder-slate-500 focus:border-teal-500"
    : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-teal-400";
  const labelCls = dm ? "text-slate-300" : "text-slate-700";
  const btnGhost = dm
    ? "text-slate-300 bg-[#21262d] hover:bg-[#30363d]"
    : "text-slate-600 bg-slate-100 hover:bg-slate-200";

  const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Auth loading guard ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          <p className={`text-sm ${txtMuted}`}>Verifying session…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`-m-4 sm:-m-6 lg:-m-10 flex flex-col overflow-hidden ${pageBg} transition-colors duration-300`}
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ════════════════════════════════════════════════════════════
          FIXED TOP — page header
      ════════════════════════════════════════════════════════════ */}
      <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/crm")}
              className={`p-2 rounded-lg transition-colors ${dm ? "hover:bg-[#21262d]" : "hover:bg-slate-100"} ${txtSub}`}
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${txtMuted} mb-0.5`}>
                Smart CRM
              </p>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent">
                Task Calendar
              </h1>
              {/* ✅ Show logged-in user's email in the header */}
              <p className={`text-xs ${txtMuted} mt-0.5`}>
                Showing tasks for&nbsp;
                <span className="font-semibold text-teal-500">{currentUserEmail}</span>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => openModal("add")}
            className="flex-shrink-0 h-9 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-400"
          >
            <Plus size={14} className="mr-1" /> New Task
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BODY — flex row on desktop, flex col on mobile
      ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* ── CALENDAR PANEL ── */}
        <div
          className={`flex-shrink-0 ${panelBg} lg:border-b-0 lg:border-r ${border} lg:w-80 lg:overflow-y-auto flex flex-col`}
          style={{ borderBottom: calendarOpen ? undefined : "none" }}
        >
          <div
            className="lg:block overflow-hidden transition-all duration-300 ease-in-out"
            style={isMobile ? { maxHeight: calendarOpen ? "700px" : "0px", opacity: calendarOpen ? 1 : 0 } : {}}
          >
            <div className="px-4 sm:px-5 pt-4 pb-2">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={prevMonth}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${txtMuted}
                    ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
                >
                  <ChevronLeft size={15} />
                </button>
                <span className={`text-sm font-bold ${txtPrimary}`}>
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                  onClick={nextMonth}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${txtMuted}
                    ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Day header row */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className={`text-center text-[11px] font-semibold ${txtMuted} py-1`}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const isToday =
                    day === today.getDate() &&
                    viewMonth === today.getMonth() &&
                    viewYear === today.getFullYear();
                  const isSel = dateStr === selectedDate;
                  const dayTasks = tasksOnDate(dateStr);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className="relative flex flex-col items-center py-2 rounded-lg transition-all duration-150"
                      style={{
                        background: isSel
                          ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
                          : isToday
                            ? dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.08)"
                            : "transparent",
                        border: isToday && !isSel
                          ? "1.5px solid #0ea5e9"
                          : "1.5px solid transparent",
                      }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: isSel ? "#fff" : isToday ? "#0ea5e9" : dm ? "#94a3b8" : "#475569",
                        }}
                      >
                        {day}
                      </span>
                      {dayTasks.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayTasks.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              className="w-1 h-1 rounded-full"
                              style={{ background: isSel ? "rgba(255,255,255,0.85)" : t.color }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className={`my-3 border-t ${divider}`} />

              {/* Month summary */}
              <div className={`rounded-xl border ${border} ${innerRow} px-3 py-2`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${txtMuted} mb-1.5`}>
                  {MONTHS[viewMonth]} Summary
                </p>
                <div className="flex items-center gap-1.5">
                  <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
                    <span className={`text-[10px] ${txtMuted} leading-none mb-0.5`}>Total</span>
                    <span className={`text-sm font-bold ${txtPrimary}`}>{monthTasks.length}</span>
                  </div>
                  <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
                    <span className="text-[10px] text-emerald-500 leading-none mb-0.5">Active</span>
                    <span className="text-sm font-bold text-emerald-500">
                      {monthTasks.filter((t) => t.status === "active").length}
                    </span>
                  </div>
                  <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
                    <span className={`text-[10px] ${txtMuted} leading-none mb-0.5`}>Closed</span>
                    <span className={`text-sm font-bold ${txtMuted}`}>
                      {monthTasks.filter((t) => t.status === "closed").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle pill — mobile only */}
          <button
            onClick={() => setCalendarOpen((o) => !o)}
            className="lg:hidden w-full flex items-center justify-center gap-2 py-2.5 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: calendarOpen
                ? dm ? "linear-gradient(90deg,#0c4a6e22,#134e4a22)" : "linear-gradient(90deg,#e0f2fe,#ccfbf1)"
                : "linear-gradient(90deg,#0ea5e9,#14b8a6)",
              borderTop: calendarOpen
                ? dm ? "1px solid #21262d" : "1px solid #e2e8f0"
                : "none",
            }}
          >
            {calendarOpen ? (
              <div
                className="flex items-center gap-1.5 px-5 py-1 rounded-full"
                style={{ background: dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.12)" }}
              >
                <ChevronLeft size={14} className="rotate-90" style={{ color: dm ? "#38bdf8" : "#0284c7" }} />
                <span className="text-xs font-semibold" style={{ color: dm ? "#38bdf8" : "#0284c7" }}>
                  Hide Calendar
                </span>
                <ChevronLeft size={14} className="rotate-90" style={{ color: dm ? "#38bdf8" : "#0284c7" }} />
              </div>
            ) : (
              <>
                <ChevronLeft size={16} className="-rotate-90 text-white" />
                <span className="text-xs font-bold text-white tracking-wide">
                  {MONTHS[viewMonth]} {viewYear} · {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}
                </span>
                <ChevronLeft size={16} className="-rotate-90 text-white" />
              </>
            )}
          </button>
        </div>

        {/* ── TASKS PANEL ── */}
        <div className={`flex flex-col flex-1 min-h-0 min-w-0 ${pageBg}`}>

          {/* Selected date label */}
          <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
            <h2 className={`text-sm sm:text-base font-bold ${txtPrimary} leading-tight`}>
              {selectedDateLabel}
            </h2>
            <p className={`text-xs ${txtMuted} mt-0.5`}>
              {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Search + filter pills */}
          <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 sm:max-w-xs
                  ${dm ? "bg-[#161b22] border-[#30363d]" : "bg-slate-100 border-slate-200"}`}
              >
                <Search size={14} className={txtMuted} />
                <input
                  className={`bg-transparent text-sm outline-none w-full
                    ${dm ? "text-slate-200 placeholder-slate-500" : "text-slate-700 placeholder-slate-400"}`}
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-1 flex-wrap">
                {["all", "Meeting", "Call", "Task", "Follow up"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all capitalize whitespace-nowrap"
                    style={{
                      background: filterCategory === cat
                        ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
                        : dm ? "#161b22" : "#f1f5f9",
                      color: filterCategory === cat ? "#fff" : dm ? "#94a3b8" : "#64748b",
                      border: filterCategory === cat ? "none" : dm ? "1px solid #21262d" : "1px solid #e2e8f0",
                    }}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Scrollable task cards ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
                <p className={`text-sm ${txtMuted}`}>Loading tasks…</p>
              </div>
            ) : selectedTasks.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center h-40 rounded-xl gap-3 border border-dashed
                  ${dm ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-slate-300"}`}
              >
                <Calendar size={28} className={txtMuted} />
                <p className={`text-sm ${txtMuted}`}>No tasks on this day</p>
                <button
                  onClick={() => openModal("add")}
                  className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
                >
                  + Add Task
                </button>
              </div>
            ) : (
              selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200
                    ${dm ? "bg-[#0d1117] border-[#21262d]" : "bg-white border-slate-200"}`}
                >
                  {/* Title + status badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`text-sm sm:text-base font-bold ${txtPrimary}`}>{task.title}</h3>
                    {task.status === "closed" && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                          ${dm ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"}`}
                      >
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar size={13} className={txtMuted} />
                    <span className={`text-xs sm:text-sm ${txtSub}`}>
                      Due: {formatDateTime(task.dueAt)}
                    </span>
                  </div>

                  {/* Category */}
                  <div className={`flex items-center gap-2 mb-1.5 ${txtSub}`}>
                    {categoryIcon(task.category)}
                    <span className="text-xs sm:text-sm">{task.category}</span>
                  </div>

                  {/* ✅ Show owner email on the card */}
                  {task.email && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium
                        ${dm ? "bg-teal-900/40 text-teal-400" : "bg-teal-50 text-teal-600"}`}
                      >
                        {task.email}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <p className={`text-xs sm:text-sm ${txtMuted} mb-3 pb-3 border-b ${divider}`}>
                    {task.description}
                  </p>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openModal("delete", task)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                        ${dm ? "text-red-400 bg-red-400/10 hover:bg-red-400/20" : "text-red-600 bg-red-50 hover:bg-red-100"}`}
                    >
                      <Trash2 size={13} /> Delete Task
                    </button>
                    <button
                      onClick={() => openModal("edit", task)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                        ${dm ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" : "text-amber-600 bg-amber-50 hover:bg-amber-100"}`}
                    >
                      <Edit size={13} /> Update Task
                    </button>
                    {task.status !== "closed" && (
                      <button
                        onClick={() => openModal("close", task)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                          ${dm ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}
                      >
                        <CheckCircle size={13} /> Close Task
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL
      ════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]
              ${dm ? "bg-[#161b22] border border-[#30363d]" : "bg-white"}`}
          >
            {/* Modal header */}
            <div className={`p-5 border-b flex-shrink-0 ${dm ? "border-[#21262d]" : "border-slate-100"}`}>
              <h2 className={`text-lg font-bold ${txtPrimary}`}>
                {modalMode === "add" && "Add Task"}
                {modalMode === "edit" && "Edit Task"}
                {modalMode === "delete" && "Delete Task"}
                {modalMode === "close" && "Close Task"}
              </h2>
              {/* ✅ Show whose context the modal is operating in */}
              <p className={`text-xs mt-0.5 ${txtMuted}`}>
                Acting as&nbsp;
                <span className="font-semibold text-teal-500">{currentUserEmail}</span>
              </p>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {(modalMode === "add" || modalMode === "edit") ? (
                <>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Task Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter task title"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Due Date</label>
                    <input
                      type="date"
                      value={formData.dueAt}
                      onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputCls}`}
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Call">Call</option>
                      <option value="Task">Task</option>
                      <option value="Follow up">Follow up</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      placeholder="Enter task description"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Assignee ID (Optional)</label>
                    <input
                      type="text"
                      value={formData.assigneeId}
                      onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                      placeholder="Assignee ID"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Lead ID (Optional)</label>
                    <input
                      type="text"
                      value={formData.lead_id}
                      onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                      placeholder="Lead ID"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                </>
              ) : modalMode === "delete" ? (
                <p className={txtSub}>
                  Are you sure you want to delete&nbsp;
                  "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?
                </p>
              ) : modalMode === "close" ? (
                <p className={txtSub}>
                  Are you sure you want to close&nbsp;
                  "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?
                </p>
              ) : null}
            </div>

            {/* Modal footer */}
            <div
              className={`p-5 flex justify-end gap-2 flex-wrap border-t flex-shrink-0
                ${dm ? "border-[#21262d]" : "border-slate-100"}`}
            >
              <button
                onClick={() => resetForm()}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}
              >
                ❌ Clear Fields
              </button>
              {modalMode === "add" && (
                <button
                  onClick={handleAddTask}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "→ Add Task"}
                </button>
              )}
              {modalMode === "edit" && (
                <button
                  onClick={handleUpdateTask}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Task"}
                </button>
              )}
              {modalMode === "delete" && (
                <button
                  onClick={handleDeleteTask}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </button>
              )}
              {modalMode === "close" && (
                <button
                  onClick={handleCloseTask}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Task"}
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(false)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




















//[PERFECT CODE]
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ChevronLeft,
//   ChevronRight,
//   Users,
//   Phone,
//   Calendar,
//   Plus,
//   Search,
//   Trash2,
//   Edit,
//   CheckCircle,
//   Loader2,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { createClient } from "@supabase/supabase-js";

// // ─── Helpers ───────────────────────────────────────────────────────────────────
// const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
// function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
// function toDateStr(year, month, day) {
//   return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
// }
// function formatDateTime(timestamp) {
//   if (!timestamp) return "No date set";
//   return new Date(timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
// }
// const categoryIcon = (category) => {
//   if (category === "Meeting") return <Users size={13} />;
//   if (category === "Call") return <Phone size={13} />;
//   return <Calendar size={13} />;
// };

// // ─── Supabase ──────────────────────────────────────────────────────────────────
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // ─── Page ──────────────────────────────────────────────────────────────────────
// export default function TaskPage() {
//   const router = useRouter();
//   const today = new Date();

//   const [viewYear, setViewYear] = useState(today.getFullYear());
//   const [viewMonth, setViewMonth] = useState(today.getMonth());
//   const [selectedDate, setSelectedDate] = useState(
//     toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
//   );
//   const [tasks, setTasks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState("all");
//   const [selectedTask, setSelectedTask] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState("add");
//   const [submitting, setSubmitting] = useState(false);
//   const [darkMode, setDarkMode] = useState(false);
//   const [calendarOpen, setCalendarOpen] = useState(true);
//   const [isMobile, setIsMobile] = useState(false);
//   const [formData, setFormData] = useState({
//     title: "", dueAt: "", assigneeId: "", lead_id: "",
//   });

//   // ── Mobile breakpoint tracker ─────────────────────────────────────────────────
//   useEffect(() => {
//     const check = () => setIsMobile(window.innerWidth < 1024);
//     check();
//     window.addEventListener("resize", check);
//     return () => window.removeEventListener("resize", check);
//   }, []);

//   // ── Theme sync ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const sync = () => {
//       const t = localStorage.getItem("theme");
//       if (t !== null) setDarkMode(t === "true");
//     };
//     sync();
//     const id = setInterval(sync, 200);
//     return () => clearInterval(id);
//   }, []);

//   // ── Fetch tasks ───────────────────────────────────────────────────────────────
//   const getCategoryColor = (cat) =>
//     ({ Meeting: "#0ea5e9", Call: "#f59e0b", Task: "#8b5cf6", "Follow up": "#14b8a6" }[cat] || "#64748b");

//   const fetchTasks = async () => {
//     setLoading(true);
//     try {
//       const { data, error } = await supabase
//         .from("tasks")
//         .select("*")
//         .order("created_at", { ascending: false });
//       if (error) throw error;
//       if (data) {
//         setTasks(data.map((task) => ({
//           id: task.id,
//           title: task.title || "Untitled Task",
//           date: task.dueAt ? task.dueAt.split("T")[0] : new Date().toISOString().split("T")[0],
//           description: task.metadata?.description || "No description",
//           category: task.title || "Task",
//           status: task.metadata?.status || "active",
//           assigneeId: task.assigneeId,
//           lead_id: task.lead_id,
//           dueAt: task.dueAt,
//           metadata: task.metadata,
//           color: getCategoryColor(task.title || "Task"),
//         })));
//       }
//     } catch (err) {
//       console.error("Error fetching tasks:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchTasks(); }, []);

//   // ── CRUD ──────────────────────────────────────────────────────────────────────
//   const handleAddTask = async () => {
//     if (!formData.title) { alert("Please enter a task title"); return; }
//     setSubmitting(true);
//     try {
//       const { data, error } = await supabase
//         .from("tasks")
//         .insert([{
//           title: formData.title,
//           dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : new Date().toISOString(),
//           assigneeId: formData.assigneeId || null,
//           lead_id: formData.lead_id || null,
//           metadata: { description: formData.description || "", status: "active", category: formData.category || "Task" },
//           created_at: new Date().toISOString(),
//         }])
//         .select();
//       if (error) throw error;
//       if (data?.[0]) {
//         setTasks([{
//           id: data[0].id, title: data[0].title,
//           date: data[0].dueAt ? data[0].dueAt.split("T")[0] : new Date().toISOString().split("T")[0],
//           description: data[0].metadata?.description || "",
//           category: formData.category || "Task", status: "active",
//           assigneeId: data[0].assigneeId, lead_id: data[0].lead_id,
//           dueAt: data[0].dueAt, metadata: data[0].metadata,
//           color: getCategoryColor(formData.category || "Task"),
//         }, ...tasks]);
//         setIsModalOpen(false); resetForm();
//       }
//     } catch (err) {
//       console.error(err); alert("Failed to add task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const handleUpdateTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from("tasks")
//         .update({
//           title: formData.title,
//           dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : null,
//           assigneeId: formData.assigneeId || null,
//           lead_id: formData.lead_id || null,
//           metadata: { ...selectedTask.metadata, description: formData.description, category: formData.category },
//         })
//         .eq("id", selectedTask.id);
//       if (error) throw error;
//       setTasks(tasks.map((t) =>
//         t.id === selectedTask.id
//           ? {
//             ...t, title: formData.title, dueAt: formData.dueAt, date: formData.dueAt,
//             description: formData.description, category: formData.category,
//             assigneeId: formData.assigneeId, lead_id: formData.lead_id,
//             color: getCategoryColor(formData.category)
//           }
//           : t
//       ));
//       setIsModalOpen(false); resetForm();
//     } catch (err) {
//       console.error(err); alert("Failed to update task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const handleDeleteTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase.from("tasks").delete().eq("id", selectedTask.id);
//       if (error) throw error;
//       setTasks(tasks.filter((t) => t.id !== selectedTask.id));
//       setIsModalOpen(false); resetForm();
//     } catch (err) {
//       console.error(err); alert("Failed to delete task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const handleCloseTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from("tasks")
//         .update({ metadata: { ...selectedTask.metadata, status: "closed" } })
//         .eq("id", selectedTask.id);
//       if (error) throw error;
//       setTasks(tasks.map((t) =>
//         t.id === selectedTask.id
//           ? { ...t, status: "closed", metadata: { ...t.metadata, status: "closed" } }
//           : t
//       ));
//       setIsModalOpen(false); resetForm();
//     } catch (err) {
//       console.error(err); alert("Failed to close task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const openModal = (mode, task = null) => {
//     setModalMode(mode);
//     if (task) {
//       setSelectedTask(task);
//       setFormData({
//         title: task.title, dueAt: task.date, description: task.description,
//         category: task.category, assigneeId: task.assigneeId || "", lead_id: task.lead_id || ""
//       });
//     } else { resetForm(); }
//     setIsModalOpen(true);
//   };

//   const resetForm = () => {
//     setFormData({ title: "", dueAt: selectedDate, description: "", category: "Task", assigneeId: "", lead_id: "" });
//     setSelectedTask(null);
//   };

//   // ── Derived data ──────────────────────────────────────────────────────────────
//   const tasksOnDate = (d) => tasks.filter((t) => t.date === d);
//   const selectedTasks = tasks
//     .filter((t) => t.date === selectedDate)
//     .filter((t) => filterCategory === "all" || t.category === filterCategory)
//     .filter((t) =>
//       !searchQuery ||
//       t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       t.description.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   const monthTasks = tasks.filter((t) => {
//     const d = new Date(t.date);
//     return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
//   });

//   const daysInMonth = getDaysInMonth(viewYear, viewMonth);
//   const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

//   const prevMonth = () => {
//     if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
//     else setViewMonth((m) => m - 1);
//   };
//   const nextMonth = () => {
//     if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
//     else setViewMonth((m) => m + 1);
//   };

//   // ── Theme tokens ──────────────────────────────────────────────────────────────
//   const dm = darkMode;
//   const pageBg = dm ? "bg-[#0d1117]" : "bg-slate-50";
//   const panelBg = dm ? "bg-[#0d1117]" : "bg-white";
//   const border = dm ? "border-[#21262d]" : "border-slate-200";
//   const divider = dm ? "border-[#21262d]" : "border-slate-100";
//   const txtPrimary = dm ? "text-slate-100" : "text-slate-800";
//   const txtSub = dm ? "text-slate-400" : "text-slate-600";
//   const txtMuted = dm ? "text-slate-500" : "text-slate-400";
//   const innerRow = dm ? "bg-[#161b22]" : "bg-slate-50";
//   const inputCls = dm
//     ? "bg-[#0d1117] border-[#30363d] text-slate-200 placeholder-slate-500 focus:border-teal-500"
//     : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-teal-400";
//   const labelCls = dm ? "text-slate-300" : "text-slate-700";
//   const btnGhost = dm
//     ? "text-slate-300 bg-[#21262d] hover:bg-[#30363d]"
//     : "text-slate-600 bg-slate-100 hover:bg-slate-200";

//   const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
//     weekday: "long", day: "numeric", month: "long", year: "numeric",
//   });

//   // ── Render ────────────────────────────────────────────────────────────────────
//   return (
//     <div
//       className={`-m-4 sm:-m-6 lg:-m-10 flex flex-col overflow-hidden ${pageBg} transition-colors duration-300`}
//       style={{ height: "calc(100vh - 64px)" }}
//     >
//       {/* ════════════════════════════════════════════════════════════
//           FIXED TOP — page header
//       ════════════════════════════════════════════════════════════ */}
//       <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
//         <div className="flex items-center justify-between gap-3">
//           <div>
//             <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${txtMuted} mb-0.5`}>
//               Smart CRM
//             </p>
//             <h1 className="text-xl sm:text-2xl font-bold leading-tight bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent">
//               Task Calendar
//             </h1>
//             <p className={`text-xs ${txtMuted} mt-0.5 hidden sm:block`}>
//               Manage and track your scheduled tasks
//             </p>
//           </div>
//           <Button
//             size="sm"
//             onClick={() => openModal("add")}
//             className="flex-shrink-0 h-9 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-400"
//           >
//             <Plus size={14} className="mr-1" /> New Task
//           </Button>
//         </div>
//       </div>

//       {/* ════════════════════════════════════════════════════════════
//           BODY — flex row on desktop, flex col on mobile
//       ════════════════════════════════════════════════════════════ */}
//       <div className="flex flex-col lg:flex-row flex-1 min-h-0">

//         {/* ── CALENDAR PANEL ── */}
//         <div
//           className={`flex-shrink-0 ${panelBg} lg:border-b-0 lg:border-r ${border} lg:w-80 lg:overflow-y-auto flex flex-col`}
//           style={{ borderBottom: calendarOpen ? undefined : "none" }}
//         >
//           {/* ── Collapsible body ── */}
//           <div
//             className={`lg:block overflow-hidden transition-all duration-300 ease-in-out`}
//             style={isMobile ? { maxHeight: calendarOpen ? "700px" : "0px", opacity: calendarOpen ? 1 : 0 } : {}}
//           >
//             <div className={`px-4 sm:px-5 pt-4 pb-2`}>
//               {/* Month navigation */}
//               <div className="flex items-center justify-between mb-3">
//                 <button
//                   onClick={prevMonth}
//                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${txtMuted}
//                     ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
//                 >
//                   <ChevronLeft size={15} />
//                 </button>
//                 <span className={`text-sm font-bold ${txtPrimary}`}>
//                   {MONTHS[viewMonth]} {viewYear}
//                 </span>
//                 <button
//                   onClick={nextMonth}
//                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${txtMuted}
//                     ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
//                 >
//                   <ChevronRight size={15} />
//                 </button>
//               </div>

//               {/* Day header row */}
//               <div className="grid grid-cols-7 mb-1">
//                 {DAYS.map((d) => (
//                   <div key={d} className={`text-center text-[11px] font-semibold ${txtMuted} py-1`}>{d}</div>
//                 ))}
//               </div>

//               {/* Day cells */}
//               <div className="grid grid-cols-7 gap-y-1">
//                 {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
//                 {Array.from({ length: daysInMonth }).map((_, i) => {
//                   const day = i + 1;
//                   const dateStr = toDateStr(viewYear, viewMonth, day);
//                   const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
//                   const isSel = dateStr === selectedDate;
//                   const dayTasks = tasksOnDate(dateStr);
//                   return (
//                     <button
//                       key={day}
//                       onClick={() => setSelectedDate(dateStr)}
//                       className="relative flex flex-col items-center py-2 rounded-lg transition-all duration-150"
//                       style={{
//                         background: isSel
//                           ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
//                           : isToday
//                             ? dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.08)"
//                             : "transparent",
//                         border: isToday && !isSel ? "1.5px solid #0ea5e9" : "1.5px solid transparent",
//                       }}
//                     >
//                       <span
//                         className="text-xs font-semibold"
//                         style={{ color: isSel ? "#fff" : isToday ? "#0ea5e9" : dm ? "#94a3b8" : "#475569" }}
//                       >
//                         {day}
//                       </span>
//                       {dayTasks.length > 0 && (
//                         <div className="flex gap-0.5 mt-0.5">
//                           {dayTasks.slice(0, 3).map((t) => (
//                             <div
//                               key={t.id}
//                               className="w-1 h-1 rounded-full"
//                               style={{ background: isSel ? "rgba(255,255,255,0.85)" : t.color }}
//                             />
//                           ))}
//                         </div>
//                       )}
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* Divider */}
//               <div className={`my-3 border-t ${divider}`} />

//               {/* Month summary — compact chips */}
//               <div className={`rounded-xl border ${border} ${innerRow} px-3 py-2`}>
//                 <p className={`text-[10px] font-bold uppercase tracking-wider ${txtMuted} mb-1.5`}>
//                   {MONTHS[viewMonth]} Summary
//                 </p>
//                 <div className="flex items-center gap-1.5">
//                   <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
//                     <span className={`text-[10px] ${txtMuted} leading-none mb-0.5`}>Total</span>
//                     <span className={`text-sm font-bold ${txtPrimary}`}>{monthTasks.length}</span>
//                   </div>
//                   <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
//                     <span className="text-[10px] text-emerald-500 leading-none mb-0.5">Active</span>
//                     <span className="text-sm font-bold text-emerald-500">{monthTasks.filter((t) => t.status === "active").length}</span>
//                   </div>
//                   <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
//                     <span className={`text-[10px] ${txtMuted} leading-none mb-0.5`}>Closed</span>
//                     <span className={`text-sm font-bold ${txtMuted}`}>{monthTasks.filter((t) => t.status === "closed").length}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ── Toggle pill — mobile only, always visible ── */}
//           <button
//             onClick={() => setCalendarOpen((o) => !o)}
//             className="lg:hidden w-full flex items-center justify-center gap-2 py-2.5 transition-all duration-200 active:scale-[0.98]"
//             style={{
//               background: calendarOpen
//                 ? dm ? "linear-gradient(90deg,#0c4a6e22,#134e4a22)" : "linear-gradient(90deg,#e0f2fe,#ccfbf1)"
//                 : "linear-gradient(90deg,#0ea5e9,#14b8a6)",
//               borderTop: calendarOpen
//                 ? dm ? "1px solid #21262d" : "1px solid #e2e8f0"
//                 : "none",
//             }}
//           >
//             {calendarOpen ? (
//               <>
//                 <div
//                   className="flex items-center gap-1.5 px-5 py-1 rounded-full"
//                   style={{ background: dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.12)" }}
//                 >
//                   <ChevronLeft size={14} className="rotate-90" style={{ color: dm ? "#38bdf8" : "#0284c7" }} />
//                   <span className="text-xs font-semibold" style={{ color: dm ? "#38bdf8" : "#0284c7" }}>
//                     Hide Calendar
//                   </span>
//                   <ChevronLeft size={14} className="rotate-90" style={{ color: dm ? "#38bdf8" : "#0284c7" }} />
//                 </div>
//               </>
//             ) : (
//               <>
//                 <ChevronLeft size={16} className="-rotate-90 text-white" />
//                 <span className="text-xs font-bold text-white tracking-wide">
//                   {MONTHS[viewMonth]} {viewYear} · {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}
//                 </span>
//                 <ChevronLeft size={16} className="-rotate-90 text-white" />
//               </>
//             )}
//           </button>
//         </div>

//         {/* ── TASKS PANEL ── */}
//         <div className={`flex flex-col flex-1 min-h-0 min-w-0 ${pageBg}`}>

//           {/* Fixed: selected date label + task count */}
//           <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
//             <h2 className={`text-sm sm:text-base font-bold ${txtPrimary} leading-tight`}>
//               {selectedDateLabel}
//             </h2>
//             <p className={`text-xs ${txtMuted} mt-0.5`}>
//               {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}
//             </p>
//           </div>

//           {/* Fixed: search + filter pills */}
//           <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
//             <div className="flex flex-col sm:flex-row sm:items-center gap-2">
//               {/* Search */}
//               <div
//                 className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 sm:max-w-xs
//                   ${dm ? "bg-[#161b22] border-[#30363d]" : "bg-slate-100 border-slate-200"}`}
//               >
//                 <Search size={14} className={txtMuted} />
//                 <input
//                   className={`bg-transparent text-sm outline-none w-full
//                     ${dm ? "text-slate-200 placeholder-slate-500" : "text-slate-700 placeholder-slate-400"}`}
//                   placeholder="Search tasks..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                 />
//               </div>

//               {/* Filter pills */}
//               <div className="flex gap-1 flex-wrap">
//                 {["all", "Meeting", "Call", "Task", "Follow up"].map((cat) => (
//                   <button
//                     key={cat}
//                     onClick={() => setFilterCategory(cat)}
//                     className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all capitalize whitespace-nowrap"
//                     style={{
//                       background: filterCategory === cat
//                         ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
//                         : dm ? "#161b22" : "#f1f5f9",
//                       color: filterCategory === cat ? "#fff" : dm ? "#94a3b8" : "#64748b",
//                       border: filterCategory === cat ? "none" : dm ? "1px solid #21262d" : "1px solid #e2e8f0",
//                     }}
//                   >
//                     {cat === "all" ? "All" : cat}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* ── SCROLLABLE: task cards only ── */}
//           <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
//             {loading ? (
//               <div className="flex flex-col items-center justify-center h-40 gap-3">
//                 <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
//                 <p className={`text-sm ${txtMuted}`}>Loading tasks…</p>
//               </div>
//             ) : selectedTasks.length === 0 ? (
//               <div
//                 className={`flex flex-col items-center justify-center h-40 rounded-xl gap-3 border border-dashed
//                   ${dm ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-slate-300"}`}
//               >
//                 <Calendar size={28} className={txtMuted} />
//                 <p className={`text-sm ${txtMuted}`}>No tasks on this day</p>
//                 <button
//                   onClick={() => openModal("add")}
//                   className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white"
//                   style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
//                 >
//                   + Add Task
//                 </button>
//               </div>
//             ) : (
//               selectedTasks.map((task) => (
//                 <div
//                   key={task.id}
//                   className={`rounded-xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200
//                     ${dm ? "bg-[#0d1117] border-[#21262d]" : "bg-white border-slate-200"}`}
//                 >
//                   {/* Title + status badge */}
//                   <div className="flex items-start justify-between gap-2 mb-2">
//                     <h3 className={`text-sm sm:text-base font-bold ${txtPrimary}`}>{task.title}</h3>
//                     {task.status === "closed" && (
//                       <span
//                         className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
//                           ${dm ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"}`}
//                       >
//                         Closed
//                       </span>
//                     )}
//                   </div>

//                   {/* Due date */}
//                   <div className="flex items-center gap-2 mb-1.5">
//                     <Calendar size={13} className={txtMuted} />
//                     <span className={`text-xs sm:text-sm ${txtSub}`}>Due: {formatDateTime(task.dueAt)}</span>
//                   </div>

//                   {/* Category */}
//                   <div className={`flex items-center gap-2 mb-3 ${txtSub}`}>
//                     {categoryIcon(task.category)}
//                     <span className="text-xs sm:text-sm">{task.category}</span>
//                   </div>

//                   {/* Description */}
//                   <p className={`text-xs sm:text-sm ${txtMuted} mb-3 pb-3 border-b ${divider}`}>
//                     {task.description}
//                   </p>

//                   {/* Action buttons */}
//                   <div className="flex gap-2 flex-wrap">
//                     <button
//                       onClick={() => openModal("delete", task)}
//                       className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
//                         ${dm ? "text-red-400 bg-red-400/10 hover:bg-red-400/20" : "text-red-600 bg-red-50 hover:bg-red-100"}`}
//                     >
//                       <Trash2 size={13} /> Delete Task
//                     </button>
//                     <button
//                       onClick={() => openModal("edit", task)}
//                       className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
//                         ${dm ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" : "text-amber-600 bg-amber-50 hover:bg-amber-100"}`}
//                     >
//                       <Edit size={13} /> Update Task
//                     </button>
//                     {task.status !== "closed" && (
//                       <button
//                         onClick={() => openModal("close", task)}
//                         className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
//                           ${dm ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}
//                       >
//                         <CheckCircle size={13} /> Close Task
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ════════════════════════════════════════════════════════════
//           MODAL
//       ════════════════════════════════════════════════════════════ */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//           <div
//             className={`rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]
//               ${dm ? "bg-[#161b22] border border-[#30363d]" : "bg-white"}`}
//           >
//             {/* Modal header */}
//             <div className={`p-5 border-b flex-shrink-0 ${dm ? "border-[#21262d]" : "border-slate-100"}`}>
//               <h2 className={`text-lg font-bold ${txtPrimary}`}>
//                 {modalMode === "add" && "Add Task"}
//                 {modalMode === "edit" && "Edit Task"}
//                 {modalMode === "delete" && "Delete Task"}
//                 {modalMode === "close" && "Close Task"}
//               </h2>
//             </div>

//             {/* Modal body */}
//             <div className="p-5 space-y-4 overflow-y-auto flex-1">
//               {(modalMode === "add" || modalMode === "edit") ? (
//                 <>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Task Title</label>
//                     <input type="text" value={formData.title}
//                       onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                       placeholder="Enter task title"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Due Date</label>
//                     <input type="date" value={formData.dueAt}
//                       onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Category</label>
//                     <select value={formData.category}
//                       onChange={(e) => setFormData({ ...formData, category: e.target.value })}
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputCls}`}
//                     >
//                       <option value="Meeting">Meeting</option>
//                       <option value="Call">Call</option>
//                       <option value="Task">Task</option>
//                       <option value="Follow up">Follow up</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Description</label>
//                     <textarea value={formData.description}
//                       onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//                       rows="3" placeholder="Enter task description"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Assignee ID (Optional)</label>
//                     <input type="text" value={formData.assigneeId}
//                       onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
//                       placeholder="Assignee ID"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Lead ID (Optional)</label>
//                     <input type="text" value={formData.lead_id}
//                       onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
//                       placeholder="Lead ID"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                 </>
//               ) : modalMode === "delete" ? (
//                 <p className={txtSub}>
//                   Are you sure you want to delete&nbsp;
//                   "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?
//                 </p>
//               ) : modalMode === "close" ? (
//                 <p className={txtSub}>
//                   Are you sure you want to close&nbsp;
//                   "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?
//                 </p>
//               ) : null}
//             </div>

//             {/* Modal footer */}
//             <div
//               className={`p-5 flex justify-end gap-2 flex-wrap border-t flex-shrink-0
//                 ${dm ? "border-[#21262d]" : "border-slate-100"}`}
//             >
//               <button onClick={() => { resetForm(); }} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}>
//                 ❌ Clear Fields
//               </button>
//               {modalMode === "add" && (
//                 <button onClick={handleAddTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "→ Add Task"}
//                 </button>
//               )}
//               {modalMode === "edit" && (
//                 <button onClick={handleUpdateTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Task"}
//                 </button>
//               )}
//               {modalMode === "delete" && (
//                 <button onClick={handleDeleteTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
//                 </button>
//               )}
//               {modalMode === "close" && (
//                 <button onClick={handleCloseTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Task"}
//                 </button>
//               )}
//               <button onClick={() => setIsModalOpen(false)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



















// calendar bug only
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ChevronLeft,
//   ChevronRight,
//   Users,
//   Phone,
//   Calendar,
//   Plus,
//   Search,
//   Trash2,
//   Edit,
//   CheckCircle,
//   Loader2,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { createClient } from "@supabase/supabase-js";

// // ─── Helpers ───────────────────────────────────────────────────────────────────
// const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
// function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
// function toDateStr(year, month, day) {
//   return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
// }
// function formatDateTime(timestamp) {
//   if (!timestamp) return "No date set";
//   return new Date(timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
// }
// const categoryIcon = (category) => {
//   if (category === "Meeting") return <Users size={13} />;
//   if (category === "Call") return <Phone size={13} />;
//   return <Calendar size={13} />;
// };

// // ─── Supabase ──────────────────────────────────────────────────────────────────
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // ─── Page ──────────────────────────────────────────────────────────────────────
// export default function TaskPage() {
//   const router = useRouter();
//   const today = new Date();

//   const [viewYear, setViewYear] = useState(today.getFullYear());
//   const [viewMonth, setViewMonth] = useState(today.getMonth());
//   const [selectedDate, setSelectedDate] = useState(
//     toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
//   );
//   const [tasks, setTasks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState("all");
//   const [selectedTask, setSelectedTask] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState("add");
//   const [submitting, setSubmitting] = useState(false);
//   const [darkMode, setDarkMode] = useState(false);
//   const [calendarOpen, setCalendarOpen] = useState(true);
//   const [formData, setFormData] = useState({
//     title: "", dueAt: "", assigneeId: "", lead_id: "",
//   });

//   // ── Theme sync ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const sync = () => {
//       const t = localStorage.getItem("theme");
//       if (t !== null) setDarkMode(t === "true");
//     };
//     sync();
//     const id = setInterval(sync, 200);
//     return () => clearInterval(id);
//   }, []);

//   // ── Fetch tasks ───────────────────────────────────────────────────────────────
//   const getCategoryColor = (cat) =>
//     ({ Meeting: "#0ea5e9", Call: "#f59e0b", Task: "#8b5cf6", "Follow up": "#14b8a6" }[cat] || "#64748b");

//   const fetchTasks = async () => {
//     setLoading(true);
//     try {
//       const { data, error } = await supabase
//         .from("tasks")
//         .select("*")
//         .order("created_at", { ascending: false });
//       if (error) throw error;
//       if (data) {
//         setTasks(data.map((task) => ({
//           id: task.id,
//           title: task.title || "Untitled Task",
//           date: task.dueAt ? task.dueAt.split("T")[0] : new Date().toISOString().split("T")[0],
//           description: task.metadata?.description || "No description",
//           category: task.title || "Task",
//           status: task.metadata?.status || "active",
//           assigneeId: task.assigneeId,
//           lead_id: task.lead_id,
//           dueAt: task.dueAt,
//           metadata: task.metadata,
//           color: getCategoryColor(task.title || "Task"),
//         })));
//       }
//     } catch (err) {
//       console.error("Error fetching tasks:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchTasks(); }, []);

//   // ── CRUD ──────────────────────────────────────────────────────────────────────
//   const handleAddTask = async () => {
//     if (!formData.title) { alert("Please enter a task title"); return; }
//     setSubmitting(true);
//     try {
//       const { data, error } = await supabase
//         .from("tasks")
//         .insert([{
//           title: formData.title,
//           dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : new Date().toISOString(),
//           assigneeId: formData.assigneeId || null,
//           lead_id: formData.lead_id || null,
//           metadata: { description: formData.description || "", status: "active", category: formData.category || "Task" },
//           created_at: new Date().toISOString(),
//         }])
//         .select();
//       if (error) throw error;
//       if (data?.[0]) {
//         setTasks([{
//           id: data[0].id, title: data[0].title,
//           date: data[0].dueAt ? data[0].dueAt.split("T")[0] : new Date().toISOString().split("T")[0],
//           description: data[0].metadata?.description || "",
//           category: formData.category || "Task", status: "active",
//           assigneeId: data[0].assigneeId, lead_id: data[0].lead_id,
//           dueAt: data[0].dueAt, metadata: data[0].metadata,
//           color: getCategoryColor(formData.category || "Task"),
//         }, ...tasks]);
//         setIsModalOpen(false); resetForm();
//       }
//     } catch (err) {
//       console.error(err); alert("Failed to add task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const handleUpdateTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from("tasks")
//         .update({
//           title: formData.title,
//           dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : null,
//           assigneeId: formData.assigneeId || null,
//           lead_id: formData.lead_id || null,
//           metadata: { ...selectedTask.metadata, description: formData.description, category: formData.category },
//         })
//         .eq("id", selectedTask.id);
//       if (error) throw error;
//       setTasks(tasks.map((t) =>
//         t.id === selectedTask.id
//           ? {
//             ...t, title: formData.title, dueAt: formData.dueAt, date: formData.dueAt,
//             description: formData.description, category: formData.category,
//             assigneeId: formData.assigneeId, lead_id: formData.lead_id,
//             color: getCategoryColor(formData.category)
//           }
//           : t
//       ));
//       setIsModalOpen(false); resetForm();
//     } catch (err) {
//       console.error(err); alert("Failed to update task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const handleDeleteTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase.from("tasks").delete().eq("id", selectedTask.id);
//       if (error) throw error;
//       setTasks(tasks.filter((t) => t.id !== selectedTask.id));
//       setIsModalOpen(false); resetForm();
//     } catch (err) {
//       console.error(err); alert("Failed to delete task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const handleCloseTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from("tasks")
//         .update({ metadata: { ...selectedTask.metadata, status: "closed" } })
//         .eq("id", selectedTask.id);
//       if (error) throw error;
//       setTasks(tasks.map((t) =>
//         t.id === selectedTask.id
//           ? { ...t, status: "closed", metadata: { ...t.metadata, status: "closed" } }
//           : t
//       ));
//       setIsModalOpen(false); resetForm();
//     } catch (err) {
//       console.error(err); alert("Failed to close task: " + err.message);
//     } finally { setSubmitting(false); }
//   };

//   const openModal = (mode, task = null) => {
//     setModalMode(mode);
//     if (task) {
//       setSelectedTask(task);
//       setFormData({
//         title: task.title, dueAt: task.date, description: task.description,
//         category: task.category, assigneeId: task.assigneeId || "", lead_id: task.lead_id || ""
//       });
//     } else { resetForm(); }
//     setIsModalOpen(true);
//   };

//   const resetForm = () => {
//     setFormData({ title: "", dueAt: selectedDate, description: "", category: "Task", assigneeId: "", lead_id: "" });
//     setSelectedTask(null);
//   };

//   // ── Derived data ──────────────────────────────────────────────────────────────
//   const tasksOnDate = (d) => tasks.filter((t) => t.date === d);
//   const selectedTasks = tasks
//     .filter((t) => t.date === selectedDate)
//     .filter((t) => filterCategory === "all" || t.category === filterCategory)
//     .filter((t) =>
//       !searchQuery ||
//       t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       t.description.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   const monthTasks = tasks.filter((t) => {
//     const d = new Date(t.date);
//     return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
//   });

//   const daysInMonth = getDaysInMonth(viewYear, viewMonth);
//   const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

//   const prevMonth = () => {
//     if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
//     else setViewMonth((m) => m - 1);
//   };
//   const nextMonth = () => {
//     if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
//     else setViewMonth((m) => m + 1);
//   };

//   // ── Theme tokens ──────────────────────────────────────────────────────────────
//   const dm = darkMode;
//   const pageBg = dm ? "bg-[#0d1117]" : "bg-slate-50";
//   const panelBg = dm ? "bg-[#0d1117]" : "bg-white";
//   const border = dm ? "border-[#21262d]" : "border-slate-200";
//   const divider = dm ? "border-[#21262d]" : "border-slate-100";
//   const txtPrimary = dm ? "text-slate-100" : "text-slate-800";
//   const txtSub = dm ? "text-slate-400" : "text-slate-600";
//   const txtMuted = dm ? "text-slate-500" : "text-slate-400";
//   const innerRow = dm ? "bg-[#161b22]" : "bg-slate-50";
//   const inputCls = dm
//     ? "bg-[#0d1117] border-[#30363d] text-slate-200 placeholder-slate-500 focus:border-teal-500"
//     : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-teal-400";
//   const labelCls = dm ? "text-slate-300" : "text-slate-700";
//   const btnGhost = dm
//     ? "text-slate-300 bg-[#21262d] hover:bg-[#30363d]"
//     : "text-slate-600 bg-slate-100 hover:bg-slate-200";

//   const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
//     weekday: "long", day: "numeric", month: "long", year: "numeric",
//   });

//   // ── Render ────────────────────────────────────────────────────────────────────
//   return (
//     <div
//       className={`-m-4 sm:-m-6 lg:-m-10 flex flex-col overflow-hidden ${pageBg} transition-colors duration-300`}
//       style={{ height: "calc(100vh - 64px)" }}
//     >
//       {/* ════════════════════════════════════════════════════════════
//           FIXED TOP — page header
//       ════════════════════════════════════════════════════════════ */}
//       <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
//         <div className="flex items-center justify-between gap-3">
//           <div>
//             <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${txtMuted} mb-0.5`}>
//               Smart CRM
//             </p>
//             <h1 className="text-xl sm:text-2xl font-bold leading-tight bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent">
//               Task Calendar
//             </h1>
//             <p className={`text-xs ${txtMuted} mt-0.5 hidden sm:block`}>
//               Manage and track your scheduled tasks
//             </p>
//           </div>
//           <Button
//             size="sm"
//             onClick={() => openModal("add")}
//             className="flex-shrink-0 h-9 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-400"
//           >
//             <Plus size={14} className="mr-1" /> New Task
//           </Button>
//         </div>
//       </div>

//       {/* ════════════════════════════════════════════════════════════
//           BODY — flex row on desktop, flex col on mobile
//       ════════════════════════════════════════════════════════════ */}
//       <div className="flex flex-col lg:flex-row flex-1 min-h-0">

//         {/* ── CALENDAR PANEL ── */}
//         <div
//           className={`flex-shrink-0 ${panelBg} lg:border-b-0 lg:border-r ${border} lg:w-80 lg:overflow-y-auto flex flex-col`}
//           style={{ borderBottom: calendarOpen ? undefined : "none" }}
//         >
//           {/* ── Collapsible body ── */}
//           <div
//             className={`lg:block overflow-hidden transition-all duration-300 ease-in-out`}
//             style={{ maxHeight: calendarOpen ? "700px" : "0px", opacity: calendarOpen ? 1 : 0 }}
//           >
//             <div className={`px-4 sm:px-5 pt-4 pb-2`}>
//               {/* Month navigation */}
//               <div className="flex items-center justify-between mb-3">
//                 <button
//                   onClick={prevMonth}
//                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${txtMuted}
//                     ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
//                 >
//                   <ChevronLeft size={15} />
//                 </button>
//                 <span className={`text-sm font-bold ${txtPrimary}`}>
//                   {MONTHS[viewMonth]} {viewYear}
//                 </span>
//                 <button
//                   onClick={nextMonth}
//                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${txtMuted}
//                     ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
//                 >
//                   <ChevronRight size={15} />
//                 </button>
//               </div>

//               {/* Day header row */}
//               <div className="grid grid-cols-7 mb-1">
//                 {DAYS.map((d) => (
//                   <div key={d} className={`text-center text-[11px] font-semibold ${txtMuted} py-1`}>{d}</div>
//                 ))}
//               </div>

//               {/* Day cells */}
//               <div className="grid grid-cols-7 gap-y-1">
//                 {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
//                 {Array.from({ length: daysInMonth }).map((_, i) => {
//                   const day = i + 1;
//                   const dateStr = toDateStr(viewYear, viewMonth, day);
//                   const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
//                   const isSel = dateStr === selectedDate;
//                   const dayTasks = tasksOnDate(dateStr);
//                   return (
//                     <button
//                       key={day}
//                       onClick={() => setSelectedDate(dateStr)}
//                       className="relative flex flex-col items-center py-2 rounded-lg transition-all duration-150"
//                       style={{
//                         background: isSel
//                           ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
//                           : isToday
//                             ? dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.08)"
//                             : "transparent",
//                         border: isToday && !isSel ? "1.5px solid #0ea5e9" : "1.5px solid transparent",
//                       }}
//                     >
//                       <span
//                         className="text-xs font-semibold"
//                         style={{ color: isSel ? "#fff" : isToday ? "#0ea5e9" : dm ? "#94a3b8" : "#475569" }}
//                       >
//                         {day}
//                       </span>
//                       {dayTasks.length > 0 && (
//                         <div className="flex gap-0.5 mt-0.5">
//                           {dayTasks.slice(0, 3).map((t) => (
//                             <div
//                               key={t.id}
//                               className="w-1 h-1 rounded-full"
//                               style={{ background: isSel ? "rgba(255,255,255,0.85)" : t.color }}
//                             />
//                           ))}
//                         </div>
//                       )}
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* Divider */}
//               <div className={`my-3 border-t ${divider}`} />

//               {/* Month summary — compact chips */}
//               <div className={`rounded-xl border ${border} ${innerRow} px-3 py-2`}>
//                 <p className={`text-[10px] font-bold uppercase tracking-wider ${txtMuted} mb-1.5`}>
//                   {MONTHS[viewMonth]} Summary
//                 </p>
//                 <div className="flex items-center gap-1.5">
//                   <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
//                     <span className={`text-[10px] ${txtMuted} leading-none mb-0.5`}>Total</span>
//                     <span className={`text-sm font-bold ${txtPrimary}`}>{monthTasks.length}</span>
//                   </div>
//                   <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
//                     <span className="text-[10px] text-emerald-500 leading-none mb-0.5">Active</span>
//                     <span className="text-sm font-bold text-emerald-500">{monthTasks.filter((t) => t.status === "active").length}</span>
//                   </div>
//                   <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg ${dm ? "bg-[#0d1117]" : "bg-white"}`}>
//                     <span className={`text-[10px] ${txtMuted} leading-none mb-0.5`}>Closed</span>
//                     <span className={`text-sm font-bold ${txtMuted}`}>{monthTasks.filter((t) => t.status === "closed").length}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ── Toggle pill — mobile only, always visible ── */}
//           <button
//             onClick={() => setCalendarOpen((o) => !o)}
//             className="lg:hidden w-full flex items-center justify-center gap-2 py-2.5 transition-all duration-200 active:scale-[0.98]"
//             style={{
//               background: calendarOpen
//                 ? dm ? "linear-gradient(90deg,#0c4a6e22,#134e4a22)" : "linear-gradient(90deg,#e0f2fe,#ccfbf1)"
//                 : "linear-gradient(90deg,#0ea5e9,#14b8a6)",
//               borderTop: calendarOpen
//                 ? dm ? "1px solid #21262d" : "1px solid #e2e8f0"
//                 : "none",
//             }}
//           >
//             {calendarOpen ? (
//               <>
//                 <div
//                   className="flex items-center gap-1.5 px-5 py-1 rounded-full"
//                   style={{ background: dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.12)" }}
//                 >
//                   <ChevronLeft size={14} className="rotate-90" style={{ color: dm ? "#38bdf8" : "#0284c7" }} />
//                   <span className="text-xs font-semibold" style={{ color: dm ? "#38bdf8" : "#0284c7" }}>
//                     Hide Calendar
//                   </span>
//                   <ChevronLeft size={14} className="rotate-90" style={{ color: dm ? "#38bdf8" : "#0284c7" }} />
//                 </div>
//               </>
//             ) : (
//               <>
//                 <ChevronLeft size={16} className="-rotate-90 text-white" />
//                 <span className="text-xs font-bold text-white tracking-wide">
//                   {MONTHS[viewMonth]} {viewYear} · {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}
//                 </span>
//                 <ChevronLeft size={16} className="-rotate-90 text-white" />
//               </>
//             )}
//           </button>
//         </div>

//         {/* ── TASKS PANEL ── */}
//         <div className={`flex flex-col flex-1 min-h-0 min-w-0 ${pageBg}`}>

//           {/* Fixed: selected date label + task count */}
//           <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
//             <h2 className={`text-sm sm:text-base font-bold ${txtPrimary} leading-tight`}>
//               {selectedDateLabel}
//             </h2>
//             <p className={`text-xs ${txtMuted} mt-0.5`}>
//               {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}
//             </p>
//           </div>

//           {/* Fixed: search + filter pills */}
//           <div className={`flex-shrink-0 ${panelBg} border-b ${border} px-4 sm:px-6 py-3`}>
//             <div className="flex flex-col sm:flex-row sm:items-center gap-2">
//               {/* Search */}
//               <div
//                 className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 sm:max-w-xs
//                   ${dm ? "bg-[#161b22] border-[#30363d]" : "bg-slate-100 border-slate-200"}`}
//               >
//                 <Search size={14} className={txtMuted} />
//                 <input
//                   className={`bg-transparent text-sm outline-none w-full
//                     ${dm ? "text-slate-200 placeholder-slate-500" : "text-slate-700 placeholder-slate-400"}`}
//                   placeholder="Search tasks..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                 />
//               </div>

//               {/* Filter pills */}
//               <div className="flex gap-1 flex-wrap">
//                 {["all", "Meeting", "Call", "Task", "Follow up"].map((cat) => (
//                   <button
//                     key={cat}
//                     onClick={() => setFilterCategory(cat)}
//                     className="px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all capitalize whitespace-nowrap"
//                     style={{
//                       background: filterCategory === cat
//                         ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
//                         : dm ? "#161b22" : "#f1f5f9",
//                       color: filterCategory === cat ? "#fff" : dm ? "#94a3b8" : "#64748b",
//                       border: filterCategory === cat ? "none" : dm ? "1px solid #21262d" : "1px solid #e2e8f0",
//                     }}
//                   >
//                     {cat === "all" ? "All" : cat}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* ── SCROLLABLE: task cards only ── */}
//           <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
//             {loading ? (
//               <div className="flex flex-col items-center justify-center h-40 gap-3">
//                 <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
//                 <p className={`text-sm ${txtMuted}`}>Loading tasks…</p>
//               </div>
//             ) : selectedTasks.length === 0 ? (
//               <div
//                 className={`flex flex-col items-center justify-center h-40 rounded-xl gap-3 border border-dashed
//                   ${dm ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-slate-300"}`}
//               >
//                 <Calendar size={28} className={txtMuted} />
//                 <p className={`text-sm ${txtMuted}`}>No tasks on this day</p>
//                 <button
//                   onClick={() => openModal("add")}
//                   className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white"
//                   style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
//                 >
//                   + Add Task
//                 </button>
//               </div>
//             ) : (
//               selectedTasks.map((task) => (
//                 <div
//                   key={task.id}
//                   className={`rounded-xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200
//                     ${dm ? "bg-[#0d1117] border-[#21262d]" : "bg-white border-slate-200"}`}
//                 >
//                   {/* Title + status badge */}
//                   <div className="flex items-start justify-between gap-2 mb-2">
//                     <h3 className={`text-sm sm:text-base font-bold ${txtPrimary}`}>{task.title}</h3>
//                     {task.status === "closed" && (
//                       <span
//                         className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
//                           ${dm ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"}`}
//                       >
//                         Closed
//                       </span>
//                     )}
//                   </div>

//                   {/* Due date */}
//                   <div className="flex items-center gap-2 mb-1.5">
//                     <Calendar size={13} className={txtMuted} />
//                     <span className={`text-xs sm:text-sm ${txtSub}`}>Due: {formatDateTime(task.dueAt)}</span>
//                   </div>

//                   {/* Category */}
//                   <div className={`flex items-center gap-2 mb-3 ${txtSub}`}>
//                     {categoryIcon(task.category)}
//                     <span className="text-xs sm:text-sm">{task.category}</span>
//                   </div>

//                   {/* Description */}
//                   <p className={`text-xs sm:text-sm ${txtMuted} mb-3 pb-3 border-b ${divider}`}>
//                     {task.description}
//                   </p>

//                   {/* Action buttons */}
//                   <div className="flex gap-2 flex-wrap">
//                     <button
//                       onClick={() => openModal("delete", task)}
//                       className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
//                         ${dm ? "text-red-400 bg-red-400/10 hover:bg-red-400/20" : "text-red-600 bg-red-50 hover:bg-red-100"}`}
//                     >
//                       <Trash2 size={13} /> Delete Task
//                     </button>
//                     <button
//                       onClick={() => openModal("edit", task)}
//                       className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
//                         ${dm ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" : "text-amber-600 bg-amber-50 hover:bg-amber-100"}`}
//                     >
//                       <Edit size={13} /> Update Task
//                     </button>
//                     {task.status !== "closed" && (
//                       <button
//                         onClick={() => openModal("close", task)}
//                         className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
//                           ${dm ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}
//                       >
//                         <CheckCircle size={13} /> Close Task
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ════════════════════════════════════════════════════════════
//           MODAL
//       ════════════════════════════════════════════════════════════ */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//           <div
//             className={`rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]
//               ${dm ? "bg-[#161b22] border border-[#30363d]" : "bg-white"}`}
//           >
//             {/* Modal header */}
//             <div className={`p-5 border-b flex-shrink-0 ${dm ? "border-[#21262d]" : "border-slate-100"}`}>
//               <h2 className={`text-lg font-bold ${txtPrimary}`}>
//                 {modalMode === "add" && "Add Task"}
//                 {modalMode === "edit" && "Edit Task"}
//                 {modalMode === "delete" && "Delete Task"}
//                 {modalMode === "close" && "Close Task"}
//               </h2>
//             </div>

//             {/* Modal body */}
//             <div className="p-5 space-y-4 overflow-y-auto flex-1">
//               {(modalMode === "add" || modalMode === "edit") ? (
//                 <>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Task Title</label>
//                     <input type="text" value={formData.title}
//                       onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                       placeholder="Enter task title"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Due Date</label>
//                     <input type="date" value={formData.dueAt}
//                       onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Category</label>
//                     <select value={formData.category}
//                       onChange={(e) => setFormData({ ...formData, category: e.target.value })}
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputCls}`}
//                     >
//                       <option value="Meeting">Meeting</option>
//                       <option value="Call">Call</option>
//                       <option value="Task">Task</option>
//                       <option value="Follow up">Follow up</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Description</label>
//                     <textarea value={formData.description}
//                       onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//                       rows="3" placeholder="Enter task description"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Assignee ID (Optional)</label>
//                     <input type="text" value={formData.assigneeId}
//                       onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
//                       placeholder="Assignee ID"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                   <div>
//                     <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Lead ID (Optional)</label>
//                     <input type="text" value={formData.lead_id}
//                       onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
//                       placeholder="Lead ID"
//                       className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
//                     />
//                   </div>
//                 </>
//               ) : modalMode === "delete" ? (
//                 <p className={txtSub}>
//                   Are you sure you want to delete&nbsp;
//                   "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?
//                 </p>
//               ) : modalMode === "close" ? (
//                 <p className={txtSub}>
//                   Are you sure you want to close&nbsp;
//                   "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?
//                 </p>
//               ) : null}
//             </div>

//             {/* Modal footer */}
//             <div
//               className={`p-5 flex justify-end gap-2 flex-wrap border-t flex-shrink-0
//                 ${dm ? "border-[#21262d]" : "border-slate-100"}`}
//             >
//               <button onClick={() => { resetForm(); }} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}>
//                 ❌ Clear Fields
//               </button>
//               {modalMode === "add" && (
//                 <button onClick={handleAddTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "→ Add Task"}
//                 </button>
//               )}
//               {modalMode === "edit" && (
//                 <button onClick={handleUpdateTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Task"}
//                 </button>
//               )}
//               {modalMode === "delete" && (
//                 <button onClick={handleDeleteTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
//                 </button>
//               )}
//               {modalMode === "close" && (
//                 <button onClick={handleCloseTask} disabled={submitting}
//                   className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 flex items-center gap-2">
//                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Task"}
//                 </button>
//               )}
//               <button onClick={() => setIsModalOpen(false)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }










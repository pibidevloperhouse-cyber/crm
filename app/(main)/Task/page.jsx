"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Users,
  MapPin,
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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(timestamp) {
  if (!timestamp) return "No date set";
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const categoryIcon = (category) => {
  if (category === "Meeting") return <Users size={14} />;
  if (category === "Call") return <Phone size={14} />;
  return <Calendar size={14} />;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TaskPage() {
  const router = useRouter();
  const today = new Date();

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

  const [formData, setFormData] = useState({
    title: "",
    dueAt: "",
    assigneeId: "",
    lead_id: "",
  });

  // ── Read dark mode (same pattern as all other pages) ──
  useEffect(() => {
    const fetchTheme = () => {
      const theme = localStorage.getItem("theme");
      if (theme !== null) setDarkMode(theme === "true");
    };
    fetchTheme();
    const id = setInterval(fetchTheme, 200);
    return () => clearInterval(id);
  }, []);

  // ─── Fetch Tasks ───────────────────────────────────────────────────────────
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const formattedTasks = data.map(task => ({
          id: task.id,
          title: task.title || "Untitled Task",
          date: task.dueAt ? task.dueAt.split('T')[0] : new Date().toISOString().split('T')[0],
          description: task.metadata?.description || "No description",
          category: task.title || "Task",
          status: task.metadata?.status || "active",
          assigneeId: task.assigneeId,
          lead_id: task.lead_id,
          dueAt: task.dueAt,
          metadata: task.metadata,
          color: getCategoryColor(task.title || "Task"),
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Meeting": "#0ea5e9",
      "Call": "#f59e0b",
      "Task": "#8b5cf6",
      "Follow up": "#14b8a6",
    };
    return colors[category] || "#64748b";
  };

  useEffect(() => { fetchTasks(); }, []);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!formData.title) { alert("Please enter a task title"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title,
          dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : new Date().toISOString(),
          assigneeId: formData.assigneeId || null,
          lead_id: formData.lead_id || null,
          metadata: { description: formData.description || "", status: "active", category: formData.category || "Task" },
          created_at: new Date().toISOString(),
        }])
        .select();
      if (error) throw error;
      if (data && data[0]) {
        const newTask = {
          id: data[0].id,
          title: data[0].title,
          date: data[0].dueAt ? data[0].dueAt.split('T')[0] : new Date().toISOString().split('T')[0],
          description: data[0].metadata?.description || "",
          category: formData.category || "Task",
          status: "active",
          assigneeId: data[0].assigneeId,
          lead_id: data[0].lead_id,
          dueAt: data[0].dueAt,
          metadata: data[0].metadata,
          color: getCategoryColor(formData.category || "Task"),
        };
        setTasks([newTask, ...tasks]);
        setIsModalOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('email_memory')
        .update({
          title: formData.title,
          dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : null,
          assigneeId: formData.assigneeId || null,
          lead_id: formData.lead_id || null,
          metadata: { ...selectedTask.metadata, description: formData.description, category: formData.category },
        })
        .eq('id', selectedTask.id);
      if (error) throw error;
      setTasks(tasks.map(task =>
        task.id === selectedTask.id
          ? { ...task, title: formData.title, dueAt: formData.dueAt, date: formData.dueAt, description: formData.description, category: formData.category, assigneeId: formData.assigneeId, lead_id: formData.lead_id, color: getCategoryColor(formData.category) }
          : task
      ));
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', selectedTask.id);
      if (error) throw error;
      setTasks(tasks.filter(task => task.id !== selectedTask.id));
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTask = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ metadata: { ...selectedTask.metadata, status: "closed" } })
        .eq('id', selectedTask.id);
      if (error) throw error;
      setTasks(tasks.map(task =>
        task.id === selectedTask.id
          ? { ...task, status: "closed", metadata: { ...task.metadata, status: "closed" } }
          : task
      ));
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error closing task:", error);
      alert("Failed to close task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (mode, task = null) => {
    setModalMode(mode);
    if (task) {
      setSelectedTask(task);
      setFormData({ title: task.title, dueAt: task.date, description: task.description, category: task.category, assigneeId: task.assigneeId || "", lead_id: task.lead_id || "" });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: "", dueAt: selectedDate, description: "", category: "Task", assigneeId: "", lead_id: "" });
    setSelectedTask(null);
  };

  const clearFields = () => { resetForm(); };

  const tasksOnDate = (dateStr) => tasks.filter((t) => t.date === dateStr);
  const selectedTasks = tasks
    .filter((t) => t.date === selectedDate)
    .filter((t) => filterCategory === "all" || t.category === filterCategory)
    .filter((t) => searchQuery === "" || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()));

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

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const dm = darkMode;
  const pageBg     = dm ? "bg-[#0d1117]" : "bg-slate-50";
  const panelBg    = dm ? "bg-[#0d1117]" : "bg-white";
  const border     = dm ? "border-[#21262d]" : "border-slate-200";
  const divider    = dm ? "border-[#21262d]" : "border-slate-100";
  const txtPrimary = dm ? "text-slate-100"  : "text-slate-800";
  const txtSub     = dm ? "text-slate-400"  : "text-slate-600";
  const txtMuted   = dm ? "text-slate-500"  : "text-slate-400";
  const innerRow   = dm ? "bg-[#161b22]"    : "bg-slate-50";
  const innerHover = dm ? "hover:bg-[#21262d]" : "hover:bg-slate-100";
  const inputCls   = dm
    ? "bg-[#0d1117] border-[#30363d] text-slate-200 placeholder-slate-500 focus:border-teal-500"
    : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-teal-400";
  const labelCls   = dm ? "text-slate-300" : "text-slate-700";
  const btnGhost   = dm
    ? "text-slate-300 bg-[#21262d] hover:bg-[#30363d]"
    : "text-slate-600 bg-slate-100 hover:bg-slate-200";

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>

      {/* ── Page Header ── */}
      <div className={`${panelBg} border-b ${border} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-1.5 ${txtMuted} hover:text-teal-400 transition-colors text-sm font-medium`}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <div className={`w-px h-6 ${dm ? "bg-[#30363d]" : "bg-slate-200"}`} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent">
                Task Calendar
              </h1>
              <p className={`text-xs ${txtMuted} mt-0.5`}>Manage and track your scheduled tasks</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => openModal("add")}
            className="h-9 px-4 bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm font-semibold"
          >
            <Plus size={14} className="mr-1.5" /> New Task
          </Button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex h-[calc(100vh-89px)]">

        {/* ── Calendar Sidebar ── */}
        <div className={`w-80 flex-shrink-0 ${panelBg} border-r ${border} flex flex-col p-5 overflow-y-auto`}>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${txtMuted} ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
            >
              <ChevronLeft size={15} />
            </button>
            <span className={`text-sm font-bold ${txtPrimary}`}>{MONTHS[viewMonth]} {viewYear}</span>
            <button
              onClick={nextMonth}
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${txtMuted} ${dm ? "hover:text-slate-200 hover:bg-[#21262d]" : "hover:text-slate-700 hover:bg-slate-100"}`}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className={`text-center text-[11px] font-semibold ${txtMuted} py-1`}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = dateStr === selectedDate;
              const dayTasks = tasksOnDate(dateStr);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className="relative flex flex-col items-center py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
                      : isToday
                      ? dm ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.08)"
                      : "transparent",
                    border: isToday && !isSelected ? "1.5px solid #0ea5e9" : "1.5px solid transparent",
                  }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isSelected ? "#fff" : isToday ? "#0ea5e9" : dm ? "#94a3b8" : "#475569" }}
                  >
                    {day}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className="w-1 h-1 rounded-full"
                          style={{ background: isSelected ? "rgba(255,255,255,0.9)" : t.color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className={`my-4 border-t ${divider}`} />

          {/* Summary box */}
          <div className={`rounded-xl border ${border} ${innerRow} p-3 space-y-2`}>
            <p className={`text-[11px] font-bold ${txtMuted} uppercase tracking-wider`}>{MONTHS[viewMonth]} Summary</p>
            <div className="flex justify-between">
              <span className={`text-xs ${txtSub}`}>Total Tasks</span>
              <span className={`text-sm font-bold ${txtPrimary}`}>{monthTasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-xs ${txtSub}`}>Active</span>
              <span className="text-xs font-bold text-emerald-500">{monthTasks.filter((t) => t.status === "active").length}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-xs ${txtSub}`}>Closed</span>
              <span className={`text-xs font-bold ${txtMuted}`}>{monthTasks.filter((t) => t.status === "closed").length}</span>
            </div>
          </div>
        </div>

        {/* ── Tasks Panel ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${pageBg}`}>

          {/* Section title */}
          <div className={`${panelBg} border-b ${border} px-6 py-4`}>
            <h2 className={`text-xl font-bold ${txtPrimary}`}>Current Tasks</h2>
          </div>

          {/* Search + filter */}
          <div className={`${panelBg} border-b ${border} px-6 py-3`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 ${dm ? "bg-[#161b22] border-[#30363d]" : "bg-slate-100 border-slate-200"}`}>
                  <Search size={15} className={txtMuted} />
                  <input
                    className={`bg-transparent text-sm outline-none w-full ${dm ? "text-slate-200 placeholder-slate-500" : "text-slate-700 placeholder-slate-400"}`}
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {["all", "Meeting", "Call", "Task", "Follow up"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                    style={{
                      background: filterCategory === cat
                        ? "linear-gradient(135deg,#0ea5e9,#14b8a6)"
                        : dm ? "#161b22" : "#f1f5f9",
                      color: filterCategory === cat ? "#fff" : dm ? "#94a3b8" : "#64748b",
                      border: filterCategory === cat ? "none" : dm ? "1px solid #21262d" : "1px solid #e2e8f0",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task cards */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                <p className={`text-sm ${txtMuted}`}>Loading tasks...</p>
              </div>
            ) : selectedTasks.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-48 rounded-xl gap-3 border border-dashed
                ${dm ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-slate-300"}`}>
                <Calendar size={32} className={txtMuted} />
                <p className={`text-sm ${txtMuted}`}>No tasks on this day</p>
                <button
                  onClick={() => openModal("add")}
                  className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white mt-1"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
                >
                  + Add Task
                </button>
              </div>
            ) : (
              selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-xl border ${dm ? "bg-[#0d1117] border-[#21262d]" : "bg-white border-slate-200"} p-5 shadow-sm hover:shadow-md transition-all duration-200`}
                >
                  <h3 className={`text-base font-bold ${txtPrimary} mb-2`}>{task.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className={txtMuted} />
                    <span className={`text-sm ${txtSub}`}>Due: {formatDateTime(task.dueAt)}</span>
                  </div>
                  <div className={`flex items-center gap-2 mb-3 ${txtSub}`}>
                    {categoryIcon(task.category)}
                    <span className="text-sm">{task.category}</span>
                  </div>
                  <p className={`text-sm ${txtMuted} mb-4 pb-2 border-b ${divider}`}>{task.description}</p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => openModal("delete", task)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                        ${dm ? "text-red-400 bg-red-400/10 hover:bg-red-400/20" : "text-red-600 bg-red-50 hover:bg-red-100"}`}
                    >
                      <Trash2 size={14} /> Delete Task
                    </button>
                    <button
                      onClick={() => openModal("edit", task)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                        ${dm ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" : "text-amber-600 bg-amber-50 hover:bg-amber-100"}`}
                    >
                      <Edit size={14} /> Update Task
                    </button>
                    {task.status !== "closed" && (
                      <button
                        onClick={() => openModal("close", task)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                          ${dm ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}
                      >
                        <CheckCircle size={14} /> Close Task
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className={`${dm ? "bg-[#161b22] border border-[#30363d]" : "bg-white"} rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden`}>

            <div className={`p-6 pb-4 border-b ${dm ? "border-[#21262d]" : "border-slate-100"}`}>
              <h2 className={`text-xl font-bold ${txtPrimary}`}>
                {modalMode === "add" && "Add Task"}
                {modalMode === "edit" && "Edit Task"}
                {modalMode === "delete" && "Delete Task"}
                {modalMode === "close" && "Close Task"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {(modalMode === "add" || modalMode === "edit") ? (
                <>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Task Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter task title"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Due Date</label>
                    <input
                      type="date"
                      value={formData.dueAt}
                      onChange={(e) => setFormData({...formData, dueAt: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, assigneeId: e.target.value})}
                      placeholder="Assignee ID"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${labelCls} mb-1`}>Lead ID (Optional)</label>
                    <input
                      type="text"
                      value={formData.lead_id}
                      onChange={(e) => setFormData({...formData, lead_id: e.target.value})}
                      placeholder="Lead ID"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition ${inputCls}`}
                    />
                  </div>
                </>
              ) : modalMode === "delete" ? (
                <p className={txtSub}>Are you sure you want to delete "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?</p>
              ) : modalMode === "close" ? (
                <p className={txtSub}>Are you sure you want to close "<strong className={txtPrimary}>{selectedTask?.title}</strong>"?</p>
              ) : null}
            </div>

            <div className={`p-6 pt-0 flex justify-end gap-3 flex-wrap border-t ${dm ? "border-[#21262d]" : "border-slate-100"} mt-2`}>
              <button onClick={clearFields} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}>
                ❌ Clear Fields
              </button>
              {modalMode === "add" && (
                <button onClick={handleAddTask} disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "→ Add Task"}
                </button>
              )}
              {modalMode === "edit" && (
                <button onClick={handleUpdateTask} disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg disabled:opacity-60 flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Task"}
                </button>
              )}
              {modalMode === "delete" && (
                <button onClick={handleDeleteTask} disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60 flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </button>
              )}
              {modalMode === "close" && (
                <button onClick={handleCloseTask} disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Task"}
                </button>
              )}
              <button onClick={() => setIsModalOpen(false)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${btnGhost}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ChevronLeft,
//   ChevronRight,
//   ArrowLeft,
//   Users,
//   MapPin,
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

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// function getDaysInMonth(year, month) { 
//   return new Date(year, month + 1, 0).getDate(); 
// }

// function getFirstDayOfMonth(year, month) { 
//   return new Date(year, month, 1).getDay(); 
// }

// function toDateStr(year, month, day) {
//   return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
// }

// function formatDisplayDate(dateStr) {
//   const date = new Date(dateStr);
//   return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
// }

// function formatDateTime(timestamp) {
//   if (!timestamp) return "No date set";
//   const date = new Date(timestamp);
//   return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
// }

// const categoryIcon = (category) => {
//   if (category === "Meeting") return <Users size={14} />;
//   if (category === "Call") return <Phone size={14} />;
//   return <Calendar size={14} />;
// };

// // Initialize Supabase client
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // ─── Page ─────────────────────────────────────────────────────────────────────
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

//   // Form state - matches your database columns
//   const [formData, setFormData] = useState({
//     title: "",
//     dueAt: "",
//     assigneeId: "",
//     lead_id: "",
//   });

//   // ─── Fetch Tasks from your table ─────────────────────────────────────────────
//   const fetchTasks = async () => {
//     setLoading(true);
//     try {
//       // Get the table name - based on your data, it might be 'email_memory' or another name
//       // Let me use the correct table name from your data
//       const { data, error } = await supabase
//         .from('tasks')  // Change this to your actual table name
//         .select('*')
//         .order('created_at', { ascending: false });

//       if (error) throw error;
      
//       if (data) {
//         const formattedTasks = data.map(task => ({
//           id: task.id,
//           title: task.title || "Untitled Task",
//           date: task.dueAt ? task.dueAt.split('T')[0] : new Date().toISOString().split('T')[0],
//           description: task.metadata?.description || "No description", // Get description from metadata if available
//           category: task.title || "Task", // Using title as category since no category column
//           status: task.metadata?.status || "active", // Store status in metadata
//           assigneeId: task.assigneeId,
//           lead_id: task.lead_id,
//           dueAt: task.dueAt,
//           metadata: task.metadata,
//           color: getCategoryColor(task.title || "Task"),
//         }));
//         setTasks(formattedTasks);
//       }
//     } catch (error) {
//       console.error("Error fetching tasks:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getCategoryColor = (category) => {
//     const colors = {
//       "Meeting": "#0ea5e9",
//       "Call": "#f59e0b",
//       "Task": "#8b5cf6",
//       "Follow up": "#14b8a6",
//     };
//     return colors[category] || "#64748b";
//   };

//   useEffect(() => {
//     fetchTasks();
//   }, []);

//   // ─── CRUD Operations matching your table structure ─────────────────────────────────────────
//   const handleAddTask = async () => {
//     if (!formData.title) {
//       alert("Please enter a task title");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const { data, error } = await supabase
//         .from('tasks')  // Change this to your actual table name
//         .insert([
//           {
//             title: formData.title,
//             dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : new Date().toISOString(),
//             assigneeId: formData.assigneeId || null,
//             lead_id: formData.lead_id || null,
//             metadata: {
//               description: formData.description || "",
//               status: "active",
//               category: formData.category || "Task"
//             },
//             created_at: new Date().toISOString(),
//           }
//         ])
//         .select();

//       if (error) throw error;
      
//       if (data && data[0]) {
//         const newTask = {
//           id: data[0].id,
//           title: data[0].title,
//           date: data[0].dueAt ? data[0].dueAt.split('T')[0] : new Date().toISOString().split('T')[0],
//           description: data[0].metadata?.description || "",
//           category: formData.category || "Task",
//           status: "active",
//           assigneeId: data[0].assigneeId,
//           lead_id: data[0].lead_id,
//           dueAt: data[0].dueAt,
//           metadata: data[0].metadata,
//           color: getCategoryColor(formData.category || "Task"),
//         };
//         setTasks([newTask, ...tasks]);
//         setIsModalOpen(false);
//         resetForm();
//       }
//     } catch (error) {
//       console.error("Error adding task:", error);
//       alert("Failed to add task: " + error.message);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleUpdateTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from('email_memory')  // Change this to your actual table name
//         .update({
//           title: formData.title,
//           dueAt: formData.dueAt ? new Date(formData.dueAt).toISOString() : null,
//           assigneeId: formData.assigneeId || null,
//           lead_id: formData.lead_id || null,
//           metadata: {
//             ...selectedTask.metadata,
//             description: formData.description,
//             category: formData.category
//           },
//         })
//         .eq('id', selectedTask.id);

//       if (error) throw error;
      
//       setTasks(tasks.map(task => 
//         task.id === selectedTask.id 
//           ? { 
//               ...task, 
//               title: formData.title,
//               dueAt: formData.dueAt,
//               date: formData.dueAt,
//               description: formData.description,
//               category: formData.category,
//               assigneeId: formData.assigneeId,
//               lead_id: formData.lead_id,
//               color: getCategoryColor(formData.category)
//             }
//           : task
//       ));
//       setIsModalOpen(false);
//       resetForm();
//     } catch (error) {
//       console.error("Error updating task:", error);
//       alert("Failed to update task: " + error.message);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleDeleteTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from('tasks')  // Change this to your actual table name
//         .delete()
//         .eq('id', selectedTask.id);

//       if (error) throw error;
      
//       setTasks(tasks.filter(task => task.id !== selectedTask.id));
//       setIsModalOpen(false);
//       resetForm();
//     } catch (error) {
//       console.error("Error deleting task:", error);
//       alert("Failed to delete task: " + error.message);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleCloseTask = async () => {
//     setSubmitting(true);
//     try {
//       const { error } = await supabase
//         .from('tasks')  // Change this to your actual table name
//         .update({
//           metadata: {
//             ...selectedTask.metadata,
//             status: "closed"
//           }
//         })
//         .eq('id', selectedTask.id);

//       if (error) throw error;
      
//       setTasks(tasks.map(task => 
//         task.id === selectedTask.id 
//           ? { ...task, status: "closed", metadata: { ...task.metadata, status: "closed" } }
//           : task
//       ));
//       setIsModalOpen(false);
//       resetForm();
//     } catch (error) {
//       console.error("Error closing task:", error);
//       alert("Failed to close task: " + error.message);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const openModal = (mode, task = null) => {
//     setModalMode(mode);
//     if (task) {
//       setSelectedTask(task);
//       setFormData({
//         title: task.title,
//         dueAt: task.date,
//         description: task.description,
//         category: task.category,
//         assigneeId: task.assigneeId || "",
//         lead_id: task.lead_id || "",
//       });
//     } else {
//       resetForm();
//     }
//     setIsModalOpen(true);
//   };

//   const resetForm = () => {
//     setFormData({
//       title: "",
//       dueAt: selectedDate,
//       description: "",
//       category: "Task",
//       assigneeId: "",
//       lead_id: "",
//     });
//     setSelectedTask(null);
//   };

//   const clearFields = () => {
//     resetForm();
//   };

//   // Calendar and filtering logic
//   const tasksOnDate = (dateStr) => tasks.filter((t) => t.date === dateStr);
  
//   const selectedTasks = tasks
//     .filter((t) => t.date === selectedDate)
//     .filter((t) => filterCategory === "all" || t.category === filterCategory)
//     .filter((t) =>
//       searchQuery === "" ||
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

//   return (
//     <div className="min-h-screen bg-slate-50">
//       {/* Page Header */}
//       <div className="bg-white border-b border-slate-200 px-6 py-4">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => router.back()}
//               className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
//             >
//               <ArrowLeft size={15} />
//               Back
//             </button>
//             <div className="w-px h-6 bg-slate-200" />
//             <div>
//               <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent">
//                 Task Calendar
//               </h1>
//               <p className="text-xs text-slate-500 mt-0.5">
//                 Manage and track your scheduled tasks
//               </p>
//             </div>
//           </div>
//           <Button
//             size="sm"
//             onClick={() => openModal("add")}
//             className="h-9 px-4 bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm font-semibold"
//           >
//             <Plus size={14} className="mr-1.5" />
//             New Task
//           </Button>
//         </div>
//       </div>

//       {/* Main Layout */}
//       <div className="flex h-[calc(100vh-89px)]">
//         {/* Calendar Sidebar */}
//         <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col p-5 overflow-y-auto">
//           <div className="flex items-center justify-between mb-4">
//             <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
//               <ChevronLeft size={15} />
//             </button>
//             <span className="text-sm font-bold text-slate-700">{MONTHS[viewMonth]} {viewYear}</span>
//             <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
//               <ChevronRight size={15} />
//             </button>
//           </div>

//           <div className="grid grid-cols-7 mb-1">
//             {DAYS.map((d) => (
//               <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
//             ))}
//           </div>

//           <div className="grid grid-cols-7 gap-y-0.5">
//             {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
//             {Array.from({ length: daysInMonth }).map((_, i) => {
//               const day = i + 1;
//               const dateStr = toDateStr(viewYear, viewMonth, day);
//               const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
//               const isSelected = dateStr === selectedDate;
//               const dayTasks = tasksOnDate(dateStr);
//               return (
//                 <button
//                   key={day}
//                   onClick={() => setSelectedDate(dateStr)}
//                   className="relative flex flex-col items-center py-1.5 rounded-lg transition-all duration-150 hover:bg-slate-50"
//                   style={{
//                     background: isSelected ? "linear-gradient(135deg,#0ea5e9,#14b8a6)" : isToday ? "rgba(14,165,233,0.08)" : "transparent",
//                     border: isToday && !isSelected ? "1.5px solid #0ea5e9" : "1.5px solid transparent",
//                   }}
//                 >
//                   <span className="text-xs font-semibold" style={{ color: isSelected ? "#fff" : isToday ? "#0ea5e9" : "#475569" }}>
//                     {day}
//                   </span>
//                   {dayTasks.length > 0 && (
//                     <div className="flex gap-0.5 mt-0.5">
//                       {dayTasks.slice(0, 3).map((t) => (
//                         <div key={t.id} className="w-1 h-1 rounded-full" style={{ background: isSelected ? "rgba(255,255,255,0.9)" : t.color }} />
//                       ))}
//                     </div>
//                   )}
//                 </button>
//               );
//             })}
//           </div>

//           <div className="my-4 border-t border-slate-100" />
          
//           <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
//             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{MONTHS[viewMonth]} Summary</p>
//             <div className="flex justify-between">
//               <span className="text-xs text-slate-500">Total Tasks</span>
//               <span className="text-sm font-bold text-slate-700">{monthTasks.length}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-xs text-slate-500">Active</span>
//               <span className="text-xs font-bold text-emerald-600">{monthTasks.filter((t) => t.status === "active").length}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-xs text-slate-500">Closed</span>
//               <span className="text-xs font-bold text-slate-400">{monthTasks.filter((t) => t.status === "closed").length}</span>
//             </div>
//           </div>
//         </div>

//         {/* Tasks List */}
//         <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
//           <div className="bg-white border-b border-slate-200 px-6 py-4">
//             <h2 className="text-xl font-bold text-slate-800">Current Tasks</h2>
//           </div>

//           <div className="bg-white border-b border-slate-200 px-6 py-3">
//             <div className="flex items-center justify-between gap-3 flex-wrap">
//               <div className="flex items-center gap-2 flex-1 max-w-md">
//                 <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 flex-1">
//                   <Search size={15} className="text-slate-400" />
//                   <input
//                     className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
//                     placeholder="Search tasks..."
//                     value={searchQuery}
//                     onChange={(e) => setSearchQuery(e.target.value)}
//                   />
//                 </div>
//               </div>
//               <div className="flex gap-1">
//                 {["all", "Meeting", "Call", "Task", "Follow up"].map((cat) => (
//                   <button
//                     key={cat}
//                     onClick={() => setFilterCategory(cat)}
//                     className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
//                     style={{
//                       background: filterCategory === cat ? "linear-gradient(135deg,#0ea5e9,#14b8a6)" : "#f1f5f9",
//                       color: filterCategory === cat ? "#fff" : "#64748b",
//                       border: filterCategory === cat ? "none" : "1px solid #e2e8f0",
//                     }}
//                   >
//                     {cat}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           <div className="flex-1 overflow-y-auto p-6 space-y-4">
//             {loading ? (
//               <div className="flex flex-col items-center justify-center h-48 gap-3">
//                 <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
//                 <p className="text-sm text-slate-400">Loading tasks...</p>
//               </div>
//             ) : selectedTasks.length === 0 ? (
//               <div className="flex flex-col items-center justify-center h-48 rounded-xl gap-3 bg-white border border-dashed border-slate-300">
//                 <Calendar size={32} className="text-slate-300" />
//                 <p className="text-sm text-slate-400">No tasks on this day</p>
//                 <button 
//                   onClick={() => openModal("add")}
//                   className="text-xs px-4 py-1.5 rounded-lg font-semibold text-white mt-1" 
//                   style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
//                 >
//                   + Add Task
//                 </button>
//               </div>
//             ) : (
//               selectedTasks.map((task) => (
//                 <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
//                   <h3 className="text-base font-bold text-slate-800 mb-2">{task.title}</h3>
//                   <div className="flex items-center gap-2 mb-2">
//                     <Calendar size={14} className="text-slate-400" />
//                     <span className="text-sm text-slate-600">Due: {formatDateTime(task.dueAt)}</span>
//                   </div>
//                   <div className="flex items-center gap-2 mb-3">
//                     {categoryIcon(task.category)}
//                     <span className="text-sm text-slate-600">{task.category}</span>
//                   </div>
//                   <p className="text-sm text-slate-500 mb-4 pb-2 border-b border-slate-100">{task.description}</p>
//                   <div className="flex gap-3">
//                     <button onClick={() => openModal("delete", task)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
//                       <Trash2 size={14} /> Delete Task
//                     </button>
//                     <button onClick={() => openModal("edit", task)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100">
//                       <Edit size={14} /> Update Task
//                     </button>
//                     {task.status !== "closed" && (
//                       <button onClick={() => openModal("close", task)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100">
//                         <CheckCircle size={14} /> Close Task
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
//             <div className="p-6 pb-2">
//               <h2 className="text-xl font-bold text-slate-800">
//                 {modalMode === "add" && "Add Task"}
//                 {modalMode === "edit" && "Edit Task"}
//                 {modalMode === "delete" && "Delete Task"}
//                 {modalMode === "close" && "Close Task"}
//               </h2>
//             </div>
//             <div className="p-6 space-y-4">
//               {(modalMode === "add" || modalMode === "edit") ? (
//                 <>
//                   <div>
//                     <label className="block text-sm font-semibold text-slate-700 mb-1">Task Title</label>
//                     <input 
//                       type="text" 
//                       value={formData.title} 
//                       onChange={(e) => setFormData({...formData, title: e.target.value})} 
//                       className="w-full px-3 py-2 border border-slate-300 rounded-lg"
//                       placeholder="Enter task title"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
//                     <input 
//                       type="date" 
//                       value={formData.dueAt} 
//                       onChange={(e) => setFormData({...formData, dueAt: e.target.value})} 
//                       className="w-full px-3 py-2 border border-slate-300 rounded-lg"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
//                     <select 
//                       value={formData.category} 
//                       onChange={(e) => setFormData({...formData, category: e.target.value})} 
//                       className="w-full px-3 py-2 border border-slate-300 rounded-lg"
//                     >
//                       <option value="Meeting">Meeting</option>
//                       <option value="Call">Call</option>
//                       <option value="Task">Task</option>
//                       <option value="Follow up">Follow up</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
//                     <textarea 
//                       value={formData.description} 
//                       onChange={(e) => setFormData({...formData, description: e.target.value})} 
//                       className="w-full px-3 py-2 border border-slate-300 rounded-lg" 
//                       rows="3"
//                       placeholder="Enter task description"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-slate-700 mb-1">Assignee ID (Optional)</label>
//                     <input 
//                       type="text" 
//                       value={formData.assigneeId} 
//                       onChange={(e) => setFormData({...formData, assigneeId: e.target.value})} 
//                       className="w-full px-3 py-2 border border-slate-300 rounded-lg"
//                       placeholder="Assignee ID"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-slate-700 mb-1">Lead ID (Optional)</label>
//                     <input 
//                       type="text" 
//                       value={formData.lead_id} 
//                       onChange={(e) => setFormData({...formData, lead_id: e.target.value})} 
//                       className="w-full px-3 py-2 border border-slate-300 rounded-lg"
//                       placeholder="Lead ID"
//                     />
//                   </div>
//                 </>
//               ) : modalMode === "delete" ? (
//                 <p>Are you sure you want to delete "<strong>{selectedTask?.title}</strong>"?</p>
//               ) : modalMode === "close" ? (
//                 <p>Are you sure you want to close "<strong>{selectedTask?.title}</strong>"?</p>
//               ) : null}
//             </div>
//             <div className="p-6 pt-0 flex justify-end gap-3">
//               <button onClick={clearFields} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">❌ Clear Fields</button>
//               {modalMode === "add" && <button onClick={handleAddTask} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "→ Add Task"}</button>}
//               {modalMode === "edit" && <button onClick={handleUpdateTask} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-500 rounded-lg">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Task"}</button>}
//               {modalMode === "delete" && <button onClick={handleDeleteTask} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}</button>}
//               {modalMode === "close" && <button onClick={handleCloseTask} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Task"}</button>}
//               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


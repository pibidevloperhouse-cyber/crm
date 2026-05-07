"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import {
  Mail,
  Phone,
  Trash2,
  Edit,
  Building2,
  DollarSign,
  User,
  Tag,
  Calendar,
  TrendingUp,
  MapPin,
  X,
  ChevronRight,
  History,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import UpdateDeals from "../UpdateDeals";
import EmailTemplate from "../EmailTemplate";

const DEAL_STAGES = [
  "New",
  "Proposal Sent",
  "Negotiation",
  "Closed-won",
  "Closed-lost",
  "On-hold",
  "Abandoned",
];

const STATUS_COLOR = {
  New: "bg-blue-500",
  "Proposal Sent": "bg-violet-500",
  Negotiation: "bg-orange-400",
  "Closed-won": "bg-emerald-500",
  "Closed-lost": "bg-red-500",
  "On-hold": "bg-yellow-500",
  Abandoned: "bg-slate-400",
};

const STATUS_DOT = {
  New: "bg-blue-400",
  "Proposal Sent": "bg-violet-400",
  Negotiation: "bg-orange-400",
  "Closed-won": "bg-emerald-500",
  "Closed-lost": "bg-red-500",
  "On-hold": "bg-yellow-400",
  Abandoned: "bg-slate-400",
};

export default function DealCardMobile({ deal, onChange, fetchDeals, fetchCustomers, session }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState(null);
  const [description, setDescription] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const handleStageClick = (stage) => {
    if (stage === deal.status) return;
    setConfirmStage(stage);
  };

  const handleStatusUpdate = async () => {
    const stage_history = deal.stage_history || [];
    const length = stage_history.length;
    const start_date = stage_history[length - 1]?.end_date || deal.created_at || today;
    const current_history = {
      old_status: deal.status,
      new_status: confirmStage,
      start_date: start_date?.split?.("T")[0] || today,
      end_date: today,
      state_description: description,
    };
    stage_history.push(current_history);

    const { error } = await supabase
      .from("Deals")
      .update({ stage_history, status: confirmStage })
      .eq("id", deal.id);

    if (error) {
      toast.error("Error updating deal");
    } else {
      if (confirmStage === "Closed-won") {
        const customerData = {
          name: deal.name,
          phone: deal.number,
          email: deal.email,
          price: deal.value,
          address: deal.location,
          purchase_history: { product: deal.product, price: deal.value, purchase_date: today },
          industry: deal.industry,
          status: "Active",
          created_at: today,
          user_email: deal.user_email,
        };
        const { data: existing } = await supabase
          .from("Customers")
          .select("*")
          .eq("email", deal.email)
          .eq("user_email", deal.user_email)
          .maybeSingle();

        if (!existing) {
          await fetch("/api/addCustomer", {
            method: "POST",
            body: JSON.stringify({ ...customerData, session }),
          });
        } else {
          await supabase
            .from("Customers")
            .update({
              ...customerData,
              price: existing.price + deal.value,
              status: "Active",
              created_at: existing.created_at,
              purchase_history: [...existing.purchase_history, { product: deal.product, price: deal.value }],
            })
            .eq("email", deal.email)
            .eq("user_email", deal.user_email);
        }
        onChange();
      }
      await fetchDeals();
      await fetchCustomers();
      toast.success("Deal updated successfully");
      setConfirmStage(null);
      setDescription("");
    }
  };

  const handleDeleteDeal = async () => {
    const { error } = await supabase.from("Deals").delete().eq("id", deal.id);
    if (error) {
      toast.error("Error deleting deal");
    } else {
      toast.success("Deleted");
      setOpen(false);
      await fetchDeals();
      onChange();
    }
  };

  const currentIdx = DEAL_STAGES.indexOf(deal.status);

  const InfoRow = ({ icon: Icon, label, value }) =>
    value ? (
      <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-teal-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-slate-800 dark:text-slate-200 font-medium text-sm break-words">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* ── Mobile Kanban Card ── */}
      <div
        onClick={() => setOpen(true)}
        className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-all duration-150 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[11px]">
                {deal?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
              {deal?.name}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[deal.status] || "bg-slate-400"}`} />
        </div>
        {deal?.title && (
          <p className="text-xs text-slate-500 truncate mb-1">{deal.title}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            {deal.value ? `$${deal.value}` : ""}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>

      {/* ── Mobile Bottom Sheet ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 max-w-full w-full h-[92vh] rounded-t-2xl rounded-b-none flex flex-col p-0 gap-0 border-0 shadow-2xl">
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-slate-900 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm">
                  {deal?.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {deal?.name}
                </h2>
                <div className="flex items-center gap-1.5">
                  <Badge className={`${STATUS_COLOR[deal.status]} text-white border-0 text-[9px] h-4 px-1.5`}>
                    {deal.status}
                  </Badge>
                  {deal.value && (
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">${deal.value}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-slate-50 dark:bg-slate-900/50 flex-shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setEmailOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex-shrink-0 active:scale-95 transition-transform"
            >
              <Mail className="w-3.5 h-3.5 text-teal-500" /> Email
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex-shrink-0 active:scale-95 transition-transform">
              <Phone className="w-3.5 h-3.5 text-teal-500" /> Call
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex-shrink-0 active:scale-95 transition-transform"
            >
              <Edit className="w-3.5 h-3.5 text-teal-500" /> Edit
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/40 bg-white dark:bg-slate-800 text-xs font-medium text-red-500 flex-shrink-0 active:scale-95 transition-transform"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b bg-white dark:bg-slate-900 flex-shrink-0">
            {[
              { id: "info", label: "Info", icon: User },
              { id: "history", label: "History", icon: History },
              { id: "flow", label: "Flow", icon: ArrowRight },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-teal-500 text-teal-600 dark:text-teal-400"
                    : "border-transparent text-slate-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
            {/* INFO TAB */}
            {activeTab === "info" && (
              <div className="p-4 space-y-1">
                <InfoRow icon={Mail} label="Email" value={deal.email} />
                <InfoRow icon={Phone} label="Phone" value={deal.number} />
                <InfoRow icon={Building2} label="Company" value={deal.company} />
                <InfoRow icon={Tag} label="Industry" value={deal.industry} />
                <InfoRow icon={Tag} label="Source" value={deal.source} />
                <InfoRow icon={User} label="Owner" value={deal.owner} />
                <InfoRow icon={TrendingUp} label="Priority" value={deal.priority} />
                <InfoRow icon={Calendar} label="Close Date" value={deal.closeDate?.split("T")[0]} />
                <InfoRow icon={DollarSign} label="Value" value={deal.value ? `$${deal.value}` : null} />
                <InfoRow icon={MapPin} label="Location" value={deal.location} />
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <div className="p-4">
                {deal.stage_history && deal.stage_history.length > 0 ? (
                  <div className="space-y-3">
                    {[...deal.stage_history].reverse().map((h, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                          <p className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-400 text-xs">{h.old_status}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-teal-600 dark:text-teal-400 text-xs">{h.new_status}</span>
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-4">{h.start_date} → {h.end_date}</p>
                        {h.state_description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 ml-4 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg italic border border-slate-100 dark:border-slate-700">
                            "{h.state_description}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">No stage history recorded yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* FLOW TAB */}
            {activeTab === "flow" && (
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">Deal Pipeline</p>
                <div className="space-y-2">
                  {DEAL_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isFuture = idx > currentIdx;
                    return (
                      <button
                        key={stage}
                        onClick={() => handleStageClick(stage)}
                        disabled={isCurrent}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
                          isCurrent
                            ? "bg-teal-500 border-teal-500 text-white"
                            : isCompleted
                              ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCurrent ? "bg-white/20 text-white"
                            : isCompleted ? "bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-300"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-left">{stage}</span>
                        {isCurrent && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                        {isFuture && <ChevronRight className="ml-auto w-4 h-4 opacity-40" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 max-w-full w-full h-[92vh] rounded-t-2xl rounded-b-none flex flex-col p-0 gap-0 border-0 shadow-2xl">
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-slate-900 flex-shrink-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Deal</h2>
            <button onClick={() => setEditOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-950">
            <UpdateDeals
              deal_id={deal.id}
              onChange={onChange}
              fetchCustomers={fetchCustomers}
              fetchDeals={fetchDeals}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <EmailTemplate type="Deals" id={deal.id} email={deal.email} />
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="mx-4 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Deal?</DialogTitle>
            <DialogDescription>
              This will permanently remove <b>{deal.name}</b>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteDeal}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Update Modal */}
      <Dialog open={!!confirmStage} onOpenChange={() => setConfirmStage(null)}>
        <DialogContent className="mx-4 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Move to: {confirmStage}</DialogTitle>
            <DialogDescription>
              <span className="text-slate-500">{deal.status}</span> → <span className="text-teal-600">{confirmStage}</span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe what happened in this stage..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] bg-slate-50 dark:bg-slate-900 text-sm"
          />
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmStage(null)}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-sky-700 to-teal-500 text-white" onClick={handleStatusUpdate}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
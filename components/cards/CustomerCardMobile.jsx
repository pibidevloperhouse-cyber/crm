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
import {
  Mail,
  Phone,
  Trash2,
  Edit,
  Building2,
  MapPin,
  Globe,
  DollarSign,
  Calendar,
  ShoppingBag,
  Linkedin,
  X,
  ChevronRight,
  ArrowRight,
  User,
} from "lucide-react";
import EmailTemplate from "../EmailTemplate";
import UpdateCustomer from "../UpdateCustomer";
import { supabase } from "@/utils/supabase/client";
import { toast } from "react-toastify";

const CUSTOMER_STAGES = ["Active", "Inactive", "Churned"];

const STATUS_COLOR = {
  Active: "bg-emerald-500",
  Inactive: "bg-slate-400",
  Churned: "bg-red-500",
};

const STATUS_DOT = {
  Active: "bg-emerald-500",
  Inactive: "bg-slate-400",
  Churned: "bg-red-400",
};

export default function CustomerCardMobile({ customer, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const handleDeleteCustomer = async () => {
    const { error } = await supabase.from("Customers").delete().eq("id", customer.id);
    if (error) {
      toast.error("Error deleting customer");
    } else {
      toast.success("Customer deleted");
      setOpen(false);
      onChange();
    }
  };

  const currentIdx = CUSTOMER_STAGES.indexOf(customer.status);

  const purchaseList = customer.purchase_history
    ? Array.isArray(customer.purchase_history)
      ? customer.purchase_history
      : [customer.purchase_history]
    : [];

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
                {customer?.name
                  ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
              {customer?.name}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[customer.status] || "bg-slate-400"}`} />
        </div>
        {customer?.email && (
          <p className="text-xs text-slate-400 truncate mb-1">{customer.email}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {customer?.price ? (
            <span className="text-xs font-bold text-green-600 dark:text-green-400">${customer.price}</span>
          ) : <span />}
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
                  {customer?.name
                    ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {customer?.name}
                </h2>
                <div className="flex items-center gap-1.5">
                  <Badge className={`${STATUS_COLOR[customer.status]} text-white border-0 text-[9px] h-4 px-1.5`}>
                    {customer.status}
                  </Badge>
                  {customer?.price && (
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">${customer.price}</span>
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
              { id: "purchases", label: "Purchases", icon: ShoppingBag },
              { id: "status", label: "Status", icon: ArrowRight },
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
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                <InfoRow icon={Phone} label="Phone" value={customer.number || customer.phone} />
                <InfoRow icon={Building2} label="Industry" value={customer.industry} />
                <InfoRow icon={MapPin} label="Address" value={customer.address} />
                <InfoRow icon={Globe} label="Website" value={customer.website} />
                <InfoRow icon={Linkedin} label="LinkedIn" value={customer.linkedIn} />
                <InfoRow icon={DollarSign} label="Total Value" value={customer.price ? `$${customer.price}` : null} />
                <InfoRow icon={Calendar} label="Created" value={customer.created_at?.split("T")[0]} />
                {customer.issues && customer.issues !== "[]" && (
                  <div className="pt-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Issues</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl leading-relaxed border border-slate-100 dark:border-slate-700">
                      {typeof customer.issues === "string" ? customer.issues : JSON.stringify(customer.issues)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PURCHASES TAB */}
            {activeTab === "purchases" && (
              <div className="p-4">
                {purchaseList.length > 0 ? (
                  <div className="space-y-3">
                    {purchaseList.map((p, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingBag className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {p.product || "Purchase"}
                          </p>
                          {p.price && (
                            <span className="ml-auto text-sm font-bold text-green-600">${p.price}</span>
                          )}
                        </div>
                        {p.purchase_date && (
                          <p className="text-xs text-slate-400 ml-6">{p.purchase_date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">No purchase history yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* STATUS TAB */}
            {activeTab === "status" && (
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">Customer Status</p>
                <div className="space-y-2">
                  {CUSTOMER_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isFuture = idx > currentIdx;
                    return (
                      <div
                        key={stage}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${
                          isCurrent
                            ? "bg-teal-500 border-teal-500 text-white"
                            : isCompleted
                              ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCurrent ? "bg-white/20 text-white"
                            : isCompleted ? "bg-teal-100 dark:bg-teal-800 text-teal-600"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium">{stage}</span>
                        {isCurrent && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
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
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Customer</h2>
            <button onClick={() => setEditOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-950">
            <UpdateCustomer customer_id={customer.id} onChange={onChange} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <EmailTemplate type="Customers" id={customer.id} email={customer.email} />
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="mx-4 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Customer?</DialogTitle>
            <DialogDescription>
              This will permanently remove <b>{customer.name}</b>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteCustomer}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
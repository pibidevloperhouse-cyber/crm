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
  DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
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
  Tag,
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

export default function CustomerCard({ customer, onChange }) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmStage, setConfirmStage] = useState(null);
  const [description, setDescription] = useState("");

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

  const handleStageClick = (stage) => {
    if (stage === customer.status || updatingStatus) return;
    setConfirmStage(stage);
  };

  const handleStatusUpdate = async () => {
    setUpdatingStatus(true);
    const today = new Date().toISOString().split("T")[0];
    const stageHistory = customer.Stagehistory || [];
    const length = stageHistory.length;
    const start_date =
      stageHistory[length - 1]?.end_date ||
      customer.created_at?.split("T")[0] ||
      today;

    const newEntry = {
      old_status: customer.status,
      new_status: confirmStage,
      start_date,
      end_date: today,
      state_description: description,
    };
    const updatedHistory = [...stageHistory, newEntry];

    const { error } = await supabase
      .from("Customers")
      .update({ status: confirmStage, Stagehistory: updatedHistory })
      .eq("id", customer.id);

    if (error) {
      toast.error("Error updating status");
    } else {
      toast.success(`Status updated to ${confirmStage}`);
      onChange();
    }

    setUpdatingStatus(false);
    setConfirmStage(null);
    setDescription("");
  };

  const currentIdx = CUSTOMER_STAGES.indexOf(customer.status);

  const InfoRow = ({ icon: Icon, label, value }) =>
    value ? (
      <div className="flex items-start gap-2 text-sm py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <Icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-slate-800 dark:text-slate-200 font-medium text-sm break-words">{value}</p>
        </div>
      </div>
    ) : null;

  // Normalise purchase history (object or array)
  const purchaseHistory = customer.purchase_history
    ? Array.isArray(customer.purchase_history)
      ? customer.purchase_history
      : [customer.purchase_history]
    : [];

  // Stage history uses capital-S field
  const stageHistory = customer.Stagehistory || [];

  return (
    <>
      {/* ── Compact Kanban Card ── */}
      <div
        onClick={() => setOpen(true)}
        className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200 group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[10px]">
                {customer?.name
                  ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
              {customer?.name}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[customer.status] || "bg-slate-400"}`} />
        </div>
        {customer?.email && (
          <p className="text-xs text-slate-400 truncate mb-1">{customer.email}</p>
        )}
        {customer?.industry && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{customer.industry}</span>
          </p>
        )}
        <div className="flex items-center justify-between mt-1.5 gap-1">
          {customer?.price ? (
            <span className="text-xs font-bold text-green-600 dark:text-green-400">${customer.price}</span>
          ) : <span />}
          {customer?.created_at && (
            <span className="text-[10px] text-slate-400">{customer.created_at.split("T")[0]}</span>
          )}
        </div>
      </div>

      {/* ── Main Detail Dialog (80% Size) ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/80 flex-shrink-0 pr-12">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-sky-700 to-teal-500 text-white font-bold">
                  {customer?.name
                    ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{customer?.name}</h2>
                <Badge className={`mt-0.5 ${STATUS_COLOR[customer.status] || "bg-slate-400"} text-white border-0 text-[10px] h-5`}>
                  {customer.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => setEmailOpen(true)}>
                <Mail className="w-4 h-4 mr-2" /> Email
              </Button>
              <Button size="sm" variant="outline" className="h-9 px-3">
                <Phone className="w-4 h-4 mr-2" /> Call
              </Button>

              {/* ── Edit: centered Dialog (same as LeadCard) ── */}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 px-3">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0">
                  <DialogHeader className="p-6 border-b">
                    <DialogTitle className="text-xl font-bold">Edit Customer Information</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto p-6">
                    <UpdateCustomer customer_id={customer.id} onChange={onChange} />
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3 text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left — General Info + Purchase History */}
            <div className="w-1/3 border-r overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
              <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">General Information</h3>
              <div className="space-y-1">
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                <InfoRow icon={Phone} label="Phone" value={customer.number || customer.phone} />
                <InfoRow icon={Building2} label="Industry" value={customer.industry} />
                <InfoRow icon={MapPin} label="Address" value={customer.address} />
                <InfoRow icon={Globe} label="Website" value={customer.website} />
                <InfoRow icon={Linkedin} label="LinkedIn" value={customer.linkedIn} />
                <InfoRow icon={DollarSign} label="Total Value" value={customer.price ? `$${customer.price}` : null} />
                <InfoRow icon={Calendar} label="Created" value={customer.created_at?.split("T")[0]} />
              </div>

              {customer.issues && customer.issues !== "[]" && (
                <div className="mt-6">
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Issues</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl leading-relaxed">
                    {typeof customer.issues === "string" ? customer.issues : JSON.stringify(customer.issues)}
                  </p>
                </div>
              )}

              {/* Purchase History */}
              <div className="mt-6">
                <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-3">Purchase History</h3>
                {purchaseHistory.length > 0 ? (
                  <div className="space-y-2">
                    {purchaseHistory.map((p, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingBag className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {p.product || "Purchase"}
                          </p>
                          {p.price && (
                            <span className="ml-auto text-xs font-bold text-green-600">${p.price}</span>
                          )}
                        </div>
                        {p.purchase_date && (
                          <p className="text-[11px] text-slate-400 ml-5">{p.purchase_date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <ShoppingBag className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No purchase history yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — Stage History (uses Stagehistory field) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
              <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">Stage History</h3>
              {stageHistory.length > 0 ? (
                <div className="space-y-3">
                  {[...stageHistory].reverse().map((h, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                        <p className="text-sm font-semibold">
                          <span className="text-slate-400">{h.old_status}</span>
                          <span className="mx-2 text-slate-300">→</span>
                          <span className="text-teal-600 dark:text-teal-400">{h.new_status}</span>
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 ml-5">{h.start_date} to {h.end_date}</p>
                      {h.state_description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 ml-5 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg italic">
                          "{h.state_description}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
                  <Tag className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">No stage history recorded yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Status Flow Footer ── */}
          <div className="border-t bg-white dark:bg-slate-900 p-4 flex-shrink-0">
            <div className="flex items-center gap-4 max-w-full overflow-x-auto no-scrollbar pb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Flow:</span>
              {CUSTOMER_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <button
                      onClick={() => handleStageClick(stage)}
                      disabled={updatingStatus}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                        isCurrent
                          ? "bg-teal-500 border-teal-500 text-white font-bold"
                          : isCompleted
                          ? "bg-teal-50 border-teal-200 text-teal-600"
                          : "bg-white border-slate-200 text-slate-400 hover:border-teal-300"
                      } ${updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className="text-[10px]">{idx + 1}. {stage}</span>
                    </button>
                    {idx < CUSTOMER_STAGES.length - 1 && <div className="w-4 h-[1px] bg-slate-200" />}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ALL MODALS ── */}

      {/* Edit Modal (duplicate for outside main dialog context) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-slate-50 dark:bg-slate-900">
            <DialogTitle className="text-xl font-bold">Edit Customer Information</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950">
            <UpdateCustomer customer_id={customer.id} onChange={onChange} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <EmailTemplate
          type="Customers"
          id={customer.id}
          email={customer.email}
          open={emailOpen}
          onOpenChange={setEmailOpen}
        />
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{customer.name}</strong> from your CRM. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCustomer}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Update Note Modal */}
      <Dialog
        open={!!confirmStage}
        onOpenChange={() => { setConfirmStage(null); setDescription(""); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Update Stage:
              <span className={`inline-block px-2 py-0.5 rounded-full text-white text-xs ${STATUS_COLOR[confirmStage] || "bg-slate-500"}`}>
                {confirmStage}
              </span>
            </DialogTitle>
            <DialogDescription>
              Add a note regarding this status change for the history logs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-teal-500" />
              Stage Note
            </label>
            <Textarea
              placeholder="What happened in this stage? (e.g., 'Customer requested a pause on their subscription')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmStage(null); setDescription(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
            >
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}








// old version before adding stage history and status update flow with notes:
// "use client";

// import { useState } from "react";
// import { Avatar, AvatarFallback } from "../ui/avatar";
// import { Badge } from "../ui/badge";
// import { Button } from "../ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "../ui/dialog";
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "../ui/sheet";
// import { Textarea } from "../ui/textarea";
// import {
//   Mail,
//   Phone,
//   Trash2,
//   Edit,
//   Building2,
//   MapPin,
//   Globe,
//   DollarSign,
//   Calendar,
//   ShoppingBag,
//   Linkedin,
//   Tag,
// } from "lucide-react";
// import EmailTemplate from "../EmailTemplate";
// import UpdateCustomer from "../UpdateCustomer";
// import { supabase } from "@/utils/supabase/client";
// import { toast } from "react-toastify";

// const CUSTOMER_STAGES = ["Active", "Inactive", "Churned"];

// const STATUS_COLOR = {
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-500",
// };

// const STATUS_DOT = {
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-400",
// };

// export default function CustomerCard({ customer, onChange }) {
//   const [open, setOpen] = useState(false);
//   const [deleteOpen, setDeleteOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [emailOpen, setEmailOpen] = useState(false);
//   const [updatingStatus, setUpdatingStatus] = useState(false);
//   const [confirmStage, setConfirmStage] = useState(null);
//   const [description, setDescription] = useState("");

//   const handleDeleteCustomer = async () => {
//     const { error } = await supabase
//       .from("Customers")
//       .delete()
//       .eq("id", customer.id);
//     if (error) {
//       toast.error("Error deleting customer");
//     } else {
//       toast.success("Customer deleted");
//       setOpen(false);
//       onChange();
//     }
//   };

//   const handleStageClick = (stage) => {
//     if (stage === customer.status || updatingStatus) return;
//     setConfirmStage(stage);
//   };

//   const handleStatusUpdate = async () => {
//     setUpdatingStatus(true);

//     const today = new Date().toISOString().split("T")[0];
//     const stageHistory = customer.Stagehistory || [];
//     const length = stageHistory.length;
//     const start_date =
//       stageHistory[length - 1]?.end_date ||
//       customer.created_at?.split("T")[0] ||
//       today;

//     const newEntry = {
//       old_status: customer.status,
//       new_status: confirmStage,
//       start_date,
//       end_date: today,
//       state_description: description,
//     };
//     const updatedHistory = [...stageHistory, newEntry];

//     const { error } = await supabase
//       .from("Customers")
//       .update({ status: confirmStage, Stagehistory: updatedHistory })
//       .eq("id", customer.id);

//     if (error) {
//       toast.error("Error updating status");
//     } else {
//       toast.success(`Status updated to ${confirmStage}`);
//       onChange();
//     }

//     setUpdatingStatus(false);
//     setConfirmStage(null);
//     setDescription("");
//   };

//   const currentIdx = CUSTOMER_STAGES.indexOf(customer.status);

//   const InfoRow = ({ icon: Icon, label, value }) =>
//     value ? (
//       <div className="flex items-start gap-2 text-sm py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
//         <Icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
//         <div className="min-w-0">
//           <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
//           <p className="text-slate-800 dark:text-slate-200 font-medium text-sm break-words">{value}</p>
//         </div>
//       </div>
//     ) : null;

//   return (
//     <>
//       {/* ── Compact Kanban Card ── */}
//       <div
//         onClick={() => setOpen(true)}
//         className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200 group"
//       >
//         <div className="flex items-start justify-between gap-2 mb-2">
//           <div className="flex items-center gap-2 min-w-0">
//             <Avatar className="h-6 w-6 flex-shrink-0">
//               <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[10px]">
//                 {customer?.name
//                   ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
//                   : "?"}
//               </AvatarFallback>
//             </Avatar>
//             <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
//               {customer?.name}
//             </p>
//           </div>
//           <span
//             className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[customer.status] || "bg-slate-400"}`}
//           />
//         </div>

//         {customer?.email && (
//           <p className="text-xs text-slate-400 truncate mb-1">{customer.email}</p>
//         )}
//         {customer?.industry && (
//           <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
//             <Building2 className="w-3 h-3 flex-shrink-0" />
//             <span className="truncate">{customer.industry}</span>
//           </p>
//         )}

//         <div className="flex items-center justify-between mt-1.5 gap-1">
//           {customer?.price ? (
//             <span className="text-xs font-bold text-green-600 dark:text-green-400">
//               ${customer.price}
//             </span>
//           ) : <span />}
//           {customer?.created_at && (
//             <span className="text-[10px] text-slate-400">
//               {customer.created_at.split("T")[0]}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* ── Detail Dialog ── */}
//       <Dialog open={open} onOpenChange={setOpen}>
//         <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">

//           {/* Header */}
//           <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/80 flex-shrink-0 pr-12">
//             <div className="flex items-center gap-3 min-w-0">
//               <Avatar className="h-10 w-10 flex-shrink-0">
//                 <AvatarFallback className="bg-gradient-to-br from-sky-700 to-teal-500 text-white font-bold">
//                   {customer?.name
//                     ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
//                     : "?"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="min-w-0">
//                 <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
//                   {customer?.name}
//                 </h2>
//                 <Badge className={`mt-0.5 ${STATUS_COLOR[customer.status] || "bg-slate-400"} text-white border-0 text-[10px] h-5`}>
//                   {customer.status}
//                 </Badge>
//               </div>
//             </div>

//             <div className="flex items-center gap-2 flex-shrink-0">
//               <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => setEmailOpen(true)}>
//                 <Mail className="w-4 h-4 mr-2" /> Email
//               </Button>

//               <Button size="sm" variant="outline" className="h-9 px-3">
//                 <Phone className="w-4 h-4 mr-2" /> Call
//               </Button>

//               <Sheet open={editOpen} onOpenChange={setEditOpen}>
//                 <SheetTrigger asChild>
//                   <Button size="sm" variant="outline" className="h-9 px-3">
//                     <Edit className="w-4 h-4 mr-2" /> Edit
//                   </Button>
//                 </SheetTrigger>
//                 <SheetContent className="overflow-y-auto min-w-[85vw]">
//                   <SheetHeader>
//                     <SheetTitle>Edit Customer</SheetTitle>
//                     <SheetDescription asChild>
//                       <div>
//                         <UpdateCustomer customer_id={customer.id} onChange={onChange} />
//                       </div>
//                     </SheetDescription>
//                   </SheetHeader>
//                 </SheetContent>
//               </Sheet>

//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="h-9 px-3 text-red-500 border-red-200 hover:bg-red-50"
//                 onClick={() => setDeleteOpen(true)}
//               >
//                 <Trash2 className="w-4 h-4" />
//               </Button>
//             </div>
//           </div>

//           {/* Body */}
//           <div className="flex flex-1 overflow-hidden">

//             {/* Left — General Info + Purchase History */}
//             <div className="w-1/3 border-r overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
//               <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">General Information</h3>
//               <div className="space-y-1">
//                 <InfoRow icon={Mail} label="Email" value={customer.email} />
//                 <InfoRow icon={Phone} label="Phone" value={customer.number || customer.phone} />
//                 <InfoRow icon={Building2} label="Industry" value={customer.industry} />
//                 <InfoRow icon={MapPin} label="Address" value={customer.address} />
//                 <InfoRow icon={Globe} label="Website" value={customer.website} />
//                 <InfoRow icon={Linkedin} label="LinkedIn" value={customer.linkedIn} />
//                 <InfoRow
//                   icon={DollarSign}
//                   label="Total Value"
//                   value={customer.price ? `$${customer.price}` : null}
//                 />
//                 <InfoRow
//                   icon={Calendar}
//                   label="Created"
//                   value={customer.created_at?.split("T")[0]}
//                 />
//               </div>

//               {customer.issues && customer.issues !== "[]" && (
//                 <div className="mt-6">
//                   <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Issues</p>
//                   <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl leading-relaxed">
//                     {typeof customer.issues === "string"
//                       ? customer.issues
//                       : JSON.stringify(customer.issues)}
//                   </p>
//                 </div>
//               )}

//               {/* Purchase History */}
//               <div className="mt-6">
//                 <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-3">Purchase History</h3>
//                 {(() => {
//                   const history = customer.purchase_history
//                     ? Array.isArray(customer.purchase_history)
//                       ? customer.purchase_history
//                       : [customer.purchase_history]
//                     : [];
//                   return history.length > 0 ? (
//                     <div className="space-y-2">
//                       {history.map((p, i) => (
//                         <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
//                           <div className="flex items-center gap-2 mb-1">
//                             <ShoppingBag className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
//                             <p className="text-sm font-semibold text-slate-800 dark:text-white">
//                               {p.product || "Purchase"}
//                             </p>
//                             {p.price && (
//                               <span className="ml-auto text-xs font-bold text-green-600">
//                                 ${p.price}
//                               </span>
//                             )}
//                           </div>
//                           {p.purchase_date && (
//                             <p className="text-[11px] text-slate-400 ml-5">{p.purchase_date}</p>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="flex flex-col items-center justify-center py-6 text-slate-400">
//                       <ShoppingBag className="w-8 h-8 mb-2 opacity-20" />
//                       <p className="text-xs">No purchase history yet.</p>
//                     </div>
//                   );
//                 })()}
//               </div>
//             </div>

//             {/* Right — Stage History */}
//             <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
//               <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">Stage History</h3>
//               {customer.Stagehistory && customer.Stagehistory.length > 0 ? (
//                 <div className="space-y-3">
//                   {[...customer.Stagehistory].reverse().map((h, i) => (
//                     <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border shadow-sm">
//                       <div className="flex items-center gap-3 mb-2">
//                         <div className="w-2 h-2 rounded-full bg-teal-500" />
//                         <p className="text-sm font-semibold">
//                           <span className="text-slate-400">{h.old_status}</span>
//                           <span className="mx-2 text-slate-300">→</span>
//                           <span className="text-teal-600 dark:text-teal-400">{h.new_status}</span>
//                         </p>
//                       </div>
//                       <p className="text-[11px] text-slate-400 ml-5">{h.start_date} to {h.end_date}</p>
//                       {h.state_description && (
//                         <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 ml-5 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg italic">
//                           "{h.state_description}"
//                         </p>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
//                   <Tag className="w-12 h-12 mb-2 opacity-20" />
//                   <p className="text-sm">No stage history recorded yet.</p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── Status Flow Footer ── */}
//           <div className="border-t bg-white dark:bg-slate-900 p-4 flex-shrink-0">
//             <div className="flex items-center gap-4 max-w-full overflow-x-auto no-scrollbar pb-2">
//               <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Flow:</span>
//               {CUSTOMER_STAGES.map((stage, idx) => {
//                 const isCompleted = idx < currentIdx;
//                 const isCurrent = idx === currentIdx;
//                 return (
//                   <div key={stage} className="flex items-center gap-2">
//                     <button
//                       onClick={() => handleStageClick(stage)}
//                       disabled={updatingStatus}
//                       className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
//                         isCurrent
//                           ? "bg-teal-500 border-teal-500 text-white font-bold"
//                           : isCompleted
//                           ? "bg-teal-50 border-teal-200 text-teal-600"
//                           : "bg-white border-slate-200 text-slate-400 hover:border-teal-300"
//                       } ${updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
//                     >
//                       <span className="text-[10px]">{idx + 1}. {stage}</span>
//                     </button>
//                     {idx < CUSTOMER_STAGES.length - 1 && (
//                       <div className="w-4 h-[1px] bg-slate-200" />
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* ── ALL MODALS ── */}

//       {/* Email Modal */}
//       <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
//         <EmailTemplate
//           type="Customers"
//           id={customer.id}
//           email={customer.email}
//           open={emailOpen}
//           onOpenChange={setEmailOpen}
//         />
//       </Dialog>

//       {/* Delete Confirmation */}
//       <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Delete Customer?</DialogTitle>
//             <DialogDescription>
//               This will permanently remove <strong>{customer.name}</strong> from your CRM. This action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter className="gap-2 sm:gap-0">
//             <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
//             <Button variant="destructive" onClick={handleDeleteCustomer}>Confirm Delete</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Stage Update Note Modal */}
//       <Dialog
//         open={!!confirmStage}
//         onOpenChange={() => {
//           setConfirmStage(null);
//           setDescription("");
//         }}
//       >
//         <DialogContent className="max-w-lg">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               Update Stage:
//               <span className={`inline-block px-2 py-0.5 rounded-full text-white text-xs ${STATUS_COLOR[confirmStage] || "bg-slate-500"}`}>
//                 {confirmStage}
//               </span>
//             </DialogTitle>
//             <DialogDescription>
//               Add a note regarding this status change for the history logs.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-1.5">
//             <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
//               <Tag className="w-3.5 h-3.5 text-teal-500" />
//               Stage Note
//             </label>
//             <Textarea
//               placeholder="What happened in this stage? (e.g., 'Customer requested a pause on their subscription')"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               className="min-h-[120px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
//             />
//           </div>

//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 setConfirmStage(null);
//                 setDescription("");
//               }}
//             >
//               Cancel
//             </Button>
//             <Button
//               className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
//               onClick={handleStatusUpdate}
//               disabled={updatingStatus}
//             >
//               Save Progress
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }
















// "use client";

// import { useState } from "react";
// import { Avatar, AvatarFallback } from "../ui/avatar";
// import { Badge } from "../ui/badge";
// import { Button } from "../ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
//   DialogTrigger,
// } from "../ui/dialog";
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "../ui/sheet";
// import {
//   Mail,
//   Phone,
//   Trash2,
//   Edit,
//   Building2,
//   MapPin,
//   Globe,
//   DollarSign,
//   Calendar,
//   ShoppingBag,
//   Linkedin,
// } from "lucide-react";
// import EmailTemplate from "../EmailTemplate";
// import UpdateCustomer from "../UpdateCustomer";
// import { supabase } from "@/utils/supabase/client";
// import { toast } from "react-toastify";

// const CUSTOMER_STAGES = ["Active", "Inactive", "Churned"];

// const STATUS_COLOR = {
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-500",
// };

// const STATUS_DOT = {
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-400",
// };

// export default function CustomerCard({ customer, onChange }) {
//   const [open, setOpen] = useState(false);
//   const [deleteOpen, setDeleteOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [emailOpen, setEmailOpen] = useState(false);
//   const [updatingStatus, setUpdatingStatus] = useState(false);

//   const handleDeleteCustomer = async () => {
//     const { error } = await supabase
//       .from("Customers")
//       .delete()
//       .eq("id", customer.id);
//     if (error) {
//       toast.error("Error deleting customer");
//     } else {
//       toast.success("Customer deleted");
//       setOpen(false);
//       onChange();
//     }
//   };

//   const handleStageClick = async (stage) => {
//     if (stage === customer.status || updatingStatus) return;
//     setUpdatingStatus(true);
//     const { error } = await supabase
//       .from("Customers")
//       .update({ status: stage })
//       .eq("id", customer.id);
//     if (error) {
//       toast.error("Error updating status");
//     } else {
//       toast.success(`Status updated to ${stage}`);
//       onChange();
//     }
//     setUpdatingStatus(false);
//   };

//   const currentIdx = CUSTOMER_STAGES.indexOf(customer.status);

//   const InfoRow = ({ icon: Icon, label, value }) =>
//     value ? (
//       <div className="flex items-start gap-2 text-sm py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
//         <Icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
//         <div className="min-w-0">
//           <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
//           <p className="text-slate-800 dark:text-slate-200 font-medium text-sm break-words">{value}</p>
//         </div>
//       </div>
//     ) : null;

//   return (
//     <>
//       {/* ── Compact Kanban Card ── */}
//       <div
//         onClick={() => setOpen(true)}
//         className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200 group"
//       >
//         <div className="flex items-start justify-between gap-2 mb-2">
//           <div className="flex items-center gap-2 min-w-0">
//             <Avatar className="h-6 w-6 flex-shrink-0">
//               <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[10px]">
//                 {customer?.name
//                   ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
//                   : "?"}
//               </AvatarFallback>
//             </Avatar>
//             <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
//               {customer?.name}
//             </p>
//           </div>
//           <span
//             className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[customer.status] || "bg-slate-400"}`}
//           />
//         </div>

//         {customer?.email && (
//           <p className="text-xs text-slate-400 truncate mb-1">{customer.email}</p>
//         )}
//         {customer?.industry && (
//           <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
//             <Building2 className="w-3 h-3 flex-shrink-0" />
//             <span className="truncate">{customer.industry}</span>
//           </p>
//         )}

//         <div className="flex items-center justify-between mt-1.5 gap-1">
//           {customer?.price ? (
//             <span className="text-xs font-bold text-green-600 dark:text-green-400">
//               ${customer.price}
//             </span>
//           ) : <span />}
//           {customer?.created_at && (
//             <span className="text-[10px] text-slate-400">
//               {customer.created_at.split("T")[0]}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* ── Detail Dialog — same size as LeadCard (80vw × 85vh) ── */}
//       <Dialog open={open} onOpenChange={setOpen}>
//         <DialogContent
//           className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl"
//         >
//           {/* Header */}
//           <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/80 flex-shrink-0 pr-12">
//             <div className="flex items-center gap-3 min-w-0">
//               <Avatar className="h-10 w-10 flex-shrink-0">
//                 <AvatarFallback className="bg-gradient-to-br from-sky-700 to-teal-500 text-white font-bold">
//                   {customer?.name
//                     ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
//                     : "?"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="min-w-0">
//                 <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
//                   {customer?.name}
//                 </h2>
//                 <Badge
//                   className={`mt-0.5 ${STATUS_COLOR[customer.status] || "bg-slate-400"} text-white border-0 text-[10px] h-5`}
//                 >
//                   {customer.status}
//                 </Badge>
//               </div>
//             </div>

//             <div className="flex items-center gap-2 flex-shrink-0">
//               <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => setEmailOpen(true)}>
//                 <Mail className="w-4 h-4 mr-2" /> Email
//               </Button>

//               <Button size="sm" variant="outline" className="h-9 px-3">
//                 <Phone className="w-4 h-4 mr-2" /> Call
//               </Button>

//               <Sheet open={editOpen} onOpenChange={setEditOpen}>
//                 <SheetTrigger asChild>
//                   <Button size="sm" variant="outline" className="h-9 px-3">
//                     <Edit className="w-4 h-4 mr-2" /> Edit
//                   </Button>
//                 </SheetTrigger>
//                 <SheetContent className="overflow-y-auto min-w-[85vw]">
//                   <SheetHeader>
//                     <SheetTitle>Edit Customer</SheetTitle>
//                     <SheetDescription asChild>
//                       <div>
//                         <UpdateCustomer customer_id={customer.id} onChange={onChange} />
//                       </div>
//                     </SheetDescription>
//                   </SheetHeader>
//                 </SheetContent>
//               </Sheet>

//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="h-9 px-3 text-red-500 border-red-200 hover:bg-red-50"
//                 onClick={() => setDeleteOpen(true)}
//               >
//                 <Trash2 className="w-4 h-4" />
//               </Button>
//             </div>
//           </div>

//           {/* Body: two columns */}
//           <div className="flex flex-1 overflow-hidden">
//             {/* Left — General Info */}
//             <div className="w-1/3 border-r overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
//               <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">General Information</h3>
//               <div className="space-y-1">
//                 <InfoRow icon={Mail} label="Email" value={customer.email} />
//                 <InfoRow icon={Phone} label="Phone" value={customer.number || customer.phone} />
//                 <InfoRow icon={Building2} label="Industry" value={customer.industry} />
//                 <InfoRow icon={MapPin} label="Address" value={customer.address} />
//                 <InfoRow icon={Globe} label="Website" value={customer.website} />
//                 <InfoRow icon={Linkedin} label="LinkedIn" value={customer.linkedIn} />
//                 <InfoRow
//                   icon={DollarSign}
//                   label="Total Value"
//                   value={customer.price ? `$${customer.price}` : null}
//                 />
//                 <InfoRow
//                   icon={Calendar}
//                   label="Created"
//                   value={customer.created_at?.split("T")[0]}
//                 />
//               </div>
//               {customer.issues && customer.issues !== "[]" && (
//                 <div className="mt-6">
//                   <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Issues</p>
//                   <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl leading-relaxed">
//                     {typeof customer.issues === "string"
//                       ? customer.issues
//                       : JSON.stringify(customer.issues)}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Right — Purchase History */}
//             <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
//               <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">Purchase History</h3>
//               {(() => {
//                 const history = customer.purchase_history
//                   ? Array.isArray(customer.purchase_history)
//                     ? customer.purchase_history
//                     : [customer.purchase_history]
//                   : [];

//                 return history.length > 0 ? (
//                   <div className="space-y-3">
//                     {history.map((p, i) => (
//                       <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border shadow-sm">
//                         <div className="flex items-center gap-3 mb-2">
//                           <div className="w-2 h-2 rounded-full bg-teal-500" />
//                           <p className="text-sm font-semibold text-slate-800 dark:text-white">
//                             {p.product || "Purchase"}
//                           </p>
//                           {p.price && (
//                             <span className="ml-auto text-xs font-bold text-green-600">
//                               ${p.price}
//                             </span>
//                           )}
//                         </div>
//                         {p.purchase_date && (
//                           <p className="text-[11px] text-slate-400 ml-5">{p.purchase_date}</p>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
//                     <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
//                     <p className="text-sm">No purchase history yet.</p>
//                   </div>
//                 );
//               })()}
//             </div>
//           </div>

//           {/* ── Status Flow Footer ── */}
//           <div className="border-t bg-white dark:bg-slate-900 p-4 flex-shrink-0">
//             <div className="flex items-center gap-4 max-w-full overflow-x-auto no-scrollbar pb-2">
//               <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Flow:</span>
//               {CUSTOMER_STAGES.map((stage, idx) => {
//                 const isCompleted = idx < currentIdx;
//                 const isCurrent = idx === currentIdx;
//                 return (
//                   <div key={stage} className="flex items-center gap-2">
//                     <button
//                       onClick={() => handleStageClick(stage)}
//                       disabled={updatingStatus}
//                       className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
//                         isCurrent
//                           ? "bg-teal-500 border-teal-500 text-white font-bold"
//                           : isCompleted
//                           ? "bg-teal-50 border-teal-200 text-teal-600"
//                           : "bg-white border-slate-200 text-slate-400 hover:border-teal-300"
//                       } ${updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
//                     >
//                       <span className="text-[10px]">{idx + 1}. {stage}</span>
//                     </button>
//                     {idx < CUSTOMER_STAGES.length - 1 && <div className="w-4 h-[1px] bg-slate-200" />}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* ── ALL MODALS ── */}

//       {/* Email Modal */}
//       <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
//         <EmailTemplate
//           type="Customers"
//           id={customer.id}
//           email={customer.email}
//           open={emailOpen}
//           onOpenChange={setEmailOpen}
//         />
//       </Dialog>

//       {/* Delete Confirmation */}
//       <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Delete Customer?</DialogTitle>
//             <DialogDescription>
//               This will permanently remove <strong>{customer.name}</strong> from your CRM. This action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter className="gap-2 sm:gap-0">
//             <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
//             <Button variant="destructive" onClick={handleDeleteCustomer}>Confirm Delete</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }








// old one 
// "use client";

// import { useState } from "react";
// import { Avatar, AvatarFallback } from "../ui/avatar";
// import { Badge } from "../ui/badge";
// import { Button } from "../ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
//   DialogTrigger,
// } from "../ui/dialog";
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "../ui/sheet";
// import {
//   Mail,
//   Phone,
//   Trash2,
//   Edit,
//   Building2,
//   MapPin,
//   Globe,
//   DollarSign,
//   Calendar,
//   ShoppingBag,
//   Linkedin,
// } from "lucide-react";
// import EmailTemplate from "../EmailTemplate";
// import UpdateCustomer from "../UpdateCustomer";
// import { supabase } from "@/utils/supabase/client";
// import { toast } from "react-toastify";

// const CUSTOMER_STAGES = ["Active", "Inactive", "Churned"];

// const STATUS_COLOR = {
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-500",
// };

// const STATUS_DOT = {
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-400",
// };

// export default function CustomerCard({ customer, onChange }) {
//   const [open, setOpen] = useState(false);
//   const [deleteOpen, setDeleteOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [emailOpen, setEmailOpen] = useState(false);
//   const [updatingStatus, setUpdatingStatus] = useState(false);

//   const handleDeleteCustomer = async () => {
//     const { error } = await supabase
//       .from("Customers")
//       .delete()
//       .eq("id", customer.id);
//     if (error) {
//       toast.error("Error deleting customer");
//     } else {
//       toast.success("Customer deleted");
//       setOpen(false);
//       onChange();
//     }
//   };

//   const handleStageClick = async (stage) => {
//     if (stage === customer.status || updatingStatus) return;
//     setUpdatingStatus(true);
//     const { error } = await supabase
//       .from("Customers")
//       .update({ status: stage })
//       .eq("id", customer.id);
//     if (error) {
//       toast.error("Error updating status");
//     } else {
//       toast.success(`Status updated to ${stage}`);
//       onChange();
//     }
//     setUpdatingStatus(false);
//   };

//   const currentIdx = CUSTOMER_STAGES.indexOf(customer.status);

//   const InfoRow = ({ icon: Icon, label, value }) =>
//     value ? (
//       <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
//         <Icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
//         <div className="min-w-0">
//           <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
//           <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">{value}</p>
//         </div>
//       </div>
//     ) : null;

//   return (
//     <>
//       {/* ── Compact Kanban Card ── */}
//       <div
//         onClick={() => setOpen(true)}
//         className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200"
//       >
//         <div className="flex items-start justify-between gap-2 mb-2">
//           <div className="flex items-center gap-2 min-w-0">
//             <Avatar className="h-6 w-6 flex-shrink-0">
//               <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[10px]">
//                 {customer?.name
//                   ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
//                   : "?"}
//               </AvatarFallback>
//             </Avatar>
//             <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
//               {customer?.name}
//             </p>
//           </div>
//           <span
//             className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[customer.status] || "bg-slate-400"}`}
//           />
//         </div>

//         {customer?.email && (
//           <p className="text-xs text-slate-400 truncate mb-1">{customer.email}</p>
//         )}
//         {customer?.industry && (
//           <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
//             <Building2 className="w-3 h-3 flex-shrink-0" />
//             <span className="truncate">{customer.industry}</span>
//           </p>
//         )}

//         <div className="flex items-center justify-between mt-1.5 gap-1">
//           {customer?.price ? (
//             <span className="text-xs font-bold text-green-600 dark:text-green-400">
//               ${customer.price}
//             </span>
//           ) : <span />}
//           {customer?.created_at && (
//             <span className="text-[10px] text-slate-400">
//               {customer.created_at.split("T")[0]}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* ── Detail Dialog — matches screenshot layout ── */}
//       <Dialog open={open} onOpenChange={setOpen}>
//         <DialogContent
//           className="w-[92vw] max-w-[780px] max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl shadow-2xl"
//         >
//           {/* ── Header ── */}
//           <div className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-slate-900 flex-shrink-0">
//             <div className="flex items-center gap-3 min-w-0">
//               <Avatar className="h-11 w-11 flex-shrink-0">
//                 <AvatarFallback className="bg-gradient-to-br from-sky-700 to-teal-500 text-white text-sm font-bold">
//                   {customer?.name
//                     ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
//                     : "?"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="min-w-0">
//                 <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
//                   {customer?.name}
//                 </h2>
//                 <Badge
//                   className={`mt-1 ${STATUS_COLOR[customer.status] || "bg-slate-400"} text-white border-0 text-xs px-2`}
//                 >
//                   {customer.status}
//                 </Badge>
//               </div>
//             </div>

//             <div className="flex items-center gap-2 flex-shrink-0">
//               <Dialog>
//                 <DialogTrigger asChild>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     className="h-9 px-3 text-sm gap-1.5"
//                     onClick={() => setEmailOpen(true)}
//                   >
//                     <Mail className="w-4 h-4" /> Email
//                   </Button>
//                 </DialogTrigger>
//                 <EmailTemplate
//                   type="Customers"
//                   id={customer.id}
//                   email={customer.email}
//                   open={emailOpen}
//                   onOpenChange={setEmailOpen}
//                 />
//               </Dialog>

//               <Button size="sm" variant="outline" className="h-9 px-3 text-sm gap-1.5">
//                 <Phone className="w-4 h-4" /> Call
//               </Button>

//               <Sheet open={editOpen} onOpenChange={setEditOpen}>
//                 <SheetTrigger asChild>
//                   <Button size="sm" variant="outline" className="h-9 px-3 text-sm gap-1.5">
//                     <Edit className="w-4 h-4" /> Edit
//                   </Button>
//                 </SheetTrigger>
//                 <SheetContent className="overflow-y-auto min-w-[85vw]">
//                   <SheetHeader>
//                     <SheetTitle>Edit Customer</SheetTitle>
//                     <SheetDescription asChild>
//                       <div>
//                         <UpdateCustomer customer_id={customer.id} onChange={onChange} />
//                       </div>
//                     </SheetDescription>
//                   </SheetHeader>
//                 </SheetContent>
//               </Sheet>

//               <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
//                 <DialogTrigger asChild>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     className="h-9 w-9 p-0 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
//                   >
//                     <Trash2 className="w-4 h-4" />
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Delete Customer</DialogTitle>
//                     <DialogDescription>
//                       Are you sure you want to delete <strong>{customer.name}</strong>?
//                     </DialogDescription>
//                   </DialogHeader>
//                   <DialogFooter>
//                     <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
//                     <Button variant="destructive" onClick={handleDeleteCustomer}>Delete</Button>
//                   </DialogFooter>
//                 </DialogContent>
//               </Dialog>
//             </div>
//           </div>

//           {/* ── Body: two columns ── */}
//           <div className="flex flex-1 min-h-0 overflow-hidden">

//             {/* Left — General Info with visible scrollbar like screenshot 2 */}
//             <div
//               className="w-[300px] min-w-[300px] flex-shrink-0 border-r overflow-y-scroll bg-white dark:bg-slate-900 px-5 py-4"
//             >
//               <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">
//                 General Information
//               </p>
//               <InfoRow icon={Mail} label="Email" value={customer.email} />
//               <InfoRow icon={Phone} label="Phone" value={customer.number || customer.phone} />
//               <InfoRow icon={Building2} label="Industry" value={customer.industry} />
//               <InfoRow icon={MapPin} label="Address" value={customer.address} />
//               <InfoRow icon={Globe} label="Website" value={customer.website} />
//               <InfoRow icon={Linkedin} label="LinkedIn" value={customer.linkedIn} />
//               <InfoRow
//                 icon={DollarSign}
//                 label="Total Value"
//                 value={customer.price ? `$${customer.price}` : null}
//               />
//               <InfoRow
//                 icon={Calendar}
//                 label="Created"
//                 value={customer.created_at?.split("T")[0]}
//               />
//               {customer.issues && customer.issues !== "[]" && (
//                 <div className="pt-2">
//                   <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Issues</p>
//                   <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
//                     {typeof customer.issues === "string"
//                       ? customer.issues
//                       : JSON.stringify(customer.issues)}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Right — Purchase History */}
//             <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/40 px-5 py-4 min-w-0">
//               <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">
//                 Purchase History
//               </p>
//               {(() => {
//                 const history = customer.purchase_history
//                   ? Array.isArray(customer.purchase_history)
//                     ? customer.purchase_history
//                     : [customer.purchase_history]
//                   : [];

//                 return history.length > 0 ? (
//                   <div className="space-y-2">
//                     {history.map((p, i) => (
//                       <div
//                         key={i}
//                         className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
//                       >
//                         <div className="flex items-center gap-2 mb-1">
//                           <ShoppingBag className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
//                           <p className="text-sm font-semibold text-slate-800 dark:text-white">
//                             {p.product || "Purchase"}
//                           </p>
//                           {p.price && (
//                             <span className="ml-auto text-xs font-bold text-green-600">
//                               ${p.price}
//                             </span>
//                           )}
//                         </div>
//                         {p.purchase_date && (
//                           <p className="text-xs text-slate-400 ml-5">{p.purchase_date}</p>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="flex flex-col items-center justify-center h-48 gap-3">
//                     <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
//                       <ShoppingBag className="w-5 h-5 text-slate-400" />
//                     </div>
//                     <p className="text-sm text-slate-400">No purchase history yet.</p>
//                   </div>
//                 );
//               })()}
//             </div>
//           </div>

//           {/* ── Status Flow Footer — pill buttons exactly like screenshot 2 ── */}
//           <div className="border-t bg-white dark:bg-slate-900 px-5 py-3 flex-shrink-0">
//             <div className="flex items-center gap-3 overflow-x-auto">
//               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap flex-shrink-0">
//                 FLOW:
//               </span>

//               <div className="flex items-center">
//                 {CUSTOMER_STAGES.map((stage, idx) => {
//                   const isCompleted = idx < currentIdx;
//                   const isCurrent = idx === currentIdx;
//                   const isLast = idx === CUSTOMER_STAGES.length - 1;

//                   return (
//                     <div key={stage} className="flex items-center">
//                       {/* Pill button — same shape as screenshot 2 */}
//                       <button
//                         onClick={() => handleStageClick(stage)}
//                         disabled={updatingStatus}
//                         title={`Set status to ${stage}`}
//                         className={[
//                           "flex flex-col items-center justify-center px-4 py-2 rounded-full border-2 transition-all duration-200 whitespace-nowrap leading-none",
//                           isCurrent
//                             ? "bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-100"
//                             : isCompleted
//                               ? "bg-white dark:bg-slate-800 border-teal-400 text-teal-600 dark:text-teal-400"
//                               : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 hover:border-teal-300 hover:text-teal-400",
//                           updatingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
//                         ].join(" ")}
//                       >
//                         <span className="text-[9px] font-medium mb-0.5 opacity-80">{idx + 1}.</span>
//                         <span className="text-xs font-semibold">{stage}</span>
//                       </button>

//                       {/* Connector line */}
//                       {!isLast && (
//                         <div
//                           className={`w-5 h-0.5 flex-shrink-0 mx-0.5 ${
//                             isCompleted ? "bg-teal-400" : "bg-slate-200 dark:bg-slate-700"
//                           }`}
//                         />
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }





















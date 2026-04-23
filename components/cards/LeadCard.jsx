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
// Removed Sheet since we want everything in the middle now
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
  Tag,
  User,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import Updateleads from "../Updateleads";
import EmailTemplate from "../EmailTemplate";

const LEAD_STAGES = [
  "New",
  "In progress",
  "Contact Attempted",
  "Contacted",
  "Meeting Booked",
  "Qualified",
  "Unqualified",
];

const STATUS_COLOR = {
  New: "bg-blue-500",
  "In progress": "bg-yellow-500",
  "Contact Attempted": "bg-orange-400",
  Contacted: "bg-purple-500",
  "Meeting Booked": "bg-indigo-500",
  Qualified: "bg-green-500",
  Unqualified: "bg-red-500",
};

const STATUS_DOT = {
  New: "bg-blue-400",
  "In progress": "bg-yellow-400",
  "Contact Attempted": "bg-orange-400",
  Contacted: "bg-purple-400",
  "Meeting Booked": "bg-indigo-400",
  Qualified: "bg-green-500",
  Unqualified: "bg-red-400",
};

export default function LeadCard({ lead, onChange, fetchLeads, fetchDeals }) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState(null);
  const [description, setDescription] = useState("");

  const handleStageClick = (stage) => {
    if (stage === lead.status) return;
    setConfirmStage(stage);
  };

  const handleStatusUpdate = async () => {
    const stage_history = lead.stage_history || [];
    const length = stage_history.length;
    const start_date_raw =
      stage_history[length - 1]?.end_date ||
      lead?.created_at ||
      new Date().toISOString();
    const start_date = new Date(start_date_raw).toISOString().split("T")[0];

    const current_history = {
      old_status: lead.status,
      new_status: confirmStage,
      start_date,
      end_date: new Date().toISOString().split("T")[0],
      state_description: description,
    };
    stage_history.push(current_history);

    const { data: LeadsData, error } = await supabase
      .from("Leads")
      .update({ stage_history, status: confirmStage })
      .select("*")
      .eq("id", lead.id)
      .single();

    if (error) {
      toast.error("Error updating lead");
    } else {
      toast.success("Lead updated");
      if (confirmStage === "Qualified") {
        await supabase.from("Deals").insert({
          name: LeadsData.name,
          number: LeadsData.number,
          email: LeadsData.email,
          status: "New",
          created_at: new Date().toISOString().split("T")[0],
          closeDate: new Date().toISOString().split("T")[0],
          user_email: LeadsData.user_email,
        });
        await fetchDeals();
      }
      await fetchLeads();
      setConfirmStage(null);
      setDescription("");
    }
  };

  const handleDeleteLead = async () => {
    const { error } = await supabase.from("Leads").delete().eq("id", lead.id);
    if (error) {
      toast.error("Error deleting lead");
    } else {
      toast.success("Deleted");
      setOpen(false);
      onChange();
    }
  };

  const currentIdx = LEAD_STAGES.indexOf(lead.status);

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

  return (
    <>
      {/* ── Kanban Card ── */}
      <div
        onClick={() => setOpen(true)}
        className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200 group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[10px]">
                {lead?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
              {lead?.name}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[lead.status] || "bg-slate-400"}`} />
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
          <Building2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lead.company || "No Company"}</span>
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">{lead.number}</span>
        </div>
      </div>

      {/* ── Main Detail Dialog (80% Size) ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl"
        >
          {/* Header Section - pr-12 fixes the overlap with the X button */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/80 flex-shrink-0 pr-12">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white">
                  {lead?.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{lead?.name}</h2>
                <Badge className={`${STATUS_COLOR[lead.status]} text-white border-0 text-[10px] h-5`}>
                  {lead.status}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => setEmailOpen(true)}>
                <Mail className="w-4 h-4 mr-2" /> Email
              </Button>
              <Button size="sm" variant="outline" className="h-9 px-3">
                <Phone className="w-4 h-4 mr-2" /> Call
              </Button>

              {/* EDIT BUTTON - NOW OPENS IN CENTER DIALOG */}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 px-3">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0">
                  <DialogHeader className="p-6 border-b">
                    <DialogTitle className="text-xl font-bold">Edit Lead Information</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto p-6">
                    <Updateleads
                      lead_id={lead.id}
                      onChange={onChange}
                      fetchLeads={fetchLeads}
                      fetchDeals={fetchDeals}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* DELETE BUTTON */}
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

          {/* Body Section */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Info - Added scroll just in case info is long */}
            <div className="w-1/3 border-r overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
              <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">General Information</h3>
              <div className="space-y-1">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Phone" value={lead.number} />
                <InfoRow icon={Building2} label="Company" value={lead.company} />
                <InfoRow icon={Tag} label="Industry" value={lead.industry} />
                <InfoRow icon={Tag} label="Source" value={lead.source} />
                <InfoRow icon={DollarSign} label="Income" value={lead.income} />
                <InfoRow icon={MapPin} label="Address" value={lead.address} />
                <InfoRow icon={Globe} label="Website" value={lead.website} />
                <InfoRow icon={User} label="Age" value={lead.age} />
              </div>
              {lead.description && (
                <div className="mt-6">
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl leading-relaxed">
                    {lead.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Stage History - Fixed Scroll Here */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
              <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-4">Stage History</h3>
              {lead.stage_history && lead.stage_history.length > 0 ? (
                <div className="space-y-3">
                  {[...lead.stage_history].reverse().map((h, i) => (
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

          {/* Bottom Bar: Lead Flow */}
          <div className="border-t bg-white dark:bg-slate-900 p-4 flex-shrink-0">
            <div className="flex items-center gap-4 max-w-full overflow-x-auto no-scrollbar pb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Flow:</span>
              {LEAD_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <button
                      onClick={() => handleStageClick(stage)}
                      disabled={isCurrent}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isCurrent
                        ? "bg-teal-500 border-teal-500 text-white font-bold"
                        : isCompleted
                          ? "bg-teal-50 border-teal-200 text-teal-600"
                          : "bg-white border-slate-200 text-slate-400 hover:border-teal-300"
                        }`}
                    >
                      <span className="text-[10px]">{idx + 1}. {stage}</span>
                    </button>
                    {idx < LEAD_STAGES.length - 1 && <div className="w-4 h-[1px] bg-slate-200" />}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ALL MODALS AT THE BOTTOM ── */}

      {/* 1. Edit Lead Modal (80% Width) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-slate-50 dark:bg-slate-900">
            <DialogTitle className="text-xl font-bold">Edit Lead Information</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950">
            <Updateleads
              lead_id={lead.id}
              onChange={onChange}
              fetchLeads={fetchLeads}
              fetchDeals={fetchDeals}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Email Template Modal (Fixed the Portal Error) */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <EmailTemplate
          type="Leads"
          id={lead.id}
          email={lead.email}
        // The EmailTemplate component likely renders DialogContent inside, 
        // so it MUST be wrapped in this Dialog tag.
        />
      </Dialog>

      {/* 3. Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Lead?</DialogTitle>
            <DialogDescription>
              This will permanently remove <b>{lead.name}</b> from your CRM. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLead}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Stage Update Note Modal */}
      <Dialog open={!!confirmStage} onOpenChange={() => setConfirmStage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Stage: {confirmStage}</DialogTitle>
            <DialogDescription>Add a note regarding this status change for the history logs.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What happened in this stage? (e.g., 'Had a great call, they are interested in the Pro plan')"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] bg-slate-50 dark:bg-slate-900"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStage(null)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
              onClick={handleStatusUpdate}
            >
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



//previous version the box is small  

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
//   Tag,
//   User,
//   X,
// } from "lucide-react";
// import { supabase } from "@/utils/supabase/client";
// import { toast } from "react-toastify";
// import Updateleads from "../Updateleads";
// import EmailTemplate from "../EmailTemplate";

// const LEAD_STAGES = [
//   "New",
//   "In progress",
//   "Contact Attempted",
//   "Contacted",
//   "Meeting Booked",
//   "Qualified",
//   "Unqualified",
// ];

// const STATUS_COLOR = {
//   New: "bg-blue-500",
//   "In progress": "bg-yellow-500",
//   "Contact Attempted": "bg-orange-400",
//   Contacted: "bg-purple-500",
//   "Meeting Booked": "bg-indigo-500",
//   Qualified: "bg-green-500",
//   Unqualified: "bg-red-500",
// };

// const STATUS_DOT = {
//   New: "bg-blue-400",
//   "In progress": "bg-yellow-400",
//   "Contact Attempted": "bg-orange-400",
//   Contacted: "bg-purple-400",
//   "Meeting Booked": "bg-indigo-400",
//   Qualified: "bg-green-500",
//   Unqualified: "bg-red-400",
// };

// export default function LeadCard({ lead, onChange, fetchLeads, fetchDeals }) {
//   const [open, setOpen] = useState(false);
//   const [deleteOpen, setDeleteOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [emailOpen, setEmailOpen] = useState(false);
//   const [confirmStage, setConfirmStage] = useState(null);
//   const [description, setDescription] = useState("");

//   const handleStageClick = (stage) => {
//     if (stage === lead.status) return;
//     setConfirmStage(stage);
//   };

//   const handleStatusUpdate = async () => {
//     const stage_history = lead.stage_history || [];
//     const length = stage_history.length;
//     const start_date_raw =
//       stage_history[length - 1]?.end_date ||
//       lead?.created_at ||
//       new Date().toISOString();
//     const start_date = new Date(start_date_raw).toISOString().split("T")[0];

//     const current_history = {
//       old_status: lead.status,
//       new_status: confirmStage,
//       start_date,
//       end_date: new Date().toISOString().split("T")[0],
//       state_description: description,
//     };
//     stage_history.push(current_history);

//     const { data: LeadsData, error } = await supabase
//       .from("Leads")
//       .update({ stage_history, status: confirmStage })
//       .select("*")
//       .eq("id", lead.id)
//       .single();

//     if (error) {
//       toast.error("Error updating lead");
//     } else {
//       toast.success("Lead updated");
//       if (confirmStage === "Qualified") {
//         await supabase.from("Deals").insert({
//           name: LeadsData.name,
//           number: LeadsData.number,
//           email: LeadsData.email,
//           status: "New",
//           created_at: new Date().toISOString().split("T")[0],
//           closeDate: new Date().toISOString().split("T")[0],
//           user_email: LeadsData.user_email,
//         });
//         await fetchDeals();
//       }
//       await fetchLeads();
//       setConfirmStage(null);
//       setDescription("");
//     }
//   };

//   const handleDeleteLead = async () => {
//     const { error } = await supabase.from("Leads").delete().eq("id", lead.id);
//     if (error) {
//       toast.error("Error deleting lead");
//     } else {
//       toast.success("Deleted");
//       setOpen(false);
//       onChange();
//     }
//   };

//   const currentIdx = LEAD_STAGES.indexOf(lead.status);

//   const InfoRow = ({ icon: Icon, label, value }) =>
//     value ? (
//       <div className="flex items-start gap-2 text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
//         <Icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
//         <div className="min-w-0">
//           <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
//           <p className="text-slate-800 dark:text-slate-200 font-medium text-sm truncate">{value}</p>
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
//                 {lead?.name?.[0]?.toUpperCase() || "?"}
//               </AvatarFallback>
//             </Avatar>
//             <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
//               {lead?.name}
//             </p>
//           </div>
//           <span
//             className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[lead.status] || "bg-slate-400"}`}
//           />
//         </div>

//         {lead?.company && (
//           <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
//             <Building2 className="w-3 h-3 flex-shrink-0" />
//             <span className="truncate">{lead.company}</span>
//           </p>
//         )}
//         {!lead?.company && lead?.email && (
//           <p className="text-xs text-slate-400 truncate mb-1">{lead.email}</p>
//         )}

//         <div className="flex items-center justify-between mt-1.5 gap-1">
//           {lead?.source ? (
//             <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full truncate max-w-[60%]">
//               {lead.source}
//             </span>
//           ) : <span />}
//           {lead?.number && (
//             <span className="text-[10px] text-slate-400 truncate">{lead.number}</span>
//           )}
//         </div>
//       </div>

//       {/* ── Centered Detail Dialog (80% screen) ── */}
//       <Dialog open={open} onOpenChange={setOpen}>
//         <DialogContent
//           className="max-w-[80vw] w-[80vw] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0"
//           style={{ borderRadius: "12px" }}
//         >
//           {/* Header */}
//           <div className="flex items-center justify-between px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-900/80 flex-shrink-0">
//             <div className="flex items-center gap-3 min-w-0">
//               <Avatar className="h-9 w-9 flex-shrink-0">
//                 <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm">
//                   {lead?.name?.[0]?.toUpperCase() || "?"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="min-w-0">
//                 <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
//                   {lead?.name}
//                 </h2>
//                 <p className="text-xs text-slate-500 truncate">
//                   {lead?.company || lead?.email}
//                 </p>
//               </div>
//               <Badge
//                 className={`ml-1 flex-shrink-0 ${STATUS_COLOR[lead.status] || "bg-slate-400"} text-white border-0 text-xs`}
//               >
//                 {lead.status}
//               </Badge>
//             </div>

//             <div className="flex items-center gap-1.5 flex-shrink-0">
//               {/* Email */}
//               <Dialog>
//                 <DialogTrigger asChild>
//                   <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => setEmailOpen(true)}>
//                     <Mail className="w-3.5 h-3.5 mr-1" /> Email
//                   </Button>
//                 </DialogTrigger>
//                 <EmailTemplate
//                   type="Leads"
//                   id={lead.id}
//                   email={lead.email}
//                   open={emailOpen}
//                   onOpenChange={setEmailOpen}
//                 />
//               </Dialog>

//               <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
//                 <Phone className="w-3.5 h-3.5 mr-1" /> Call
//               </Button>

//               {/* Edit */}
//               <Sheet open={editOpen} onOpenChange={setEditOpen}>
//                 <SheetTrigger asChild>
//                   <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
//                     <Edit className="w-3.5 h-3.5 mr-1" /> Edit
//                   </Button>
//                 </SheetTrigger>
//                 <SheetContent>
//                   <SheetHeader>
//                     <SheetTitle>Edit Lead</SheetTitle>
//                     <SheetDescription asChild>
//                       <div>
//                         <Updateleads
//                           lead_id={lead.id}
//                           onChange={onChange}
//                           fetchLeads={fetchLeads}
//                           fetchDeals={fetchDeals}
//                         />
//                       </div>
//                     </SheetDescription>
//                   </SheetHeader>
//                 </SheetContent>
//               </Sheet>

//               {/* Delete */}
//               <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
//                 <DialogTrigger asChild>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     className="h-8 px-2 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
//                   >
//                     <Trash2 className="w-3.5 h-3.5" />
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Delete Lead</DialogTitle>
//                     <DialogDescription>
//                       Are you sure you want to delete <strong>{lead.name}</strong>? This cannot be undone.
//                     </DialogDescription>
//                   </DialogHeader>
//                   <DialogFooter>
//                     <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
//                     <Button variant="destructive" onClick={handleDeleteLead}>Delete</Button>
//                   </DialogFooter>
//                 </DialogContent>
//               </Dialog>
//             </div>
//           </div>

//           {/* Body: Left info + Right stage history */}
//           <div className="flex flex-1 overflow-hidden">
//             {/* Left: Lead info */}
//             <div className="w-[300px] min-w-[300px] border-r overflow-y-auto p-4 bg-white dark:bg-slate-900 space-y-0.5">
//               <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-3">
//                 General Information
//               </p>
//               <InfoRow icon={Mail} label="Email" value={lead.email} />
//               <InfoRow icon={Phone} label="Phone" value={lead.number} />
//               <InfoRow icon={Building2} label="Company" value={lead.company} />
//               <InfoRow icon={Tag} label="Industry" value={lead.industry} />
//               <InfoRow icon={Tag} label="Source" value={lead.source} />
//               <InfoRow icon={DollarSign} label="Income" value={lead.income} />
//               <InfoRow icon={MapPin} label="Address" value={lead.address} />
//               <InfoRow icon={Globe} label="Website" value={lead.website} />
//               <InfoRow icon={User} label="Age" value={lead.age} />
//               {lead.description && (
//                 <div className="pt-2">
//                   <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Description</p>
//                   <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 leading-relaxed">
//                     {lead.description}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Right: Stage history */}
//             <div className="flex-1 overflow-y-auto p-4 bg-slate-50/60 dark:bg-slate-900/40">
//               <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-3">
//                 Stage History
//               </p>
//               {lead.stage_history && lead.stage_history.length > 0 ? (
//                 <div className="space-y-2">
//                   {[...lead.stage_history].reverse().map((h, i) => (
//                     <div
//                       key={i}
//                       className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
//                     >
//                       <div className="flex items-center gap-2 mb-1">
//                         <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
//                         <p className="text-sm font-medium">
//                           <span className="text-slate-500">{h.old_status}</span>
//                           <span className="mx-2 text-slate-300">→</span>
//                           <span className="text-teal-600 dark:text-teal-400">{h.new_status}</span>
//                         </p>
//                       </div>
//                       <p className="text-xs text-slate-400 ml-4">
//                         {h.start_date} → {h.end_date}
//                       </p>
//                       {h.state_description && (
//                         <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 ml-4 bg-slate-50 dark:bg-slate-900/60 rounded p-2 border border-slate-100 dark:border-slate-700">
//                           {h.state_description}
//                         </p>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-12">
//                   <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
//                     <Tag className="w-5 h-5 text-slate-400" />
//                   </div>
//                   <p className="text-sm text-slate-400">No stage history yet.</p>
//                   <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
//                     Click a stage below to move this lead.
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── Status Pipeline (Magudam-style bottom bar) ── */}
//           <div className="border-t bg-white dark:bg-slate-900 px-5 py-3 flex-shrink-0">
//             <div className="flex items-center gap-2">
//               <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap mr-1">
//                 Lead Flow
//               </span>
//               <div className="flex items-center flex-1 overflow-x-auto gap-0 pb-1">
//                 {LEAD_STAGES.map((stage, idx) => {
//                   const isCompleted = idx < currentIdx;
//                   const isCurrent = idx === currentIdx;
//                   const isLast = idx === LEAD_STAGES.length - 1;
//                   return (
//                     <div key={stage} className="flex items-center flex-shrink-0">
//                       <button
//                         onClick={() => handleStageClick(stage)}
//                         disabled={isCurrent}
//                         className="flex flex-col items-center gap-1 px-1.5 group disabled:cursor-default cursor-pointer"
//                       >
//                         <div
//                           className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200
//                             ${isCurrent
//                               ? "bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900"
//                               : isCompleted
//                                 ? "bg-teal-50 dark:bg-teal-900/30 border-teal-400 text-teal-600"
//                                 : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-teal-400 group-hover:text-teal-500"
//                             }`}
//                         >
//                           {idx + 1}
//                         </div>
//                         <span
//                           className={`text-[9px] whitespace-nowrap font-medium
//                             ${isCurrent ? "text-teal-600 dark:text-teal-400" : isCompleted ? "text-teal-500" : "text-slate-400"}`}
//                         >
//                           {stage}
//                         </span>
//                       </button>
//                       {!isLast && (
//                         <div
//                           className={`w-5 h-0.5 flex-shrink-0 ${isCompleted ? "bg-teal-400" : "bg-slate-200 dark:bg-slate-700"}`}
//                         />
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//               <Badge className="ml-2 flex-shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0 text-[11px]">
//                 {lead.status}
//               </Badge>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Stage confirmation dialog */}
//       <Dialog open={!!confirmStage} onOpenChange={() => setConfirmStage(null)}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Update Stage</DialogTitle>
//             <DialogDescription>
//               Moving{" "}
//               <strong className="text-slate-800 dark:text-white">{lead.name}</strong>{" "}
//               from{" "}
//               <span className="font-semibold text-slate-600">{lead.status}</span>{" "}
//               →{" "}
//               <span className="font-semibold text-teal-600">{confirmStage}</span>
//             </DialogDescription>
//           </DialogHeader>
//           <Textarea
//             placeholder="Describe what happened in this stage (actions taken, outcome, notes)..."
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             className="min-h-[80px]"
//           />
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setConfirmStage(null)}>
//               Cancel
//             </Button>
//             <Button
//               className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
//               onClick={handleStatusUpdate}
//             >
//               Confirm Update
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }




// "use client";

// import { Card, CardContent } from "../ui/card";
// import { Avatar, AvatarFallback } from "../ui/avatar";
// import {
//   Sheet,
//   SheetTrigger,
//   SheetDescription,
//   SheetTitle,
//   SheetHeader,
//   SheetContent,
// } from "../ui/sheet";
// import { Mail, Phone, Trash2, Edit } from "lucide-react";
// import { Badge } from "../ui/badge";
// import { Button } from "../ui/button";
// import Updateleads from "../Updateleads";
// import { supabase } from "@/utils/supabase/client";
// import { useState } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTrigger,
// } from "../ui/dialog";
// import { Textarea } from "../ui/textarea";
// import EmailTemplate from "../EmailTemplate";

// export default function LeadCard({
//   lead,
//   setId,
//   onChange,
//   fetchLeads,
//   fetchDeals,
// }) {
//   const leadStatus = [
//     "New",
//     "In progress",
//     "Contact Attempted",
//     "Contacted",
//     "Meeting Booked",
//     "Qualified",
//     "Unqualified",
//   ];

//   const [newState, setNewState] = useState("");
//   const [email, setEmail] = useState(false);
//   const [description, setDescription] = useState("");
//   const [showUpdate, setShowUpdate] = useState(false);
//   const today = new Date();

//   const handleStatusUpdate = async () => {
//     const stage_history = lead.stage_history || [];
//     const length = stage_history.length;

//     const start_date_raw =
//       stage_history[length - 1]?.end_date ||
//       lead?.created_at ||
//       new Date().toISOString();

//     const start_date = new Date(start_date_raw).toISOString().split("T")[0];

//     const current_history = {
//       old_status: lead.status,
//       new_status: newState,
//       start_date: start_date,
//       end_date: new Date().toISOString().split("T")[0],
//       state_description: description,
//     };

//     stage_history.push(current_history);

//     const { data: LeadsData, error } = await supabase
//       .from("Leads")
//       .update({
//         stage_history: stage_history,
//         status: newState,
//       })
//       .select("*")
//       .eq("id", lead.id)
//       .single();

//     if (error) {
//       toast.error("Error updating lead");
//     } else {
//       toast.success("Lead updated");

//       if (newState === "Qualified") {
//         await supabase.from("Deals").insert({
//           name: LeadsData.name,
//           number: LeadsData.number,
//           email: LeadsData.email,
//           status: "New",
//           created_at: today.toISOString().split("T")[0],
//           closeDate: today.toISOString().split("T")[0],
//           user_email: LeadsData.user_email,
//         });

//         await fetchDeals();
//       }

//       await fetchLeads();
//     }
//   };

//   const handleDeleteLead = async (leadId) => {
//     const { error } = await supabase.from("Leads").delete().eq("id", leadId);

//     if (error) {
//       toast.error("Error deleting lead");
//     } else {
//       toast.success("Deleted");
//       onChange();
//     }
//   };

//   return (
//     <Card className="bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl">
//       <CardContent>
//         {/* TOP */}
//         <div className="flex justify-between gap-4">
//           <div className="flex gap-3">
//             <Avatar>
//               <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white">
//                 {lead?.name?.[0] || "?"}
//               </AvatarFallback>
//             </Avatar>

//             <div>
//               <Sheet>
//                 <SheetTrigger asChild>
//                   <h3 className="font-semibold cursor-pointer hover:text-blue-500 flex items-center gap-2">
//                     {lead?.name}
//                     <Edit className="w-4 h-4" />
//                   </h3>
//                 </SheetTrigger>

//                 <SheetContent>
//                   <SheetHeader>
//                     <SheetTitle>Lead Data</SheetTitle>
//                     <SheetDescription>
//                       <Updateleads
//                         lead_id={lead.id}
//                         onChange={onChange}
//                         fetchLeads={fetchLeads}
//                         fetchDeals={fetchDeals}
//                       />
//                     </SheetDescription>
//                   </SheetHeader>
//                 </SheetContent>
//               </Sheet>

//               <p className="text-sm text-gray-500">{lead?.contact}</p>
//             </div>
//           </div>

//           <Badge>{lead.status}</Badge>
//         </div>

//         {/* ACTION BUTTONS */}
//         <div className="flex justify-between mt-4">
//           <div className="flex gap-3">
//             <Dialog>
//               <DialogTrigger asChild>
//                 <Button size="sm" variant="outline">
//                   <Mail className="w-4 h-4 mr-1" /> Email
//                 </Button>
//               </DialogTrigger>

//               <EmailTemplate
//                 type="Leads"
//                 id={lead.id}
//                 email={lead.email}
//                 open={email}
//                 onOpenChange={setEmail}
//               />
//             </Dialog>

//             <Button size="sm" variant="outline">
//               <Phone className="w-4 h-4 mr-1" /> Call
//             </Button>

//             <Dialog>
//               <DialogTrigger asChild>
//                 <Button size="sm" variant="outline">
//                   <Trash2 className="w-4 h-4" />
//                 </Button>
//               </DialogTrigger>

//               <DialogContent>
//                 <DialogHeader>
//                   <DialogTitle>Delete Lead</DialogTitle>
//                   <DialogDescription>Are you sure?</DialogDescription>
//                 </DialogHeader>

//                 <DialogFooter>
//                   <Button onClick={() => handleDeleteLead(lead.id)}>
//                     Delete
//                   </Button>
//                 </DialogFooter>
//               </DialogContent>
//             </Dialog>
//           </div>

//           {/* UPDATE BUTTON */}
//           <Button
//             size="sm"
//             className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
//             onClick={() => setShowUpdate(!showUpdate)}
//           >
//             Update Status
//           </Button>
//         </div>

//         {/* 🔥 EXPAND SECTION */}
//         {showUpdate && (
//           <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-800 rounded-xl">
//             <div className="flex flex-wrap gap-2 mb-3">
//               {leadStatus.map((status) => (
//                 <Button
//                   key={status}
//                   size="sm"
//                   onClick={() => setNewState(status)}
//                   className={`transition-all duration-200 rounded-full px-4
//       ${
//         newState === status
//           ? "bg-gradient-to-r from-sky-700 to-teal-500 text-white shadow-md"
//           : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-200"
//       }
//     `}
//                 >
//                   {status}
//                 </Button>
//               ))}
//             </div>

//             <Textarea
//               placeholder="Explain status..."
//               onChange={(e) => setDescription(e.target.value)}
//             />

//             <Button
//               className="mt-3 bg-gradient-to-r from-sky-700 to-teal-500 text-white"
//               onClick={() => {
//                 handleStatusUpdate();
//                 setShowUpdate(false);
//               }}
//             >
//               Confirm Update
//             </Button>
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

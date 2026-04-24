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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
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

export default function DealCard({
  deal,
  onChange,
  fetchDeals,
  fetchCustomers,
  session,
}) {
  const [open, setOpen] = useState(false);
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
    const start_date =
      stage_history[length - 1]?.end_date || deal.created_at || today;
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
          purchase_history: {
            product: deal.product,
            price: deal.value,
            purchase_date: today,
          },
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
              purchase_history: [
                ...existing.purchase_history,
                { product: deal.product, price: deal.value },
              ],
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
      <div className="flex items-start gap-2 text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <Icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-slate-800 dark:text-slate-200 font-medium text-sm truncate">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* ── Compact Kanban Card ── */}
      <div
        onClick={() => setOpen(true)}
        className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-[10px]">
                {deal?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
              {deal?.name}
            </p>
          </div>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[deal.status] || "bg-slate-400"}`}
          />
        </div>

        {deal?.title && (
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate mb-1 font-medium">
            {deal.title}
          </p>
        )}
        {deal?.company && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{deal.company}</span>
          </p>
        )}

        <div className="flex items-center justify-between mt-1.5 gap-1">
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            {deal.value ? `$${deal.value}` : ""}
          </span>
          {deal?.closeDate && (
            <span className="text-[10px] text-slate-400">
              {deal.closeDate?.split("T")[0]}
            </span>
          )}
        </div>
      </div>

      {/* ── Centered Detail Dialog (80% screen) ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[80vw] w-[80vw] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0"
          style={{ borderRadius: "12px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-900/80 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm">
                  {deal?.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {deal?.name}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {deal?.title || deal?.company}
                </p>
              </div>
              <Badge
                className={`ml-1 flex-shrink-0 ${STATUS_COLOR[deal.status] || "bg-slate-400"} text-white border-0 text-xs`}
              >
                {deal.status}
              </Badge>
              {deal.value && (
                <span className="text-base font-bold text-green-600 dark:text-green-400 flex-shrink-0 ml-1">
                  — ${deal.value}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => setEmailOpen(true)}>
                    <Mail className="w-3.5 h-3.5 mr-1" /> Email
                  </Button>
                </DialogTrigger>
                <EmailTemplate
                  type="Deals"
                  id={deal.id}
                  email={deal.email}
                  open={emailOpen}
                  onOpenChange={setEmailOpen}
                />
              </Dialog>

              <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                <Phone className="w-3.5 h-3.5 mr-1" /> Call
              </Button>

              <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto min-w-[85vw]">
                  <SheetHeader>
                    <SheetTitle>Edit Deal</SheetTitle>
                    <SheetDescription asChild>
                      <div>
                        <UpdateDeals
                          deal_id={deal.id}
                          onChange={onChange}
                          fetchCustomers={fetchCustomers}
                          fetchDeals={fetchDeals}
                        />
                      </div>
                    </SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Deal</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>{deal.name}</strong>? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteDeal}>Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left info */}
            <div className="w-[300px] min-w-[300px] border-r overflow-y-auto p-4 bg-white dark:bg-slate-900 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-3">
                General Information
              </p>
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

            {/* Right stage history */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/60 dark:bg-slate-900/40">
              <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-3">
                Stage History
              </p>
              {deal.stage_history && deal.stage_history.length > 0 ? (
                <div className="space-y-2">
                  {[...deal.stage_history].reverse().map((h, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                        <p className="text-sm font-medium">
                          <span className="text-slate-500">{h.old_status}</span>
                          <span className="mx-2 text-slate-300">→</span>
                          <span className="text-teal-600 dark:text-teal-400">{h.new_status}</span>
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 ml-4">
                        {h.start_date} → {h.end_date}
                      </p>
                      {h.state_description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 ml-4 bg-slate-50 dark:bg-slate-900/60 rounded p-2 border border-slate-100 dark:border-slate-700">
                          {h.state_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">No stage history yet.</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                    Click a stage below to move this deal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Deal Pipeline (Magudam-style) ── */}
          <div className="border-t bg-white dark:bg-slate-900 px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap mr-1">
                Deal Flow
              </span>
              <div className="flex items-center flex-1 overflow-x-auto gap-0 pb-1">
                {DEAL_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isLast = idx === DEAL_STAGES.length - 1;
                  return (
                    <div key={stage} className="flex items-center flex-shrink-0">
                      <button
                        onClick={() => handleStageClick(stage)}
                        disabled={isCurrent}
                        className="flex flex-col items-center gap-1 px-1.5 group disabled:cursor-default cursor-pointer"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200
                            ${isCurrent
                              ? "bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900"
                              : isCompleted
                                ? "bg-teal-50 dark:bg-teal-900/30 border-teal-400 text-teal-600"
                                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-teal-400 group-hover:text-teal-500"
                            }`}
                        >
                          {idx + 1}
                        </div>
                        <span
                          className={`text-[9px] whitespace-nowrap font-medium
                            ${isCurrent ? "text-teal-600 dark:text-teal-400" : isCompleted ? "text-teal-500" : "text-slate-400"}`}
                        >
                          {stage}
                        </span>
                      </button>
                      {!isLast && (
                        <div
                          className={`w-5 h-0.5 flex-shrink-0 ${isCompleted ? "bg-teal-400" : "bg-slate-200 dark:bg-slate-700"}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <Badge className="ml-2 flex-shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0 text-[11px]">
                {deal.status}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage confirmation */}
      <Dialog open={!!confirmStage} onOpenChange={() => setConfirmStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stage</DialogTitle>
            <DialogDescription>
              Moving{" "}
              <strong className="text-slate-800 dark:text-white">{deal.name}</strong>{" "}
              from{" "}
              <span className="font-semibold text-slate-600">{deal.status}</span>
              {" "}→{" "}
              <span className="font-semibold text-teal-600">{confirmStage}</span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe what happened in this stage..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStage(null)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
              onClick={handleStatusUpdate}
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}









// "use client";

// import { Card, CardContent } from "../ui/card";
// import {
//   Sheet,
//   SheetTrigger,
//   SheetDescription,
//   SheetTitle,
//   SheetHeader,
//   SheetContent,
// } from "../ui/sheet";
// import { Mail, Phone, LucideUpload, Trash2, Edit } from "lucide-react";
// import { Badge } from "../ui/badge";
// import { Button } from "../ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@radix-ui/react-dropdown-menu";
// import EmailTemplate from "../EmailTemplate";
// import { useState } from "react";
// import UpdateDeals from "../UpdateDeals";
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
// import { supabase } from "@/utils/supabase/client";
// import { toast } from "react-toastify";

// export default function DealCard({
//   fetchDeals,
//   deal,
//   setId,
//   onChange,
//   session,
//   fetchCustomers,
// }) {
//   const dealStatus = [
//     "New",
//     "Proposal Sent",
//     "Negotiation",
//     "Closed-won",
//     "Closed-lost",
//     "On-hold",
//     "Abandoned",
//   ];
//   const today = new Date().toISOString().split("T")[0];
//   const [email, setEmail] = useState(false);
//   const [newState, setNewState] = useState("");
//   const [open, setOpen] = useState(false);
//   const [description, setDescription] = useState("");

//   const handleStatusUpdate = async () => {
//     const stage_history = deal.stage_history || [];
//     const length = stage_history.length;
//     const start_date = stage_history[length - 1]?.end_date || deal.created_at;
//     const current_history = {
//       old_status: deal.status,
//       new_status: newState,
//       start_date: start_date.split("T")[0],
//       end_date: new Date().toISOString().split("T")[0],
//       state_description: description,
//     };
//     stage_history.push(current_history);
//     const { error } = await supabase
//       .from("Deals")
//       .update({
//         stage_history: stage_history,
//         status: newState,
//       })
//       .eq("id", deal.id);

//     if (error) {
//       console.error("Error updating deal:", error);
//       toast.error("Error updating deal");
//     } else {
//       if (newState == "Closed-won") {
//         const customerData = {
//           name: deal.name,
//           phone: deal.number,
//           email: deal.email,
//           price: deal.value,
//           address: deal.location,
//           purchase_history: {
//             product: deal.product,
//             price: deal.value,
//             purchase_date: today,
//           },
//           industry: deal.industry,
//           status: "Active",
//           created_at: today,
//           user_email: deal.user_email,
//           session: session,
//         };

//         const { data, error } = await supabase
//           .from("Customers")
//           .select("*")
//           .eq("email", deal.email)
//           .eq("user_email", deal.user_email)
//           .maybeSingle();
//         if (error) {
//           console.error("Error checking existing customer:", error);
//         }
//         if (!data) {
//           await fetch("/api/addCustomer", {
//             method: "POST",
//             body: JSON.stringify({
//               ...customerData,
//               session: session,
//             }),
//           });
//         } else {
//           const { error } = await supabase
//             .from("Customers")
//             .update({
//               ...customerData,
//               price: data.price + deal.value,
//               status: "Active",
//               created_at: data.created_at,
//               purchase_history: [
//                 ...data.purchase_history,
//                 {
//                   product: deal.product,
//                   price: deal.value,
//                 },
//               ],
//             })
//             .eq("email", deal.email)
//             .eq("user_email", deal.user_email);
//           if (error) {
//             console.error("Error updating existing customer:", error);
//           }
//         }
//         onChange();
//       }
//       await fetchDeals();
//       await fetchCustomers();
//       toast.success("Deal updated successfully");
//     }
//   };

//   const handleDeleteDeal = async (dealId) => {
//     const { error } = await supabase.from("Deals").delete().eq("id", dealId);

//     if (error) {
//       console.error("Error deleting deal:", error);
//       toast.error("Error deleting deal");
//     } else {
//       toast.success("Deal deleted successfully");
//       await fetchDeals();
//       onChange();
//     }
//   };

//   return (
//     <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 hover:bg-white/80 hover:shadow-lg  dark:hover:bg-slate-800/60 transition-all duration-300 group">
//       <CardContent>
//         <div className="flex sm:flex-row sm:items-start sm:justify-between gap-4">
//           <div className="flex-1 min-w-0">
//             <Sheet>
//               <SheetTrigger asChild key={deal.id}>
//                 <h3 className="text-base flex items-center gap-2 sm:text-lg font-semibold text-slate-900 hover:text-blue-500 dark:text-white break-words">
//                   {deal.name}
//                   <Edit className="h-4 w-4 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-1" />
//                 </h3>
//               </SheetTrigger>
//               <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] md:min-w-[85vw] min-w-screen ">
//                 <SheetHeader>
//                   <SheetTitle>Deal Data</SheetTitle>
//                   <SheetDescription>
//                     <UpdateDeals
//                       deal_id={deal.id}
//                       onChange={onChange}
//                       fetchCustomers={fetchCustomers}
//                       fetchDeals={fetchDeals}
//                     />
//                   </SheetDescription>
//                 </SheetHeader>
//               </SheetContent>
//             </Sheet>
//             <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 break-words">
//               {deal.company}
//             </p>
//             <div className="flex sm:flex-col justify-self-start mt-2 text-sm text-slate-500 dark:text-slate-400 sm:gap-0">
//               <span className="break-words">Owner: {deal.owner}</span>
//               <span className="break-words justify-self-start">
//                 Source: {deal.source}
//               </span>
//             </div>
//           </div>
//           <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
//             <div className="text-left sm:text-right">
//               <div className="text-lg sm:text-xl font-bold text-green-600">
//                 {deal.value}
//               </div>
//               <Badge variant="outline">{deal.status}</Badge>
//               <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
//                 Close: {deal?.closeDate?.split("T")[0] ?? ""}
//               </p>
//             </div>
//           </div>
//         </div>
//         <div className="flex sm:flex-row sm:items-center sm:justify-between mt-2 gap-3 opacity-100 sm:opacity-100  transition-opacity">
//           <div className="flex flex-wrap gap-2">
//             <Dialog open={open} onOpenChange={setOpen}>
//               <DropdownMenu className="relative">
//                 <DropdownMenuTrigger asChild>
//                   <Button
//                     size="sm"
//                     className={`bg-gradient-to-r from-sky-700 to-teal-500 text-white flex-1 sm:flex-none cursor-pointer ${
//                       deal.status === "Closed-won" ||
//                       deal.status === "Closed-lost"
//                         ? "hidden"
//                         : "block"
//                     } `}
//                     onClick={() => setId(deal.id)}
//                   >
//                     Update Status
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent className="w-48 absolute top-[100%] bg-gray-700 text-white transform translate-x-[38%] translate-y-[-80%] z-1000 rounded-lg p-2 mt-2">
//                   {dealStatus
//                     .filter((statu) => statu !== deal.status)
//                     .map((statu) => (
//                       <DialogTrigger asChild key={statu}>
//                         <DropdownMenuItem
//                           className="cursor-pointer border-b border-gray-300"
//                           key={statu}
//                           onClick={() => {
//                             setNewState(statu);
//                             setOpen(true);
//                           }}
//                         >
//                           {statu}
//                         </DropdownMenuItem>
//                       </DialogTrigger>
//                     ))}
//                 </DropdownMenuContent>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Status Info</DialogTitle>
//                     <DialogDescription>
//                       You are currently updating the status from{" "}
//                       <span className="font-semibold">{deal.status}</span> to{" "}
//                       <span className="font-semibold">{newState}</span>.
//                       <>
//                         <Textarea
//                           placeholder="Explain in  detail about the actions performed in this stage. Along with reason for updating the status"
//                           className="mt-1"
//                           onChange={(e) => setDescription(e.target.value)}
//                         />
//                       </>
//                     </DialogDescription>
//                   </DialogHeader>
//                   <DialogFooter>
//                     <Button
//                       type="submit"
//                       onClick={() => {
//                         handleStatusUpdate();
//                         setOpen(false);
//                         onChange();
//                       }}
//                       className="border cursor-pointer border-green-500 bg-transparent hover:bg-green-200 hover:text-green-700 text-green-500"
//                     >
//                       <LucideUpload className="h-4 w-4 mr-2" />
//                       Update Status
//                     </Button>
//                   </DialogFooter>
//                 </DialogContent>
//               </DropdownMenu>
//             </Dialog>
//           </div>
//           <div className="flex flex-wrap gap-2">
//             <Dialog>
//               <DialogTrigger asChild>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="bg-white/50 cursor-pointer dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
//                   onClick={() => setEmail(true)}
//                 >
//                   <Mail className="h-4 w-4 mr-1" />
//                   Email
//                 </Button>
//               </DialogTrigger>

//               <EmailTemplate
//                 type="Deals"
//                 id={deal.id}
//                 email={deal.email}
//                 open={email}
//                 onOpenChange={setEmail}
//               />
//             </Dialog>
//             <Button
//               size="sm"
//               variant="outline"
//               className="bg-white/50 dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
//             >
//               <Phone className="h-4 w-4 mr-1" />
//               Call
//             </Button>
//             <Dialog>
//               <DialogTrigger asChild>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="bg-white/50 dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
//                 >
//                   <Trash2 className="h-4 w-4" />
//                 </Button>
//               </DialogTrigger>
//               <DialogContent>
//                 <DialogHeader>
//                   <DialogTitle>Delete Deal</DialogTitle>
//                   <DialogDescription>
//                     Are you sure you want to delete this deal?
//                   </DialogDescription>
//                 </DialogHeader>
//                 <DialogFooter>
//                   <Button
//                     type="submit"
//                     onClick={() => {
//                       handleDeleteDeal(deal.id);
//                       setOpen(false);
//                       onChange();
//                     }}
//                   >
//                     Delete
//                   </Button>
//                 </DialogFooter>
//               </DialogContent>
//             </Dialog>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

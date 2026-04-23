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

  const handleDeleteCustomer = async () => {
    const { error } = await supabase
      .from("Customers")
      .delete()
      .eq("id", customer.id);
    if (error) {
      toast.error("Error deleting customer");
    } else {
      toast.success("Customer deleted");
      setOpen(false);
      onChange();
    }
  };

  const currentIdx = CUSTOMER_STAGES.indexOf(customer.status);

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
                {customer?.name
                  ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-slate-800 dark:text-white truncate leading-tight">
              {customer?.name}
            </p>
          </div>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[customer.status] || "bg-slate-400"}`}
          />
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
            <span className="text-xs font-bold text-green-600 dark:text-green-400">
              ${customer.price}
            </span>
          ) : <span />}
          {customer?.created_at && (
            <span className="text-[10px] text-slate-400">
              {customer.created_at.split("T")[0]}
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
                  {customer?.name
                    ? customer.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {customer?.name}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {customer?.email}
                </p>
              </div>
              <Badge
                className={`ml-1 flex-shrink-0 ${STATUS_COLOR[customer.status] || "bg-slate-400"} text-white border-0 text-xs`}
              >
                {customer.status}
              </Badge>
              {customer?.price && (
                <span className="text-base font-bold text-green-600 dark:text-green-400 flex-shrink-0 ml-1">
                  — ${customer.price}
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
                  type="Customers"
                  id={customer.id}
                  email={customer.email}
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
                    <SheetTitle>Edit Customer</SheetTitle>
                    <SheetDescription asChild>
                      <div>
                        <UpdateCustomer customer_id={customer.id} onChange={onChange} />
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
                    <DialogTitle>Delete Customer</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>{customer.name}</strong>?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteCustomer}>Delete</Button>
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
              <InfoRow icon={Mail} label="Email" value={customer.email} />
              <InfoRow icon={Phone} label="Phone" value={customer.number || customer.phone} />
              <InfoRow icon={Building2} label="Industry" value={customer.industry} />
              <InfoRow icon={MapPin} label="Address" value={customer.address} />
              <InfoRow icon={Globe} label="Website" value={customer.website} />
              <InfoRow icon={Linkedin} label="LinkedIn" value={customer.linkedIn} />
              <InfoRow icon={DollarSign} label="Total Value" value={customer.price ? `$${customer.price}` : null} />
              <InfoRow icon={Calendar} label="Created" value={customer.created_at?.split("T")[0]} />
              {customer.issues && customer.issues !== "[]" && (
                <div className="pt-2">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Issues</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                    {typeof customer.issues === "string" ? customer.issues : JSON.stringify(customer.issues)}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Purchase history */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/60 dark:bg-slate-900/40">
              <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-3">
                Purchase History
              </p>
              {customer.purchase_history && (
                Array.isArray(customer.purchase_history)
                  ? customer.purchase_history
                  : [customer.purchase_history]
              ).length > 0 ? (
                <div className="space-y-2">
                  {(Array.isArray(customer.purchase_history)
                    ? customer.purchase_history
                    : [customer.purchase_history]
                  ).map((p, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
                    >
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
                        <p className="text-xs text-slate-400 ml-5">{p.purchase_date}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">No purchase history yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Status Pipeline ── */}
          <div className="border-t bg-white dark:bg-slate-900 px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap mr-1">
                Customer Status
              </span>
              <div className="flex items-center gap-0">
                {CUSTOMER_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isLast = idx === CUSTOMER_STAGES.length - 1;
                  return (
                    <div key={stage} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center gap-1 px-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                            ${isCurrent
                              ? "bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900"
                              : isCompleted
                                ? "bg-teal-50 dark:bg-teal-900/30 border-teal-400 text-teal-600"
                                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"
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
                      </div>
                      {!isLast && (
                        <div
                          className={`w-10 h-0.5 flex-shrink-0 ${isCompleted ? "bg-teal-400" : "bg-slate-200 dark:bg-slate-700"}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <Badge className="ml-auto flex-shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0 text-[11px]">
                {customer.status}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}





















// "use client";

// import { Avatar, AvatarFallback } from "../ui/avatar";
// import { Card, CardContent } from "../ui/card";
// import {
//   MapPin,
//   Building2,
//   Eye,
//   Mail,
//   Phone,
//   Trash2,
//   Edit,
// } from "lucide-react";
// import { Button } from "../ui/button";
// import { Badge } from "../ui/badge";
// import {
//   Sheet,
//   SheetTitle,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTrigger,
// } from "../ui/sheet";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTrigger,
// } from "../ui/dialog";
// import EmailTemplate from "../EmailTemplate";
// import UpdateCustomer from "../UpdateCustomer";
// import { useState } from "react";

// export default function CustomerCard({ customer, onChange }) {
//   const [email, setEmail] = useState(false);
//   return (
//     <Sheet>
//       <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all duration-300 group xs:max-w-[290px] sm:max-w-full ">
//         <CardContent className="">
//           <div className="flex sm:flex-col md:flex-row items-center justify-between gap-4">
//             <div className="flex items-center space-x-3 sm:space-x-4 flex-1 w-full">
//               <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
//                 <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm">
//                   {customer?.name
//                     ? customer.name
//                         .trim()
//                         .split(/\s+/)
//                         .map((n) => n[0])
//                         .join("")
//                     : "?"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="flex-1 w-full">
//                 <div>
//                   <SheetTrigger asChild>
//                     <h3 className="text-md flex items-center gap-2 hover:text-blue-400 md:text-lg cursor-pointer text-start font-semibold text-slate-900 dark:text-white break-words">
//                       {customer.name}
//                       <Edit className="h-4 w-4 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer" />
//                     </h3>
//                   </SheetTrigger>
//                   <p className="text-sm sm:text-xs text-slate-600 dark:text-slate-400 break-words">
//                     {customer.email}
//                   </p>
//                 </div>
//                 <div className="flex flex-col justify-self-start mt-2 text-sm text-slate-500 dark:text-slate-400 sm:gap-0">
//                   <div className="flex items-center">
//                     <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
//                     <span className="break-words text-[10px] md:text-sm">
//                       {customer.industry}
//                     </span>
//                   </div>
//                   <div className="flex items-center mt-1">
//                     <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
//                     <span className="break-words text-[10px] md:text-sm">
//                       {customer.address}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
//               <div className="text-left flex items-end flex-col sm:text-right">
//                 <Badge
//                   variant={
//                     customer.status === "Active"
//                       ? "default"
//                       : customer.status === "At Risk"
//                       ? "destructive"
//                       : "secondary"
//                   }
//                   className="text-[10px] md:text-xs"
//                 >
//                   {customer.status}
//                 </Badge>
//                 <p className="text-[10px] flex flex-col md:text-xs text-slate-500 dark:text-slate-400 mt-1 break-words ">
//                   Created At:{" "}
//                   <span>
//                     {customer?.created_at
//                       ? customer.created_at.split("T")[0]
//                       : "N/A"}
//                   </span>
//                 </p>
//               </div>
//             </div>
//           </div>
//           <div className="flex flex-col items-start mt-4 gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
//             <div className="gap-6 flex w-full justify-between">
//               <div>
//                 <Dialog>
//                   <DialogTrigger asChild>
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       className="bg-white/50 cursor-pointer dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none "
//                       onClick={() => setEmail(true)}
//                     >
//                       <Mail className="h-4 w-4 mr-1" />
//                       <span className="hidden md:block">Email</span>
//                     </Button>
//                   </DialogTrigger>

//                   <EmailTemplate
//                     type="Customers"
//                     id={customer.id}
//                     email={customer.email}
//                     open={email}
//                     onOpenChange={setEmail}
//                   />
//                 </Dialog>
//               </div>
//               <div>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="bg-white/50 dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
//                 >
//                   <Phone className="h-4 w-4 mr-1" />
//                   <span className="hidden md:block">Call</span>
//                 </Button>
//               </div>
//               <div>
//                 <Dialog>
//                   <DialogTrigger asChild>
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       className="bg-white/50 dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                       <span className="hidden md:block">Delete</span>
//                     </Button>
//                   </DialogTrigger>
//                   <DialogContent>
//                     <DialogHeader>
//                       <DialogTitle>Delete Deal</DialogTitle>
//                       <DialogDescription>
//                         Are you sure you want to delete this deal?
//                       </DialogDescription>
//                     </DialogHeader>
//                     <DialogFooter>
//                       <Button
//                         type="submit"
//                         onClick={() => {
//                           handleDeleteDeal(deal.id);
//                           setOpen(false);
//                           onChange();
//                         }}
//                       >
//                         Delete
//                       </Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//       <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] md:min-w-[85vw] min-w-screen ">
//         <SheetHeader>
//           <SheetTitle>Customer Data</SheetTitle>
//           <SheetDescription>
//             <UpdateCustomer customer_id={customer.id} onChange={onChange} />
//           </SheetDescription>
//         </SheetHeader>
//       </SheetContent>
//     </Sheet>
//   );
// }

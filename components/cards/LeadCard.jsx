"use client";

import { Card, CardContent } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Sheet,
  SheetTrigger,
  SheetDescription,
  SheetTitle,
  SheetHeader,
  SheetContent,
} from "../ui/sheet";
import { Mail, Phone, Trash2, Edit } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import Updateleads from "../Updateleads";
import { supabase } from "@/utils/supabase/client";
import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import EmailTemplate from "../EmailTemplate";

export default function LeadCard({
  lead,
  setId,
  onChange,
  fetchLeads,
  fetchDeals,
}) {
  const leadStatus = [
    "New",
    "In progress",
    "Contact Attempted",
    "Contacted",
    "Meeting Booked",
    "Qualified",
    "Unqualified",
  ];

  const [newState, setNewState] = useState("");
  const [email, setEmail] = useState(false);
  const [description, setDescription] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);
  const today = new Date();

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
      new_status: newState,
      start_date: start_date,
      end_date: new Date().toISOString().split("T")[0],
      state_description: description,
    };

    stage_history.push(current_history);

    const { data: LeadsData, error } = await supabase
      .from("Leads")
      .update({
        stage_history: stage_history,
        status: newState,
      })
      .select("*")
      .eq("id", lead.id)
      .single();

    if (error) {
      toast.error("Error updating lead");
    } else {
      toast.success("Lead updated");

      if (newState === "Qualified") {
        await supabase.from("Deals").insert({
          name: LeadsData.name,
          number: LeadsData.number,
          email: LeadsData.email,
          status: "New",
          created_at: today.toISOString().split("T")[0],
          closeDate: today.toISOString().split("T")[0],
          user_email: LeadsData.user_email,
        });

        await fetchDeals();
      }

      await fetchLeads();
    }
  };

  const handleDeleteLead = async (leadId) => {
    const { error } = await supabase.from("Leads").delete().eq("id", leadId);

    if (error) {
      toast.error("Error deleting lead");
    } else {
      toast.success("Deleted");
      onChange();
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl">
      <CardContent>
        {/* TOP */}
        <div className="flex justify-between gap-4">
          <div className="flex gap-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white">
                {lead?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>

            <div>
              <Sheet>
                <SheetTrigger asChild>
                  <h3 className="font-semibold cursor-pointer hover:text-blue-500 flex items-center gap-2">
                    {lead?.name}
                    <Edit className="w-4 h-4" />
                  </h3>
                </SheetTrigger>

                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Lead Data</SheetTitle>
                    <SheetDescription>
                      <Updateleads
                        lead_id={lead.id}
                        onChange={onChange}
                        fetchLeads={fetchLeads}
                        fetchDeals={fetchDeals}
                      />
                    </SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>

              <p className="text-sm text-gray-500">{lead?.contact}</p>
            </div>
          </div>

          <Badge>{lead.status}</Badge>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-between mt-4">
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Mail className="w-4 h-4 mr-1" /> Email
                </Button>
              </DialogTrigger>

              <EmailTemplate
                type="Leads"
                id={lead.id}
                email={lead.email}
                open={email}
                onOpenChange={setEmail}
              />
            </Dialog>

            <Button size="sm" variant="outline">
              <Phone className="w-4 h-4 mr-1" /> Call
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Lead</DialogTitle>
                  <DialogDescription>Are you sure?</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <Button onClick={() => handleDeleteLead(lead.id)}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* UPDATE BUTTON */}
          <Button
            size="sm"
            className="bg-gradient-to-r from-sky-700 to-teal-500 text-white"
            onClick={() => setShowUpdate(!showUpdate)}
          >
            Update Status
          </Button>
        </div>

        {/* 🔥 EXPAND SECTION */}
        {showUpdate && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <div className="flex flex-wrap gap-2 mb-3">
              {leadStatus.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  onClick={() => setNewState(status)}
                  className={`transition-all duration-200 rounded-full px-4
      ${
        newState === status
          ? "bg-gradient-to-r from-sky-700 to-teal-500 text-white shadow-md"
          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-200"
      }
    `}
                >
                  {status}
                </Button>
              ))}
            </div>

            <Textarea
              placeholder="Explain status..."
              onChange={(e) => setDescription(e.target.value)}
            />

            <Button
              className="mt-3 bg-gradient-to-r from-sky-700 to-teal-500 text-white"
              onClick={() => {
                handleStatusUpdate();
                setShowUpdate(false);
              }}
            >
              Confirm Update
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import CalendarComponent from "@/components/Calendar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabase/client";

export default function HRMSDashboard() {
  const [features, setFeatures] = useState([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState();
  const [userData, setUserData] = useState(null);
  const [type, setType] = useState(null);

  useEffect(() => {
    setType(localStorage.getItem("type"));
    const fetchUserData = async (company_id) => {
      const { data, error } = await supabase
        .from("HRMS")
        .select("user_email")
        .eq("id", company_id)
        .single();

      if (error) {
        console.log("Error fetching user data:", error);
        return;
      }

      if (data) setUserData(data.user_email);
    };

    if (type === "employee") {
      fetchUserData(JSON.parse(localStorage.getItem("employee"))?.company_id);
    } else {
      const rawSession = localStorage.getItem("session");
      const userData = rawSession ? JSON.parse(rawSession) : null;
      setUserData(userData.user?.email);
    }
  }, []);

  useEffect(() => {
    const fetchLeaves = async () => {
      const { data, error } = await supabase
        .from("HRMS")
        .select("*")
        .eq("user_email", userData);

      if (error) {
        console.log("Error fetching leaves:", error);
        return;
      }

      if (data && data.length > 0) {
        const formattedFeatures = [];
        (data[0].leave || []).forEach((feature) => {
          const startDate = new Date(feature.start);
          const endDate = new Date(feature.end);
          for (
            let d = new Date(startDate);
            d <= endDate;
            d.setDate(d.getDate() + 1)
          ) {
            formattedFeatures.push({
              id: feature.id,
              name: feature.title,
              startAt: new Date(d),
              endAt: new Date(d),
              status: {
                id: 1,
                name: "Leave",
                color: "#A8E4A0",
              },
            });
          }
        });
        setFeatures(formattedFeatures);
      }
    };
    fetchLeaves();
  }, [userData]);

  const HandleLeave = async () => {
    if (date?.from && reason) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date.from < today) {
        toast.error("You can't apply leave for past date");
        return;
      }

      const newFeature = {
        id: Math.random().toString(36).substring(2, 9),
        title: reason,
        start: date.from,
        end: date.to || date.from,
        allDay: true,
      };

      const { data: newFeatureData, error } = await supabase
        .from("HRMS")
        .select("*")
        .eq("user_email", userData);

      if (error) {
        toast.error("Error applying leave");
        return;
      }

      if (newFeatureData && newFeatureData.length > 0) {
        const existingLeaves = newFeatureData[0].leave || [];
        if (existingLeaves.find((leave) => leave.title === newFeature.title)) {
          toast.error("Leave already exists");
          return;
        }
        const { error: updateError } = await supabase
          .from("HRMS")
          .update({ leave: [...existingLeaves, newFeature] })
          .eq("user_email", userData);

        if (updateError) {
          toast.error("Error applying leave");
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("HRMS")
          .insert({ user_email: userData, leave: [newFeature] });

        if (insertError) {
          toast.error("Error applying leave");
          return;
        }
      }

      const formattedNewFeatures = [];
      const startDate = new Date(newFeature.start);
      const endDate = new Date(newFeature.end);
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        formattedNewFeatures.push({
          id: newFeature.id,
          name: newFeature.title,
          startAt: new Date(d),
          endAt: new Date(d),
          status: {
            id: 1,
            name: "Leave",
            color: "#A8E4A0",
          },
        });
      }

      setFeatures((prev) => [...prev, ...formattedNewFeatures]);
      setOpen(false);
      setReason("");
      setDate(undefined);
      toast.success("Leave applied successfully");
    } else {
      toast.error("Please fill all the fields");
    }
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-8">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2ba08d] to-[#2b6781] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(37,200,160,0.3)]">
            Calender
          </h1>

          {/* Add Leave Button aligned right */}
          {type === "admin" && (
            <Sheet onOpenChange={setOpen} open={open}>
              <SheetTrigger asChild>
                <Button className="bg-gradient-to-r from-[#25C2A0] to-[#387e9d] text-white font-semibold px-5 py-2 cursor-pointer rounded-md shadow hover:scale-[1.03] hover:opacity-90 transition-all">
                  Add Leave
                </Button>
              </SheetTrigger>

              <SheetContent className="w-max bg-white/90 backdrop-blur-xl border border-[#25C2A0]/30 shadow-lg rounded-xl p-5">
                <SheetHeader>
                  <SheetTitle className="text-lg font-semibold bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] bg-clip-text text-transparent">
                    Apply for Leave
                  </SheetTitle>
                </SheetHeader>

                <div className="grid flex-1 auto-rows-min gap-6 px-2 mt-4">
                  <div className="grid gap-3">
                    <Label htmlFor="sheet-date" className="text-gray-700">
                      Date
                    </Label>
                    <Calendar
                      id="sheet-date"
                      mode="range"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border border-[#2AD4B7]/40 p-2 bg-white/60"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="sheet-reason" className="text-gray-700">
                      Reason
                    </Label>
                    <Textarea
                      id="sheet-reason"
                      placeholder="Enter Reason"
                      value={reason}
                      required
                      onChange={(e) => setReason(e.target.value)}
                      className="border border-[#25C2A0]/40 focus:ring-2 focus:ring-[#25C2A0]/40 transition-all"
                    />
                  </div>
                </div>

                <SheetFooter>
                  <Button
                    onClick={HandleLeave}
                    className="mt-4 w-full bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] text-white font-semibold rounded-md hover:scale-[1.02] hover:opacity-90 transition-all"
                  >
                    Confirm
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Calendar Section */}
        <CalendarComponent feature={features} />
      </div>
    </div>
  );
}

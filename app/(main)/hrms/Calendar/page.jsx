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
    const storedType = localStorage.getItem("type");
    setType(storedType);

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

    if (storedType === "employee") {
      const emp = JSON.parse(localStorage.getItem("employee"));
      if (emp?.company_id) {
        fetchUserData(emp.company_id);
      }
    } else {
      const rawSession = localStorage.getItem("session");
      const sessionData = rawSession ? JSON.parse(rawSession) : null;
      if (sessionData?.user?.email) {
        setUserData(sessionData.user.email);
      }
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
      // Removed past date restriction to allow adding leaves for any date

      const newFeature = {
        id: Math.random().toString(36).substring(2, 9),
        title: reason,
        start: date.from,
        end: date.to || date.from,
        allDay: true,
      };

      const { data: hrmsData, error: hrmsError } = await supabase
        .from("HRMS")
        .select("*")
        .eq("user_email", userData);

      if (hrmsError) {
        toast.error("Error applying leave");
        return;
      }

      if (hrmsData && hrmsData.length > 0) {
        const existingLeaves = hrmsData[0].leave || [];
        // Fixed duplicate check: check for same date AND title
        const isDuplicate = existingLeaves.find((leave) =>
          leave.title === newFeature.title &&
          new Date(leave.start).getTime() === new Date(newFeature.start).getTime()
        );

        if (isDuplicate) {
          toast.error("This leave already exists for the selected date");
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
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 md:py-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 text-center md:text-left">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2ba08d] to-[#2b6781] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(37,200,160,0.3)]">
            Calendar
          </h1>

          {/* Add Leave Button aligned right */}
          {type === "admin" && (
            <Sheet onOpenChange={setOpen} open={open}>
              <SheetTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-[#25C2A0] to-[#387e9d] text-white font-semibold px-6 py-2 cursor-pointer rounded-xl shadow-lg hover:scale-[1.03] hover:opacity-90 transition-all h-12">
                  Add Leave
                </Button>
              </SheetTrigger>

              <SheetContent className="w-[95vw] sm:max-w-md bg-card/90 backdrop-blur-xl border border-primary/30 shadow-2xl p-6 overflow-y-auto rounded-l-[2rem]">
                <SheetHeader>
                  <SheetTitle className="text-lg font-semibold bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] bg-clip-text text-transparent">
                    Apply for Leave
                  </SheetTitle>
                </SheetHeader>

                <div className="grid flex-1 auto-rows-min gap-6 px-2 mt-4">
                  <div className="grid gap-3">
                    <Label htmlFor="sheet-date" className="text-foreground">
                      Date
                    </Label>
                    <Calendar
                      id="sheet-date"
                      mode="range"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border border-primary/40 p-2 bg-muted/20"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="sheet-reason" className="text-foreground">
                      Reason
                    </Label>
                    <Textarea
                      id="sheet-reason"
                      placeholder="Enter Reason"
                      value={reason}
                      required
                      onChange={(e) => setReason(e.target.value)}
                      className="border border-primary/40 focus:ring-2 focus:ring-primary/40 transition-all bg-muted/10 placeholder:text-muted-foreground/50"
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

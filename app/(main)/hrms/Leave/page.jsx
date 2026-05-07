"use client";

import { supabase } from "@/utils/supabase/client";
import { Coffee } from "lucide-react";
import { useEffect, useState } from "react";

const LeaveApproval = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [leavePending, setLeavePending] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) redirect("/");

    const sessionJSON = JSON.parse(localStorage.getItem("session"));
    setUserEmail(sessionJSON?.user?.email);
  }, []);

  const fetchPendingLeaves = async () => {
    if (userEmail) {
      const { data, error } = await supabase
        .from("HRMS")
        .select("apply_leave")
        .eq("user_email", userEmail)
        .single();

      if (error) {
        console.error("Error fetching leave data:", error);
        return;
      }

      setLeavePending(data.apply_leave || []);
    }
  };

  useEffect(() => {
    fetchPendingLeaves();
  }, [userEmail]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const HandleApproveLeave = async (leave) => {
    const { error } = await supabase
      .from("HRMS")
      .update({
        apply_leave: leavePending.filter((l) => l.id !== leave.id),
      })
      .eq("user_email", userEmail);

    if (error) {
      console.error("Error updating leave status:", error);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("Employees")
      .select("*")
      .eq("id", leave.employee_id)
      .single();

    if (employeeError) {
      console.error("Error fetching employee data:", employeeError);
      return;
    }

    const updatedLeaves = employeeData.apply_leave.map((l) => {
      if (l.id === leave.id) {
        return { ...l, status: "Approved" };
      }
      return l;
    });

    await supabase
      .from("Employees")
      .update({ apply_leave: updatedLeaves })
      .eq("id", leave.employee_id);

    await supabase
      .from("Employees")
      .update({
        notifications: [
          ...(employeeData.notifications || []),
          {
            id: leave.id,
            date: leave.date,
            type: "leave",
            title: "Leave Approved",
            status: "unread",
            message: `Your leave request from ${formatDate(
              leave.start
            )} to ${formatDate(leave.end)} was approved.`,
          },
        ],
      })
      .eq("id", leave.employee_id);

    fetchPendingLeaves();
  };

  const HandleRejectLeave = async (leave) => {
    const { error } = await supabase
      .from("HRMS")
      .update({
        apply_leave: leavePending.filter((l) => l.id !== leave.id),
      })
      .eq("user_email", userEmail);

    if (error) {
      console.error("Error updating leave status:", error);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("Employees")
      .select("*")
      .eq("id", leave.employee_id)
      .single();

    if (employeeError) {
      console.error("Error fetching employee data:", employeeError);
      return;
    }

    const updatedLeaves = employeeData.apply_leave.map((l) => {
      if (l.id === leave.id) {
        return { ...l, status: "Rejected" };
      }
      return l;
    });

    await supabase
      .from("Employees")
      .update({ apply_leave: updatedLeaves })
      .eq("id", leave.employee_id);

    await supabase
      .from("Employees")
      .update({
        notifications: [
          ...(employeeData.notifications || []),
          {
            id: leave.id,
            date: leave.date,
            type: "leave",
            title: "Leave Rejected",
            status: "unread",
            message: `Your leave request from ${formatDate(
              leave.start
            )} to ${formatDate(leave.end)} was rejected.`,
          },
        ],
      })
      .eq("id", leave.employee_id);

    fetchPendingLeaves();
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 md:py-6">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7b6e] to-[#2c6279] bg-clip-text text-transparent flex items-center gap-3">
              <Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-[#2b6781]" />
              Leave Approval
            </h1>
            <p className="text-muted-foreground font-medium text-sm sm:text-base mt-1">
              Manage leave requests and approvals efficiently
            </p>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-card/50 backdrop-blur-xl border border-primary/30 shadow-lg rounded-[2rem] p-4 sm:p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-[#2b6781]">
            Pending Leave Requests
          </h2>

          {leavePending.length > 0 ? (
            <ul className="space-y-6">
              {leavePending.map((leave, index) => (
                <li
                  key={index}
                  className="border border-primary/20 bg-card/70 rounded-xl p-6 shadow hover:shadow-lg hover:scale-[1.01] transition-all"
                >
                  <div className="space-y-2 text-foreground font-medium">
                    <p>
                      <strong className="text-[#2b6781]">Employee:</strong>{" "}
                      {leave.name}
                    </p>
                    <p>
                      <strong className="text-[#2b6781]">From:</strong>{" "}
                      {formatDate(leave.start)}
                    </p>
                    <p>
                      <strong className="text-[#2b6781]">To:</strong>{" "}
                      {formatDate(leave.end)}
                    </p>
                    <p>
                      <strong className="text-[#2b6781]">Reason:</strong>{" "}
                      {leave.reason}
                    </p>
                    <p>
                      <strong className="text-[#2b6781]">Half Day:</strong>{" "}
                      {leave.half_day ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                      className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] text-white font-semibold shadow hover:scale-[1.03] hover:opacity-90 transition-all"
                      onClick={() => HandleApproveLeave(leave)}
                    >
                      Approve
                    </button>
                    <button
                      className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#f87171] to-[#ef4444] text-white font-semibold shadow hover:scale-[1.03] hover:opacity-90 transition-all"
                      onClick={() => HandleRejectLeave(leave)}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center font-medium">
              No pending leave requests.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveApproval;

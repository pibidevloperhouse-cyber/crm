"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, FileUser, CalendarX2, WalletCards } from "lucide-react";
import CalendarPage from "./Calendar/page";
import EmployeesPage from "./Employee/page";
import LeavePage from "./Leave/page";
import PayrollPage from "./Payroll/page";

const tabs = [
  { id: "calendar", name: "Calendar", icon: Calendar },
  { id: "employee", name: "Employee", icon: FileUser },
  { id: "leave", name: "Leave", icon: CalendarX2 },
  { id: "payroll", name: "Payroll", icon: WalletCards },
];

export default function HRMSPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState(tabParam || "calendar");

  useEffect(() => {
    if (tabParam && tabs.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    const params = new URLSearchParams(searchParams);
    params.set("tab", id);
    router.replace(`/hrms?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9FDF9] via-[#C8F4EE] to-[#B2E8F7] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2ba08d] to-[#2b6781] bg-clip-text text-transparent drop-shadow-sm">
              HRMS Dashboard
            </h1>
            <p className="text-slate-600 font-medium mt-1">
              Seamlessly manage your workforce, schedules, and finances.
            </p>
          </div>

          {/* Professional Tab Switcher */}
          <div className="flex flex-wrap justify-center gap-1.5 bg-white/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/40 shadow-xl shadow-teal-900/5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-105"
                      : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-teal-500"}`} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area with smooth transition */}
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl overflow-hidden">
            {activeTab === "calendar" && <CalendarPage />}
            {activeTab === "employee" && <EmployeesPage />}
            {activeTab === "leave" && <LeavePage />}
            {activeTab === "payroll" && <PayrollPage />}
          </div>
        </div>
      </div>
    </div>
  );
}

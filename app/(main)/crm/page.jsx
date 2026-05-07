"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import Papa from "papaparse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import LeadCard from "@/components/cards/LeadCard";
import LeadForm from "@/components/forms/LeadForm";
import CustomerCard from "@/components/cards/CustomerCard";
import CustomerForm from "@/components/forms/CustomerForm";
import DealCard from "@/components/cards/DealCard";
import DealForm from "@/components/forms/DealForm";
import AgentActivity from "@/components/agents/AgentActivity";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Users,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
} from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabase/client";
import { customerStatus, dealStatus, leadStatus } from "@/constants/constant";
import { redirect } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Status dot color map ────────────────────────────────────────────────────
const STATUS_DOT = {
  New: "bg-blue-400",
  Contacted: "bg-yellow-400",
  Qualified: "bg-purple-500",
  "Not Qualified": "bg-red-400",
  NotQualified: "bg-red-400",
  Converted: "bg-green-500",
  Unqualified: "bg-orange-400",
  "New Lead": "bg-blue-400",
  Proposal: "bg-violet-500",
  Negotiation: "bg-orange-400",
  "Closed-won": "bg-emerald-500",
  "Closed Won": "bg-emerald-500",
  "Closed-lost": "bg-red-500",
  "Closed Lost": "bg-red-500",
  Closed: "bg-slate-400",
  Active: "bg-emerald-500",
  Inactive: "bg-slate-400",
  Churned: "bg-red-400",
};

// ─── Normalize constant arrays ────────────────────────────────────────────────
const normalizeStatuses = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .map((s) =>
      typeof s === "string" ? s : s?.value || s?.label || s?.name || "",
    )
    .filter(Boolean);
};

// ─── Fallback status lists ────────────────────────────────────────────────────
const LEAD_DEFAULTS = [
  "New",
  "Contacted",
  "Qualified",
  "Not Qualified",
  "Converted",
];
const DEAL_DEFAULTS = [
  "New Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed-won",
  "Closed",
  "Closed-lost",
];
const CUSTOMER_DEFAULTS = ["Active", "Inactive", "Churned"];

export default function CRM() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Leads");
  const [customersData, setCustomersData] = useState([]);
  const [products, setProducts] = useState([]);
  const [session, setSession] = useState(null);
  const [leadsData, setLeadsData] = useState([]);
  const [dealsData, setDealsData] = useState([]);
  const [collapsedCols, setCollapsedCols] = useState({});
  const today = new Date();
  const [userEmail, setUserEmail] = useState(null);
  const fileInputRef = useRef();

  const toggleCollapse = (colTitle) =>
    setCollapsedCols((prev) => ({ ...prev, [colTitle]: !prev[colTitle] }));

  // ── Session / user bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) redirect("/");
    setProducts(
      user?.products?.map((p) => ({ value: p.name, label: p.name })) || [],
    );
    const sessionJSON = JSON.parse(localStorage.getItem("session"));
    setSession(sessionJSON);
    setUserEmail(sessionJSON.user.email);
    setActiveTab(sessionStorage.getItem("activeTab") || "Leads");
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("Customers")
      .select("*")
      .eq("user_email", userEmail || "undefined")
      .order("created_at", { ascending: false });
    if (data) setCustomersData(data);
  };
  const fetchLeads = async () => {
    const { data } = await supabase
      .from("Leads")
      .select("*")
      .eq("user_email", userEmail || "undefined")
      .order("created_at", { ascending: false });
    if (data) setLeadsData(data);
  };
  const fetchDeals = async () => {
    const { data } = await supabase
      .from("Deals")
      .select("*")
      .eq("user_email", userEmail || "undefined")
      .order("created_at", { ascending: false });
    if (data) setDealsData(data);
  };

  useEffect(() => {
    if (!userEmail) return;
    fetchCustomers();
    fetchLeads();
    fetchDeals();
    const id = setInterval(() => {
      fetchCustomers();
      fetchLeads();
      fetchDeals();
    }, 60000);
    return () => clearInterval(id);
  }, [userEmail]);

  // ── CSV upload ────────────────────────────────────────────────────────────
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        results.data.forEach((item) => {
          item.user_email = userEmail;
          item.created_at = today;
        });
        const { error } = await supabase.from(activeTab).insert(results.data);
        if (error) {
          console.error("Error inserting data:", error);
        } else {
          toast.success("Data inserted successfully!", {
            position: "top-right",
            autoClose: 3000,
          });
        }
      },
    });
  };

  // ── Status column builders ────────────────────────────────────────────────
  const getLeadStatuses = () => {
    const fromConst = normalizeStatuses(leadStatus);
    const fromData = [
      ...new Set(leadsData.map((l) => l.status).filter(Boolean)),
    ];
    const merged = [...new Set([...fromConst, ...fromData])];
    return merged.length ? merged : LEAD_DEFAULTS;
  };
  const getDealStatuses = () => {
    const fromConst = normalizeStatuses(dealStatus);
    const fromData = [
      ...new Set(dealsData.map((d) => d.status).filter(Boolean)),
    ];
    const merged = [...new Set([...fromConst, ...fromData])];
    return merged.length ? merged : DEAL_DEFAULTS;
  };
  const getCustomerStatuses = () => {
    const fromConst = normalizeStatuses(customerStatus);
    const fromData = [
      ...new Set(customersData.map((c) => c.status).filter(Boolean)),
    ];
    const merged = [...new Set([...fromConst, ...fromData])];
    return merged.length ? merged : CUSTOMER_DEFAULTS;
  };

  // ── Kanban column ─────────────────────────────────────────────────────────
  const KanbanColumn = ({ title, count, children }) => {
    const isCollapsed = collapsedCols[title];
    return (
      <div
        className={`flex flex-col rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 h-full transition-all duration-200 flex-shrink-0
          ${isCollapsed ? "w-10 min-w-[40px]" : "flex-1 min-w-[185px] max-w-[300px]"}`}
      >
        {/* Column header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[title] || "bg-slate-400"}`}
              />
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate">
                {title}
              </span>
              <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">
                {count}
              </span>
            </div>
          )}
          <button
            onClick={() => toggleCollapse(title)}
            className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all ${isCollapsed ? "mx-auto" : "ml-1"}`}
            title={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Collapsed: rotated label */}
        {isCollapsed && (
          <div className="flex-1 flex items-center justify-center py-4">
            <span
              className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 select-none"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              {title} ({count})
            </span>
          </div>
        )}

        {/* Scrollable cards */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 min-h-[60px]">
            <AnimatePresence>
              {count === 0 && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-600 py-6 select-none">
                  Empty
                </p>
              )}
              {children}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  // ── Wrapped card with animation ───────────────────────────────────────────
  const AnimatedCard = ({ id, children }) => (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );

  // ── CSV sheet content ─────────────────────────────────────────────────────
  const CsvSheetContent = () => (
    <>
      <div
        className={`${activeTab === "Customers" ? "grid" : "hidden"} p-3 grid-cols-1 md:grid-cols-2 gap-4`}
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">
            📄 CSV Format Requirements
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-900 dark:text-slate-400">
            <li>
              Required: <b>name, number, email, status</b>
            </li>
            <li>
              Optional: address, website, industry, linkedIn, price, issues
            </li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
            💡 Download the template to ensure proper formatting.
          </div>
        </div>
        <div className="space-y-4 mt-2">
          <div>
            <h3 className="font-semibold mb-2">📥 Download Template</h3>
            <Button
              variant="outline"
              onClick={() => window.open("/templates/customer_template.xlsx")}
            >
              Download Sample Excel
            </Button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">📂 Select CSV File</h3>
            <Button
              onClick={() => fileInputRef.current.click()}
              className="bg-gradient-to-r from-sky-700 to-teal-500 text-white cursor-pointer"
            >
              Choose File
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
      <div
        className={`${activeTab === "Leads" ? "grid" : "hidden"} p-3 grid-cols-1 md:grid-cols-2 gap-4`}
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">
            📄 CSV Format Requirements
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>
              Required: <b>name, number, status</b>
            </li>
            <li>
              Optional: email, age, industry, company, income, address,
              linkedIn, description, website, source
            </li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
            💡 Download the template to ensure proper formatting.
          </div>
        </div>
        <div className="space-y-4 mt-2">
          <div>
            <h3 className="font-semibold mb-2">📥 Download Template</h3>
            <Button
              variant="outline"
              onClick={() => window.open("/templates/leads_template.xlsx")}
            >
              Download Sample Excel
            </Button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">📂 Select CSV File</h3>
            <Button
              onClick={() => fileInputRef.current.click()}
              className="bg-gradient-to-r from-sky-700 to-teal-500 text-white cursor-pointer"
            >
              Choose File
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
      <div
        className={`${activeTab === "Deals" ? "grid" : "hidden"} p-3 grid-cols-1 md:grid-cols-2 gap-4`}
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">
            📄 CSV Format Requirements
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>
              Required: <b>name, title, number, email, status, value</b>
            </li>
            <li>Optional: owner, source, priority, closeDate</li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
            💡 Download the template to ensure proper formatting.
          </div>
        </div>
        <div className="space-y-4 mt-2">
          <div>
            <h3 className="font-semibold mb-2">📥 Download Template</h3>
            <Button
              variant="outline"
              onClick={() => window.open("/templates/deals_template.xlsx")}
            >
              Download Sample Excel
            </Button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">📂 Select CSV File</h3>
            <Button
              onClick={() => fileInputRef.current.click()}
              className="bg-gradient-to-r from-sky-700 to-teal-500 text-white cursor-pointer"
            >
              Choose File
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col space-y-3"
      style={{ height: "calc(100vh - 64px)", overflow: "hidden" }}
    >
      {/* ── Page header — title left, buttons right ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        {/* Left: title + subtitle */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
            CRM Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customers, leads, and deals
          </p>
        </div>

        {/* Right: CSV + Task + Add buttons */}
        <div className="flex items-center gap-2">
          {/* CSV */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-10 px-3 bg-gradient-to-r from-sky-700 to-teal-500 text-white"

              >
                <Upload className="w-4 h-4 mr-1.5" />
                CSV
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle >Upload {activeTab} CSV</SheetTitle>
                <SheetDescription asChild>
                  <div>
                    <CsvSheetContent />
                  </div>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Button
            onClick={() => router.push("/crm/agent-workflow")}
            className="bg-gradient-to-r from-sky-600 to-teal-500 text-white"
          >
            <Users size={16} className="mr-2" />
            Agent Workflow
          </Button>
          {/* TASK BUTTON */}
          <Button
            size="sm"
            onClick={() => router.push("/Task")}
            className="h-10 px-3 bg-gradient-to-r from-sky-700 to-teal-500 text-white"
          >
            Task
          </Button>
          {/* ADD BUTTON */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="sm"
                className="h-10 px-3 bg-gradient-to-r from-sky-700 to-teal-500 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add {activeTab}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add New {activeTab}</SheetTitle>
                <SheetDescription asChild>
                  <div>
                    {activeTab === "Customers" && (
                      <CustomerForm
                        session={session}
                        fetchCustomers={fetchCustomers}
                        setCustomersData={setCustomersData}
                      />
                    )}
                    {activeTab === "Leads" && (
                      <LeadForm
                        session={session}
                        fetchDeals={fetchDeals}
                        fetchLeads={fetchLeads}
                        setLeadsData={setLeadsData}
                      />
                    )}
                    {activeTab === "Deals" && (
                      <DealForm
                        fetchDeals={fetchDeals}
                        session={session}
                        products={products}
                        setDealsData={setDealsData}
                      />
                    )}
                  </div>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Tabs + Kanban boards ── */}
      <Tabs
        value={activeTab}
        onValueChange={(e) => {
          setActiveTab(e);
          sessionStorage.setItem("activeTab", e);
        }}
        className="flex flex-col flex-1 min-h-0 space-y-2"
      >
        {/* ── Tab bar ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <TabsList className="flex gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 p-1 rounded-xl h-auto flex-1">
            {[
              { value: "Leads", Icon: TrendingUp },
              { value: "Deals", Icon: DollarSign },
              { value: "Customers", Icon: Users },
            ].map(({ value, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-700 data-[state=active]:to-teal-500
                  data-[state=active]:text-white data-[state=active]:shadow-md
                  text-slate-600 dark:text-slate-400
                  hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white
                  transition-all duration-200 cursor-pointer"
              >
                <Icon className="w-4 h-4" />
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── LEADS board ── */}
        <TabsContent value="Leads" className="flex-1 min-h-0 m-0">
          <div className="flex gap-2 h-full pb-2 overflow-x-auto custom-scrollbar items-start">
            {getLeadStatuses().map((status) => {
              const items = leadsData.filter((l) => l.status === status);
              return (
                <KanbanColumn key={status} title={status} count={items.length}>
                  {items.map((lead) => (
                    <AnimatedCard key={lead.id} id={lead.id}>
                      <LeadCard
                        lead={lead}
                        onChange={fetchLeads}
                        fetchLeads={fetchLeads}
                        fetchDeals={fetchDeals}
                      />
                    </AnimatedCard>
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </TabsContent>

        {/* ── DEALS board ── */}
        <TabsContent value="Deals" className="flex-1 min-h-0 m-0">
          <div className="flex gap-2 h-full pb-2 overflow-x-auto custom-scrollbar items-start">
            {getDealStatuses().map((status) => {
              const items = dealsData.filter((d) => d.status === status);
              return (
                <KanbanColumn key={status} title={status} count={items.length}>
                  {items.map((deal) => (
                    <AnimatedCard key={deal.id} id={deal.id}>
                      <DealCard
                        deal={deal}
                        onChange={fetchDeals}
                        fetchDeals={fetchDeals}
                        fetchCustomers={fetchCustomers}
                        session={session}
                      />
                    </AnimatedCard>
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </TabsContent>

        {/* ── CUSTOMERS board ── */}
        <TabsContent value="Customers" className="flex-1 min-h-0 m-0">
          <div className="flex gap-2 h-full pb-2 overflow-x-auto custom-scrollbar items-start">
            {getCustomerStatuses().map((status) => {
              const items = customersData.filter((c) => c.status === status);
              return (
                <KanbanColumn key={status} title={status} count={items.length}>
                  {items.map((customer) => (
                    <AnimatedCard key={customer.id} id={customer.id}>
                      <CustomerCard
                        customer={customer}
                        onChange={fetchCustomers}
                      />
                    </AnimatedCard>
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <AgentActivity />
    </div>
  );
}

// "use client";

// import { useEffect, useState, useRef } from "react";
// import Papa from "papaparse";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import LeadCard from "@/components/cards/LeadCard";
// import LeadForm from "@/components/forms/LeadForm";
// import CustomerCard from "@/components/cards/CustomerCard";
// import CustomerForm from "@/components/forms/CustomerForm";
// import DealCard from "@/components/cards/DealCard";
// import DealForm from "@/components/forms/DealForm";
// import AgentActivity from "@/components/agents/AgentActivity";
// // Switch Sheet to Dialog for centered UI
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// // Keep Sheet for CSV if you want, or change to Dialog too
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "@/components/ui/sheet";
// import { Users, TrendingUp, DollarSign, ChevronLeft, ChevronRight, Upload, Plus } from "lucide-react";
// import { toast } from "react-toastify";
// import { supabase } from "@/utils/supabase/client";
// import { customerStatus, dealStatus, leadStatus } from "@/constants/constant";
// import { redirect } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";

// const STATUS_DOT = {
//   New: "bg-blue-400",
//   Contacted: "bg-yellow-400",
//   Qualified: "bg-purple-500",
//   NotQualified: "bg-red-400",
//   Converted: "bg-green-500",
//   Unqualified: "bg-orange-400",
//   "New Lead": "bg-blue-400",
//   Proposal: "bg-violet-500",
//   Negotiation:
// "bg-orange-400",
//   "Closed-won": "bg-emerald-500",
//   "Closed-lost": "bg-red-500",
//   Active: "bg-emerald-500",
//   Inactive: "bg-slate-400",
//   Churned: "bg-red-400",
// };

// const normalizeStatuses = (arr) => {
//   if (!arr || !Array.isArray(arr)) return [];
//   return arr.map((s) => (typeof s === "string" ? s : s?.value || s?.label || "")).filter(Boolean);
// };

// const LEAD_DEFAULTS = ["New", "Contacted", "Qualified", "Not Qualified", "Converted"];
// const DEAL_DEFAULTS = ["New Lead", "Qualified", "Proposal", "Negotiation", "Closed-won", "Closed", "Closed-lost"];
// const CUSTOMER_DEFAULTS = ["Active", "Inactive", "Churned"];

// export default function CRM() {
//   const [activeTab, setActiveTab] = useState("Leads");
//   const [customersData, setCustomersData] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [session, setSession] = useState(null);
//   const [leadsData, setLeadsData] = useState([]);
//   const [dealsData, setDealsData] = useState([]);
//   const [collapsedCols, setCollapsedCols] = useState({});
//   const [userEmail, setUserEmail] = useState(null);
//   const fileInputRef = useRef();

//   const toggleCollapse = (colTitle) =>
//     setCollapsedCols((prev) => ({ ...prev, [colTitle]: !prev[colTitle] }));

//   useEffect(() => {
//     const user = JSON.parse(localStorage.getItem("user"));
//     if (!user) redirect("/");
//     setProducts(user?.products?.map((p) => ({ value: p.name, label: p.name })) || []);
//     const sessionJSON = JSON.parse(localStorage.getItem("session"));
//     setSession(sessionJSON);
//     setUserEmail(sessionJSON?.user?.email);
//     setActiveTab(sessionStorage.getItem("activeTab") || "Leads");
//   }, []);

//   const fetchCustomers = async () => {
//     const { data } = await supabase.from("Customers").select("*").eq("user_email", userEmail || "undefined").order("created_at", { ascending: false });
//     if (data) setCustomersData(data);
//   };
//   const fetchLeads = async () => {
//     const { data } = await supabase.from("Leads").select("*").eq("user_email", userEmail || "undefined").order("created_at", { ascending: false });
//     if (data) setLeadsData(data);
//   };
//   const fetchDeals = async () => {
//     const { data } = await supabase.from("Deals").select("*").eq("user_email", userEmail || "undefined").order("created_at", { ascending: false });
//     if (data) setDealsData(data);
//   };

//   useEffect(() => {
//     if (!userEmail) return;
//     fetchCustomers(); fetchLeads(); fetchDeals();
//   }, [userEmail]);

//   const KanbanColumn = ({ title, count, children }) => {
//     const isCollapsed = collapsedCols[title];
//     return (
//       <div
//         className={`flex flex-col rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 h-full transition-all duration-200 flex-shrink-0
//           ${isCollapsed ? "w-12 min-w-[48px]" : "w-[300px]"}`}
//       >
//         <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
//           {!isCollapsed && (
//             <div className="flex items-center gap-1.5 min-w-0 flex-1">
//               <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[title] || "bg-slate-400"}`} />
//               <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate uppercase tracking-wider">{title}</span>
//               <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full ml-auto">{count}</span>
//             </div>
//           )}
//           <button onClick={() => toggleCollapse(title)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
//             {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
//           </button>
//         </div>
//         {!isCollapsed && (
//           <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
//             <AnimatePresence>{children}</AnimatePresence>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const AnimatedCard = ({ id, children }) => (
//     <motion.div key={id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
//       {children}
//     </motion.div>
//   );

//   return (
//     <div className="flex flex-col space-y-4 h-[calc(100vh-80px)] overflow-hidden">
//       <div className="flex justify-between items-end flex-shrink-0">
//         <div>
//           <h1 className="text-3xl font-bold bg-gradient-to-r from-[#25C2A0] to-[#1f576f] bg-clip-text text-transparent">CRM Dashboard</h1>
//           <p className="text-sm text-slate-500">Track and grow your pipeline</p>
//         </div>
//       </div>

//       <Tabs value={activeTab} onValueChange={(e) => { setActiveTab(e); sessionStorage.setItem("activeTab", e); }} className="flex flex-col flex-1 min-h-0">
//         <div className="flex items-center gap-3 mb-4 flex-shrink-0">
//           <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 flex-1 border dark:border-slate-700">
//             {["Leads", "Deals", "Customers"].map((tab) => (
//               <TabsTrigger key={tab} value={tab} className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 shadow-sm font-semibold cursor-pointer">
//                 {tab}
//               </TabsTrigger>
//             ))}
//           </TabsList>

//           {/* Add New - Switch to DIALOG for centering */}
//           <Dialog>
//             <DialogTrigger asChild>
//               <Button className="h-12 px-6 bg-gradient-to-r from-sky-700 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 cursor-pointer">
//                 <Plus className="w-5 h-5 mr-2" /> Add {activeTab}
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-[80vw] w-full h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
//               <DialogHeader className="p-6 border-b bg-slate-50 dark:bg-slate-900">
//                 <DialogTitle className="text-2xl font-bold">New {activeTab}</DialogTitle>
//                 <DialogDescription>Fill in the details to create a new record.</DialogDescription>
//               </DialogHeader>
//               <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950">
//                 {activeTab === "Customers" && <CustomerForm session={session} fetchCustomers={fetchCustomers} setCustomersData={setCustomersData} />}
//                 {activeTab === "Leads" && <LeadForm session={session} fetchDeals={fetchDeals} fetchLeads={fetchLeads} setLeadsData={setLeadsData} />}
//                 {activeTab === "Deals" && <DealForm fetchDeals={fetchDeals} session={session} products={products} setDealsData={setDealsData} />}
//               </div>
//             </DialogContent>
//           </Dialog>
//         </div>

//         {/* Board Container - Horizontal Scroll Added Here */}
//         <div className="flex-1 overflow-hidden">
//           {["Leads", "Deals", "Customers"].map((tab) => (
//             <TabsContent key={tab} value={tab} className="h-full m-0 focus-visible:outline-none">
//               {/* overflow-x-auto is the magic for left-right scroll */}
//               <div className="flex gap-4 h-full pb-4 overflow-x-auto custom-scrollbar items-start">
//                 {(tab === "Leads" ? normalizeStatuses(leadStatus) : tab === "Deals" ? normalizeStatuses(dealStatus) : normalizeStatuses(customerStatus)).map((status) => (
//                   <KanbanColumn key={status} title={status} count={(tab === "Leads" ? leadsData : tab === "Deals" ? dealsData : customersData).filter(i => i.status === status).length}>
//                     {(tab === "Leads" ? leadsData : tab === "Deals" ? dealsData : customersData).filter(i => i.status === status).map(item => (
//                       <AnimatedCard key={item.id} id={item.id}>
//                         {tab === "Leads" ? <LeadCard lead={item} fetchLeads={fetchLeads} fetchDeals={fetchDeals} /> :
//                           tab === "Deals" ? <DealCard deal={item} fetchDeals={fetchDeals} fetchCustomers={fetchCustomers} session={session} /> :
//                             <CustomerCard customer={item} onChange={fetchCustomers} />}
//                       </AnimatedCard>
//                     ))}
//                   </KanbanColumn>
//                 ))}
//               </div>
//             </TabsContent>
//           ))}
//         </div>
//       </Tabs>
//       <AgentActivity />
//     </div>
//   );
// }

// the above is helped by gemini

//previous versionb of tightly packed page , left right scroll missing here

{
  /* Replace all your TabsContent blocks (Leads, Deals, Customers) with this structure */
}
{
  /*
        <TabsContent value={activeTab} className="flex-1 min-h-0 m-0 overflow-hidden">
          <div className="flex gap-3 h-full pb-4 overflow-x-auto custom-scrollbar items-start">
      
        {getCurrentStatuses().map((status) => {
          const items = getCurrentData().filter((i) => i.status === status);
          return (
            <KanbanColumn key={status} title={status} count={items.length}>
              {items.map((item) => (
                <AnimatedCard key={item.id} id={item.id}>
                  {activeTab === "Leads" && <LeadCard lead={item} onChange={fetchLeads} fetchLeads={fetchLeads} fetchDeals={fetchDeals} />}
                  {activeTab === "Deals" && <DealCard deal={item} onChange={fetchDeals} fetchDeals={fetchDeals} fetchCustomers={fetchCustomers} session={session} />}
                  {activeTab === "Customers" && <CustomerCard customer={item} onChange={fetchCustomers} />}
                </AnimatedCard>
              ))}
            </KanbanColumn>
          );
        })}
    </div>
        </TabsContent >
 */
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRef } from "react";
// import Papa from "papaparse";
// import { Card, CardContent } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import LeadCard from "@/components/cards/LeadCard";
// import LeadForm from "@/components/forms/LeadForm";
// import CustomerCard from "@/components/cards/CustomerCard";
// import CustomerForm from "@/components/forms/CustomerForm";
// import DealCard from "@/components/cards/DealCard";
// import DealForm from "@/components/forms/DealForm";
// import AgentActivity from "@/components/agents/AgentActivity";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "@/components/ui/sheet";
// import { Users, TrendingUp, DollarSign, Search } from "lucide-react";
// import { toast } from "react-toastify";
// import { supabase } from "@/utils/supabase/client";
// import {
//   customerStatus,
//   dealStatus,
//   leadSources,
//   leadStatus,
//   monthFilters,
//   summaryStats,
// } from "@/constants/constant";
// import { redirect } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";

// export default function CRM() {
//   const [activeTab, setActiveTab] = useState("Leads");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("All statuses");
//   const [sourceFilter, setSourceFilter] = useState("All sources");
//   const [monthFilter, setMonthFilter] = useState("All time");
//   const [customersData, setCustomersData] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [session, setSession] = useState(null);
//   const [leadsData, setLeadsData] = useState([]);
//   const [dealsData, setDealsData] = useState([]);
//   const today = new Date();
//   const [userEmail, setUserEmail] = useState(null);
//   const [newCustomer, setNewCustomer] = useState({
//     name: "",
//     email: "",
//     number: "",
//   });

//   useEffect(() => {
//     const getSession = () => {
//       const sessionJSON = JSON.parse(localStorage.getItem("session"));
//       setSession(sessionJSON);
//       setUserEmail(sessionJSON.user.email);
//       setActiveTab(sessionStorage.getItem("activeTab") || "Customers");
//     };
//     const user = JSON.parse(localStorage.getItem("user"));

//     if (!user) {
//       redirect("/");
//     }
//     setProducts(
//       user?.products?.map((product) => ({
//         value: product.name,
//         label: product.name,
//       })) || [],
//     );

//     getSession();
//   }, []);

//   const fetchCustomers = async () => {
//     const { data: customersData } = await supabase
//       .from("Customers")
//       .select("*")
//       .eq("user_email", !userEmail ? "undefined" : userEmail)
//       .order("created_at", { ascending: false });
//     if (customersData) {
//       setCustomersData(customersData);
//     } else {
//       console.error("Error fetching customers");
//     }
//   };

//   const fetchLeads = async () => {
//     const { data: leadsData } = await supabase
//       .from("Leads")
//       .select("*")
//       .eq("user_email", !userEmail ? "undefined" : userEmail)
//       .order("created_at", { ascending: false });
//     if (leadsData) {
//       setLeadsData(leadsData);
//     } else {
//       console.error("Error fetching leads");
//     }
//   };

//   const fetchDeals = async () => {
//     const { data: dealsData } = await supabase
//       .from("Deals")
//       .select("*")
//       .eq("user_email", !userEmail ? "undefined" : userEmail)
//       .order("created_at", { ascending: false });
//     if (dealsData) {
//       setDealsData(dealsData);
//     } else {
//       console.error("Error fetching deals");
//     }
//   };

//   useEffect(() => {
//     if (userEmail) {
//       fetchCustomers();
//       fetchLeads();
//       fetchDeals();
//     }

//     const intervalId = setInterval(() => {
//       fetchCustomers();
//       fetchLeads();
//       fetchDeals();
//     }, 60000);

//     return () => clearInterval(intervalId);
//   }, [userEmail]);

//   const fileInputRef = useRef();

//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: async (results) => {
//         results.data.forEach((item) => {
//           item.user_email = userEmail;
//           item.created_at = today;
//         });

//         const { data, error } = await supabase
//           .from(activeTab)
//           .insert(results.data);
//         if (error) {
//           console.error("Error inserting data:", error);
//         } else {
//           toast.success("Data inserted successfully:", {
//             position: "top-right",
//             autoClose: 3000,
//           });
//         }
//       },
//     });
//   };

//   const SummaryCard = ({ title, total, subtitle, growth, icon: Icon }) => (
//     <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
//       <CardContent className="p-6">
//         <div className="flex items-center justify-between">
//           <div>
//             <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
//               {title}
//             </p>
//             <p className="text-2xl font-bold text-slate-900 dark:text-white">
//               {total}
//             </p>
//             {subtitle && (
//               <p className="text-sm text-slate-600 dark:text-slate-400">
//                 {subtitle}
//               </p>
//             )}
//           </div>
//           <div className="flex flex-col items-end">
//             <Icon className="h-8 w-8 text-blue-500 mb-2" />
//             <div className="flex items-center text-sm text-green-600">
//               <TrendingUp className="h-4 w-4 mr-1" />+{growth}%
//             </div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
//   const sum = dealsData.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
//   const handleAddCustomer = async () => {
//     if (!newCustomer.name) return;

//     const { data, error } = await supabase
//       .from("Customers")
//       .insert([
//         {
//           ...newCustomer,
//           user_email: userEmail,
//           created_at: new Date(),
//         },
//       ])
//       .select();

//     if (!error && data) {
//       setCustomersData((prev) => [data[0], ...prev]);
//       setNewCustomer({ name: "", email: "", number: "" });
//       toast.success("Customer added");
//     }
//   };
//   const formatNumber = (num) => {
//     if (num >= 1_000_000_000_000) {
//       return (num / 1_000_000_000_000).toFixed(2) + "T";
//     } else if (num >= 1_000_000_000) {
//       return (num / 1_000_000_000).toFixed(2) + "B";
//     } else if (num >= 1_000_000) {
//       return (num / 1_000_000).toFixed(2) + "M";
//     } else if (num >= 1_000) {
//       return (num / 1_000).toFixed(2) + "K";
//     } else {
//       return num.toString();
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col sm:flex-row sm:justify-left sm:items-center">
//         <div>
//           <h1 className="text-3xl md:text-4xl font-bold flex items-start  bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
//             CRM Dashboard
//           </h1>
//           <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
//             Manage customers, leads, and deals with comprehensive filtering
//           </p>
//         </div>

//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
//         <SummaryCard
//           title="On-boarded Customers"
//           total={customersData.length}
//           subtitle={`${
//             customersData.filter((cust) => {
//               const createdAt = new Date(cust.created_at);
//               const now = new Date();
//               return (
//                 createdAt.getMonth() === now.getMonth() &&
//                 createdAt.getFullYear() === now.getFullYear()
//               );
//             }).length
//           } new this month`}
//           growth={summaryStats.customers.growth}
//           icon={Users}
//         />
//         <SummaryCard
//           title="Active Leads"
//           total={leadsData.length}
//           subtitle={`${
//             leadsData.filter((lead) => lead.status === "Qualified").length
//           } qualified`}
//           growth={summaryStats.leads.growth}
//           icon={TrendingUp}
//         />

//         <SummaryCard
//           title="Active Deals"
//           total={formatNumber(sum)}
//           subtitle={`${dealsData.length} deals • ${
//             dealsData.filter((deal) => deal.status === "Closed-won").length
//           } won`}
//           growth={summaryStats.deals.growth}
//           icon={DollarSign}
//         />
//       </div>
//       {/* 🔍 SEARCH BAR (NOW ABOVE) */}
//       <Card className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
//         <CardContent>
//           <div className="flex w-full gap-3 flex-col md:flex-row justify-between items-center h-auto">
//             {/* Search */}
//             <div className="relative w-full">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
//               <Input
//                 placeholder="Search..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10 bg-white dark:bg-slate-800/50 border-black/20 dark:border-slate-700/50"
//               />
//             </div>

//             {/* Status Filter */}
//             <Select value={statusFilter} onValueChange={setStatusFilter}>
//               <SelectTrigger className="bg-white dark:bg-slate-800/50 border-black/20 cursor-pointer dark:border-slate-700/50 w-full md:w-[180px]">
//                 <SelectValue placeholder="Filter by status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="All statuses">All statuses</SelectItem>
//               </SelectContent>
//             </Select>

//             {/* Upload CSV Button */}
//             <Sheet>
//               <SheetTrigger asChild>
//                 <Button className="bg-gradient-to-r px-3 py-2 rounded-xl from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white w-full md:w-auto cursor-pointer whitespace-nowrap">
//                   Upload {activeTab} CSV
//                 </Button>
//               </SheetTrigger>
//               <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 mb-6">
//                 <SheetHeader>
//                   <SheetTitle>Upload {activeTab} CSV</SheetTitle>
//                   <SheetDescription>
//                     <>
//                       <div
//                         className={`${activeTab == "Customers" ? "grid" : "hidden"} p-3 grid-cols-1 md:grid-cols-2 gap-4`}
//                       >
//                         <div>
//                           <h3 className="font-semibold text-lg mb-2">
//                             📄 CSV Format Requirements
//                           </h3>
//                           <ul className="list-disc pl-5 space-y-1 text-sm text-slate-900 dark:text-slate-400">
//                             <li>
//                               Required Columns:
//                               <ul className="list-disc pl-5 mt-1 space-y-1">
//                                 <li>
//                                   <b>name</b>
//                                 </li>
//                                 <li>
//                                   <b>number</b>
//                                 </li>
//                                 <li>
//                                   <b>email</b>
//                                 </li>
//                                 <li>
//                                   <b>status</b>
//                                 </li>
//                               </ul>
//                             </li>
//                             <li>
//                               Optional Columns:
//                               <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-900 dark:text-slate-400">
//                                 <li>address</li>
//                                 <li>website</li>
//                                 <li>industry</li>
//                                 <li>linkedIn</li>
//                                 <li>price</li>
//                                 <li>issues</li>
//                               </ul>
//                             </li>
//                           </ul>
//                           <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
//                             💡 <span className="font-semibold">Tip:</span>{" "}
//                             Download our template to ensure your CSV is properly
//                             formatted for import.
//                           </div>
//                         </div>
//                         <div className="gap-4 md:space-y-6">
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               📥 Download Template
//                             </h3>
//                             <Button
//                               variant="outline"
//                               onClick={() =>
//                                 window.open("/templates/customer_template.xlsx")
//                               }
//                             >
//                               Download Sample Excel
//                             </Button>
//                           </div>
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               📂 Select CSV File
//                             </h3>
//                             <Button
//                               onClick={() => fileInputRef.current.click()}
//                               className="bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white cursor-pointer"
//                             >
//                               Choose File
//                             </Button>
//                             <input
//                               type="file"
//                               accept=".csv"
//                               ref={fileInputRef}
//                               onChange={handleFileUpload}
//                               className="hidden"
//                             />
//                           </div>
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               💡 Pro Tips
//                             </h3>
//                             <ul className="list-disc pl-5 space-y-1 text-sm text-slate-900 dark:text-slate-400">
//                               <li>Double-check for typos before uploading.</li>
//                               <li>
//                                 Keep file size under 5MB for faster uploads.
//                               </li>
//                               <li>
//                                 Ensure phone numbers are in international
//                                 format.
//                               </li>
//                             </ul>
//                           </div>
//                         </div>
//                       </div>

//                       <div
//                         className={`${activeTab == "Leads" ? "grid" : "hidden"} p-3 grid-cols-1 md:grid-cols-2 gap-4`}
//                       >
//                         <div>
//                           <h3 className="font-semibold text-lg mb-2">
//                             📄 CSV Format Requirements
//                           </h3>
//                           <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
//                             <li>
//                               Required Columns:
//                               <ul className="list-disc pl-5 mt-1 space-y-1">
//                                 <li>
//                                   <b>name</b>
//                                 </li>
//                                 <li>
//                                   <b>number</b>
//                                 </li>
//                                 <li>
//                                   <b>status</b>
//                                 </li>
//                               </ul>
//                             </li>
//                             <li>
//                               Optional Columns:
//                               <ul className="list-disc pl-5 mt-1 space-y-1">
//                                 <li>email</li>
//                                 <li>age</li>
//                                 <li>industry</li>
//                                 <li>company</li>
//                                 <li>income</li>
//                                 <li>address</li>
//                                 <li>linkedIn</li>
//                                 <li>description</li>
//                                 <li>website</li>
//                                 <li>source</li>
//                               </ul>
//                             </li>
//                           </ul>
//                           <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
//                             💡 <span className="font-semibold">Tip:</span>{" "}
//                             Download our template to ensure your CSV is properly
//                             formatted for import.
//                           </div>
//                         </div>
//                         <div className="gap-4 md:space-y-6">
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               📥 Download Template
//                             </h3>
//                             <Button
//                               variant="outline"
//                               onClick={() =>
//                                 window.open("/templates/leads_template.xlsx")
//                               }
//                             >
//                               Download Sample Excel
//                             </Button>
//                           </div>
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               📂 Select CSV File
//                             </h3>
//                             <Button
//                               onClick={() => fileInputRef.current.click()}
//                               className="bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white"
//                             >
//                               Choose File
//                             </Button>
//                             <input
//                               type="file"
//                               accept=".csv"
//                               ref={fileInputRef}
//                               onChange={handleFileUpload}
//                               className="hidden"
//                             />
//                           </div>
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               💡 Pro Tips
//                             </h3>
//                             <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
//                               <li>Double-check for typos before uploading.</li>
//                               <li>
//                                 Keep file size under 5MB for faster uploads.
//                               </li>
//                               <li>
//                                 Ensure phone numbers are in international
//                                 format.
//                               </li>
//                             </ul>
//                           </div>
//                         </div>
//                       </div>

//                       <div
//                         className={`${activeTab == "Deals" ? "grid" : "hidden"} p-3 grid-cols-1 md:grid-cols-2 gap-4`}
//                       >
//                         <div>
//                           <h3 className="font-semibold text-lg mb-2">
//                             📄 CSV Format Requirements
//                           </h3>
//                           <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
//                             <li>
//                               Required Columns:
//                               <ul className="list-disc pl-5 mt-1 space-y-1">
//                                 <li>
//                                   <b>name</b>
//                                 </li>
//                                 <li>
//                                   <b>title</b>
//                                 </li>
//                                 <li>
//                                   <b>number</b>
//                                 </li>
//                                 <li>
//                                   <b>email</b>
//                                 </li>
//                                 <li>
//                                   <b>status</b>
//                                 </li>
//                                 <li>
//                                   <b>value</b>
//                                 </li>
//                               </ul>
//                             </li>
//                             <li>
//                               Optional Columns:
//                               <ul className="list-disc pl-5 mt-1 space-y-1">
//                                 <li>owner</li>
//                                 <li>source</li>
//                                 <li>priority</li>
//                                 <li>closeDate</li>
//                               </ul>
//                             </li>
//                           </ul>
//                           <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
//                             💡 <span className="font-semibold">Tip:</span>{" "}
//                             Download our template to ensure your CSV is properly
//                             formatted for import.
//                           </div>
//                         </div>
//                         <div className="gap-4 md:space-y-6">
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               📥 Download Template
//                             </h3>
//                             <Button
//                               variant="outline"
//                               onClick={() =>
//                                 window.open("/templates/deals_template.xlsx")
//                               }
//                             >
//                               Download Sample Excel
//                             </Button>
//                           </div>
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               📂 Select CSV File
//                             </h3>
//                             <Button
//                               onClick={() => fileInputRef.current.click()}
//                               className="bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white"
//                             >
//                               Choose File
//                             </Button>
//                             <input
//                               type="file"
//                               accept=".csv"
//                               ref={fileInputRef}
//                               onChange={handleFileUpload}
//                               className="hidden"
//                             />
//                           </div>
//                           <div>
//                             <h3 className="font-semibold text-lg mb-2">
//                               💡 Pro Tips
//                             </h3>
//                             <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
//                               <li>Double-check for typos before uploading.</li>
//                               <li>
//                                 Keep file size under 5MB for faster uploads.
//                               </li>
//                               <li>
//                                 Ensure phone numbers are in international
//                                 format.
//                               </li>
//                             </ul>
//                           </div>
//                         </div>
//                       </div>
//                     </>
//                   </SheetDescription>
//                 </SheetHeader>
//               </SheetContent>
//             </Sheet>

//             {/* Add New Button */}
//             <Sheet>
//               <SheetTrigger asChild>
//                 <Button className="bg-gradient-to-r px-3 py-2 rounded-xl from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white w-full md:w-auto whitespace-nowrap">
//                   Add New {activeTab}
//                 </Button>
//               </SheetTrigger>
//               <SheetContent className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 mb-6">
//                 <SheetHeader>
//                   <SheetTitle>Add New {activeTab}</SheetTitle>
//                   <SheetDescription>
//                     <>
//                       {activeTab === "Customers" && (
//                         <CustomerForm
//                           session={session}
//                           fetchCustomers={fetchCustomers}
//                           setCustomersData={setCustomersData}
//                         />
//                       )}
//                       {activeTab === "Leads" && (
//                         <LeadForm
//                           session={session}
//                           fetchDeals={fetchDeals}
//                           fetchLeads={fetchLeads}
//                           setLeadsData={setLeadsData}
//                         />
//                       )}
//                       {activeTab === "Deals" && (
//                         <DealForm
//                           fetchDeals={fetchDeals}
//                           session={session}
//                           products={products}
//                           setDealsData={setDealsData}
//                         />
//                       )}
//                     </>
//                   </SheetDescription>
//                 </SheetHeader>
//               </SheetContent>
//             </Sheet>
//           </div>
//         </CardContent>
//       </Card>
//       {/* 🔥 TABS BELOW */}
//       <Tabs
//         value={activeTab}
//         onValueChange={(e) => {
//           setActiveTab(e);
//           sessionStorage.setItem("activeTab", e);
//         }}
//         className="space-y-6"
//       ></Tabs>
//       <Tabs
//         value={activeTab}
//         onValueChange={(e) => {
//           setActiveTab(e);
//           sessionStorage.setItem("activeTab", e);
//         }}
//         className="space-y-6"
//       >
//         <TabsList className="flex gap-3 w-full bg-transparent border-none">
//           <TabsTrigger
//             value="Leads"
//             className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium
//     data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-700 data-[state=active]:to-teal-500
//     data-[state=active]:text-white
//     bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300
//     hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
//           >
//             <TrendingUp className="w-4 h-4" />
//             Leads
//           </TabsTrigger>

//           <TabsTrigger
//             value="Deals"
//             className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium
//     data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-700 data-[state=active]:to-teal-500
//     data-[state=active]:text-white
//     bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300
//     hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
//           >
//             <DollarSign className="w-4 h-4" />
//             Deals
//           </TabsTrigger>

//           <TabsTrigger
//             value="Customers"
//             className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium
//     data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-700 data-[state=active]:to-teal-500
//     data-[state=active]:text-white
//     bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300
//     hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
//           >
//             <Users className="w-4 h-4" />
//             Customers
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="Customers" className="space-y-6">
//           <div className="flex flex-col gap-4">
//             <AnimatePresence>
//               {customersData
//                 .filter((customer) => {
//                   const matchesStatus =
//                     statusFilter === "All statuses" ||
//                     customer.status === statusFilter;

//                   const matchesSearch =
//                     customer.name
//                       ?.toLowerCase()
//                       .includes(searchTerm.toLowerCase()) ||
//                     customer.email
//                       ?.toLowerCase()
//                       .includes(searchTerm.toLowerCase()) ||
//                     customer.number?.toString().includes(searchTerm);

//                   return matchesStatus && matchesSearch;
//                 })
//                 .map((customer) => (
//                   <motion.div
//                     key={customer.id}
//                     initial={{ opacity: 0, y: 40 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -20 }}
//                     transition={{ duration: 0.3 }}
//                   >
//                     <CustomerCard
//                       customer={customer}
//                       onChange={fetchCustomers}
//                     />
//                   </motion.div>
//                 ))}
//             </AnimatePresence>
//           </div>
//         </TabsContent>

//         <TabsContent value="Leads" className="space-y-6">
//           <div className="flex flex-col gap-4">
//             {leadsData
//               .filter((lead) => {
//                 const matchesStatus =
//                   statusFilter === "All statuses" ||
//                   lead.status === statusFilter;

//                 const matchesSearch =
//                   lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                   lead.email
//                     ?.toLowerCase()
//                     .includes(searchTerm.toLowerCase()) ||
//                   lead.number?.toString().includes(searchTerm);

//                 return matchesStatus && matchesSearch;
//               })
//               .map((lead) => (
//                 <LeadCard
//                   key={lead.id}
//                   lead={lead}
//                   onChange={fetchLeads}
//                   fetchLeads={fetchLeads}
//                   fetchDeals={fetchDeals}
//                 />
//               ))}
//           </div>
//         </TabsContent>

//         <TabsContent value="Deals" className="space-y-6">
//           <div className="flex flex-col gap-4">
//             {dealsData
//               .filter((deal) => {
//                 const matchesStatus =
//                   statusFilter === "All statuses" ||
//                   deal.status === statusFilter;

//                 const matchesSearch =
//                   deal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                   deal.email
//                     ?.toLowerCase()
//                     .includes(searchTerm.toLowerCase()) ||
//                   deal.number?.toString().includes(searchTerm) ||
//                   deal.title?.toLowerCase().includes(searchTerm.toLowerCase());

//                 return matchesStatus && matchesSearch;
//               })
//               .map((deal) => (
//                 <DealCard
//                   key={deal.id}
//                   deal={deal}
//                   onChange={fetchDeals}
//                   fetchDeals={fetchDeals}
//                   fetchCustomers={fetchCustomers}
//                   session={session}
//                 />
//               ))}
//           </div>
//         </TabsContent>
//       </Tabs>

//       <AgentActivity />
//     </div>
//   );
// }

{
  /* <div className="flex sm:flex-col py-5 md:py-0 md:flex-row md:ml-auto gap-2 mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="bg-gradient-to-r px-3 py-2 rounded-xl from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white w-full md:ml-5 cursor-pointer">
                Upload {activeTab} CSV
              </Button>
            </SheetTrigger>
            <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 mb-6">
              <SheetHeader>
                <SheetTitle>Upload {activeTab} CSV</SheetTitle>
                <SheetDescription>
                  <>
                    <div
                      className={`${
                        activeTab == "Customers" ? "grid" : "hidden"
                      } p-3 grid-cols-1 md:grid-cols-2 gap-4`}
                    >
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          📄 CSV Format Requirements
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-900 dark:text-slate-400">
                          <li>
                            Required Columns:
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              <li>
                                <b>name</b>
                              </li>
                              <li>
                                <b>number</b>
                              </li>
                              <li>
                                <b>email</b>
                              </li>
                              <li>
                                <b>status</b>
                              </li>
                            </ul>
                          </li>
                          <li>
                            Optional Columns:
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-900 dark:text-slate-400">
                              <li>address</li>
                              <li>website</li>
                              <li>industry</li>
                              <li>linkedIn</li>
                              <li>price</li>
                              <li>issues</li>
                            </ul>
                          </li>
                        </ul>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
                          💡 <span className="font-semibold">Tip:</span>{" "}
                          Download our template to ensure your CSV is properly
                          formatted for import.
                        </div>
                      </div>

                      <div className="gap-4 md:space-y-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            📥 Download Template
                          </h3>
                          <Button
                            variant="outline"
                            onClick={() =>
                              window.open("/templates/customer_template.xlsx")
                            }
                          >
                            Download Sample Excel
                          </Button>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            📂 Select CSV File
                          </h3>
                          <Button
                            onClick={() => fileInputRef.current.click()}
                            className="bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white cursor-pointer"
                          >
                            Choose File
                          </Button>
                          <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            💡 Pro Tips
                          </h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-900 dark:text-slate-400">
                            <li>Double-check for typos before uploading.</li>
                            <li>
                              Keep file size under 5MB for faster uploads.
                            </li>
                            <li>
                              Ensure phone numbers are in international format.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`${
                        activeTab == "Leads" ? "grid" : "hidden"
                      } p-3 grid-cols-1 md:grid-cols-2 gap-4`}
                    >
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          📄 CSV Format Requirements
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                          <li>
                            Required Columns:
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              <li>
                                <b>name</b>
                              </li>
                              <li>
                                <b>number</b>
                              </li>
                              <li>
                                <b>status</b>
                              </li>
                            </ul>
                          </li>
                          <li>
                            Optional Columns:
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              <li>email</li>
                              <li>age</li>
                              <li>industry</li>
                              <li>company</li>
                              <li>income</li>
                              <li>address</li>
                              <li>linkedIn</li>
                              <li>description</li>
                              <li>website</li>
                              <li>source</li>
                            </ul>
                          </li>
                        </ul>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
                          💡 <span className="font-semibold">Tip:</span>{" "}
                          Download our template to ensure your CSV is properly
                          formatted for import.
                        </div>
                      </div>

                      <div className="gap-4 md:space-y-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            📥 Download Template
                          </h3>
                          <Button
                            variant="outline"
                            onClick={() =>
                              window.open("/templates/leads_template.xlsx")
                            }
                          >
                            Download Sample Excel
                          </Button>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            📂 Select CSV File
                          </h3>
                          <Button
                            onClick={() => fileInputRef.current.click()}
                            className="bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white"
                          >
                            Choose File
                          </Button>
                          <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            💡 Pro Tips
                          </h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                            <li>Double-check for typos before uploading.</li>
                            <li>
                              Keep file size under 5MB for faster uploads.
                            </li>
                            <li>
                              Ensure phone numbers are in international format.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`${
                        activeTab == "Deals" ? "grid" : "hidden"
                      } p-3 grid-cols-1 md:grid-cols-2 gap-4`}
                    >
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          📄 CSV Format Requirements
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                          <li>
                            Required Columns:
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              <li>
                                <b>name</b>
                              </li>
                              <li>
                                <b>title</b>
                              </li>
                              <li>
                                <b>number</b>
                              </li>
                              <li>
                                <b>email</b>
                              </li>
                              <li>
                                <b>status</b>
                              </li>
                              <li>
                                <b>value</b>
                              </li>
                            </ul>
                          </li>
                          <li>
                            Optional Columns:
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              <li>owner</li>
                              <li>source</li>
                              <li>priority</li>
                              <li>closeDate</li>
                            </ul>
                          </li>
                        </ul>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4 text-sm text-blue-700">
                          💡 <span className="font-semibold">Tip:</span>{" "}
                          Download our template to ensure your CSV is properly
                          formatted for import.
                        </div>
                      </div>

                      <div className="gap-4 md:space-y-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            📥 Download Template
                          </h3>
                          <Button
                            variant="outline"
                            onClick={() =>
                              window.open("/templates/deals_template.xlsx")
                            }
                          >
                            Download Sample Excel
                          </Button>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            📂 Select CSV File
                          </h3>
                          <Button
                            onClick={() => fileInputRef.current.click()}
                            className="bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white"
                          >
                            Choose File
                          </Button>
                          <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            💡 Pro Tips
                          </h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                            <li>Double-check for typos before uploading.</li>
                            <li>
                              Keep file size under 5MB for faster uploads.
                            </li>
                            <li>
                              Ensure phone numbers are in international format.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div> */
}

{
  /* <Sheet>
          <SheetTrigger asChild>
            <Button className="bg-gradient-to-r px-3 py-2 rounded-xl from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white md:ml-5">
              Add New {activeTab}
            </Button>
          </SheetTrigger>
          <SheetContent className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 mb-6">
            <SheetHeader>
              <SheetTitle>Add New {activeTab}</SheetTitle>
              <SheetDescription>
                <>
                  {activeTab === "Customers" && (
                    <CustomerForm
                      session={session}
                      fetchCustomers={fetchCustomers}
                      setCustomersData={setCustomersData}
                    />
                  )}
                  {activeTab === "Leads" && (
                    <LeadForm
                      session={session}
                      fetchDeals={fetchDeals}
                      fetchLeads={fetchLeads}
                      setLeadsData={setLeadsData}
                    />
                  )}
                  {activeTab === "Deals" && (
                    <DealForm
                      fetchDeals={fetchDeals}
                      session={session}
                      products={products}
                      setDealsData={setDealsData}
                    />
                  )}
                </>
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet> */
}

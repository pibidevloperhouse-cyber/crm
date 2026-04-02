"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  Trophy,
  Calendar,
  Phone,
  DollarSign,
  PieChart,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { round } from "lodash";
import { redirect } from "next/navigation";
import { Switch } from "@/components/ui/switch";

export default function Home() {
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const fetchTheme = () => {
      const theme = localStorage.getItem("theme");
      if (theme !== null) {
        setDarkMode(theme === "false");
      }
    };

    fetchTheme();

    const intervalId = setInterval(() => {
      fetchTheme();
    }, 200);

    return () => clearInterval(intervalId);
  }, [setDarkMode]);

  const fetchData = async () => {
    const { data: leadsData, error: leadsError } = await supabase
      .from("Leads")
      .select("*")
      .eq("user_email", userEmail);
    const { data: dealsData, error: dealsError } = await supabase
      .from("Deals")
      .select("*")
      .eq("user_email", userEmail);
    const { data: customersData, error: customersError } = await supabase
      .from("Customers")
      .select("*")
      .eq("user_email", userEmail);
    if (leadsError) console.error("Error fetching leads:", leadsError);
    if (dealsError) console.error("Error fetching deals:", dealsError);
    if (customersError)
      console.error("Error fetching customers:", customersError);
    setLeads(leadsData);
    setDeals(dealsData);
    setCustomers(customersData);
  };
  const [customers, setCustomers] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const getSession = () => {
      const sessionJSON = JSON.parse(localStorage.getItem("session"));
      if (sessionJSON == null) {
        redirect("/");
      }
      setUserEmail(sessionJSON.user.email);
      setUserName(JSON.parse(localStorage.getItem("user")).name);
    };

    getSession();
  }, []);

  const fetchCustomers = async () => {
    const { data: customersData } = await supabase
      .from("Customers")
      .select("*")
      .eq("user_email", !userEmail ? "undefined" : userEmail)
      .order("created_at", { ascending: false });
    if (customersData) {
      setCustomers(customersData);
    } else {
      console.error("Error fetching customers");
    }
  };

  const fetchLeads = async () => {
    const { data: leadsData } = await supabase
      .from("Leads")
      .select("*")
      .eq("user_email", !userEmail ? "undefined" : userEmail)
      .order("created_at", { ascending: false });
    if (leadsData) {
      setLeads(leadsData);
    } else {
      console.error("Error fetching leads");
    }
  };

  const fetchDeals = async () => {
    const { data: dealsData } = await supabase
      .from("Deals")
      .select("*")
      .eq("user_email", !userEmail ? "undefined" : userEmail)
      .order("created_at", { ascending: false });
    if (dealsData) {
      setDeals(dealsData);
    } else {
      console.error("Error fetching deals");
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchCustomers();
      fetchLeads();
      fetchDeals();
    }

    const intervalId = setInterval(() => {
      fetchCustomers();
      fetchLeads();
      fetchDeals();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [userEmail]);

  const QualifiedLeads = leads.filter(
    (lead) => lead.status === "Qualified"
  ).length;

  const onboardingData = {
    rate:
      leads?.length != 0
        ? round(((QualifiedLeads || 0) / leads.length) * 100, 2)
        : 0,
    change: 12,
  };

  const customerEmails = new Set(customers.map((c) => c.email));
  const commonEmails = leads
    .filter((lead) => customerEmails.has(lead.email))
    .map((lead) => lead.email);

  const leadsData = { converted: commonEmails.length, change: +8 };

  const dealsWon = deals.filter((deal) => deal.status === "Closed-won").length;
  const dealsData = { won: dealsWon, change: +15 };

  const totalDeals = deals?.length || 0;

  const dealStatuses = [
    { name: "New", status: "New", color: "bg-red-500" },
    { name: "Proposal Sent", status: "Proposal Sent", color: "bg-yellow-500" },
    { name: "Negotiation", status: "Negotiation", color: "bg-blue-500" },
    { name: "Closed Won", status: "Closed-won", color: "bg-green-500" },
    { name: "Closed Lost", status: "Closed-lost", color: "bg-gray-500" },
    {
      name: "Meeting Booked",
      status: "Meeting Booked",
      color: "bg-purple-500",
    },
    { name: "On Hold", status: "On-hold", color: "bg-pink-500" },
    { name: "Abandoned", status: "Abandoned", color: "bg-orange-500" },
  ];

  const dealClassification = dealStatuses.map(({ name, status, color }) => {
    const value = deals.filter((deal) => deal.status === status).length;
    const rate = totalDeals > 0 ? round((value / totalDeals) * 100, 2) : 0;

    return { name, value, rate, color };
  });

  const sourceCount = leads?.reduce((acc, { source }) => {
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const leadSources = [
    "External referral",
    "Chat",
    "Facebook",
    "X(Twitter)",
    "Public relations",
  ].map((name) => ({
    name,
    value: sourceCount?.[name] || 0,
  }));

  const revenueData = [
    { month: "Jan", revenue: 45000, deals: 12 },
    { month: "Feb", revenue: 52000, deals: 15 },
    { month: "Mar", revenue: 48000, deals: 13 },
    { month: "Apr", revenue: 61000, deals: 18 },
    { month: "May", revenue: 55000, deals: 16 },
    { month: "Jun", revenue: 67000, deals: 19 },
  ];

  const upcomingMeetings = [
    { time: "10:00 AM", client: "Acme Corp", type: "Demo" },
    { time: "2:30 PM", client: "TechStart Inc", type: "Follow-up" },
    { time: "4:00 PM", client: "Global Solutions", type: "Proposal" },
  ];

  const activeDeals = [
    { company: "Enterprise Co", value: "$45,000", stage: "Negotiation" },
    { company: "StartupXYZ", value: "$12,000", stage: "Proposal" },
    { company: "MegaCorp", value: "$89,000", stage: "Demo" },
  ];

  const priorityTasks = [
    { task: "Follow up with Enterprise Co", priority: "high" },
    { task: "Prepare demo for TechStart", priority: "medium" },
    { task: "Update CRM records", priority: "low" },
    { task: "Send proposal to MegaCorp", priority: "high" },
  ];
  const [chartsMode, setChartsMode] = useState("graphic");

  const MetricCard = ({ title, value, change, icon: Icon }) => (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 hover:bg-white/20 dark:hover:bg-slate-800/60 transition-all duration-300 cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {value}
              {title.includes("rate") || title.includes("Rate") ? "%" : ""}
            </p>
            {/* <p
              className={cn(
                "text-sm flex items-center mt-1",
                change > 0 ? "text-green-600" : "text-red-600"
              )}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              {change > 0 ? "+" : ""}
              {change}% from last month
            </p> */}
          </div>
          <Icon className="h-8 w-8 text-[#25C2A0] group-hover:text-[#235d76] group-hover:scale-110 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );

  const PieChartSVG = () => {
    const total = dealClassification.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    const colors = {
      "bg-red-500": "#ef4444",
      "bg-yellow-500": "#eab308",
      "bg-blue-500": "#3b82f6",
      "bg-green-500": "#10b981",
      "bg-orange-500": "#f97316",
      "bg-purple-500": "#a855f7",
      "bg-pink-500": "#ec4899",
      "bg-gray-500": "#6b7280",
    };

    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="shrink-0">
          <svg
            width="160"
            height="160"
            viewBox="0 0 200 200"
            className="mx-auto"
          >
            {dealClassification.map((item, index) => {
              const percentage = item.value / total;
              const startAngle = cumulativePercentage * 360;
              const endAngle = (cumulativePercentage + percentage) * 360;

              cumulativePercentage += percentage;

              const startAngleRad = (startAngle - 90) * (Math.PI / 180);
              const endAngleRad = (endAngle - 90) * (Math.PI / 180);

              const largeArcFlag = percentage > 0.5 ? 1 : 0;

              const x1 = 100 + 80 * Math.cos(startAngleRad);
              const y1 = 100 + 80 * Math.sin(startAngleRad);
              const x2 = 100 + 80 * Math.cos(endAngleRad);
              const y2 = 100 + 80 * Math.sin(endAngleRad);
              const x3 = 100 + 50 * Math.cos(endAngleRad);
              const y3 = 100 + 50 * Math.sin(endAngleRad);
              const x4 = 100 + 50 * Math.cos(startAngleRad);
              const y4 = 100 + 50 * Math.sin(startAngleRad);

              const outerR = 80;
              const innerR = 50;

              // Outer arc start/end (same as before)
              const pathData = [
                "M",
                x1,
                y1, // start outer arc
                "A",
                outerR,
                outerR,
                0,
                largeArcFlag,
                1,
                x2,
                y2, // outer arc
                "L",
                x3,
                y3, // line to inner arc start
                "A",
                innerR,
                innerR,
                0,
                largeArcFlag,
                0,
                x4,
                y4, // inner arc (reverse direction)
                "Z",
              ].join(" ");

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[item.color]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-center">
          {dealClassification.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className={cn("w-3 h-3 rounded-full", item.color)}></div>
              <span className="text-xs font-medium whitespace-nowrap">
                {item.name}: {item.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChartSVG = () => {
    const maxValue = Math.max(...leadSources.map((s) => s.value));

    return (
      <div className="h-64">
        <svg width="100%" height="100%" viewBox="0 0 400 240">
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#16699d" />
              <stop offset="100%" stopColor="#57bba9" />
            </linearGradient>
          </defs>

          {leadSources.map((source, index) => {
            // prevent division by zero
            const barHeight =
              maxValue > 0 ? (source.value / maxValue) * 160 : 0;

            const barWidth = 50;
            const x = index * 75 + 25;
            const y = 180 - barHeight;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
                <text
                  x={x + barWidth / 2}
                  y={200}
                  textAnchor="middle"
                  className="text-xs fill-slate-600 dark:fill-slate-400"
                  fontSize="10"
                >
                  {source.name}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs font-medium fill-slate-900 dark:fill-white"
                  fontSize="10"
                >
                  {source.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const LineHistogramChart = () => {
    const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));
    const maxDeals = Math.max(...revenueData.map((d) => d.deals));

    return (
      <div className="h-64">
        <svg width="100%" height="100%" viewBox="0 0 600 240">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {revenueData.map((month, index) => {
            const barHeight = (month.deals / maxDeals) * 80;
            const barWidth = 25;
            const x = index * 90 + 40;
            const y = 180 - barHeight;

            return (
              <rect
                key={`bar-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="rgba(139, 92, 246, 0.4)"
                className="hover:fill-purple-500/60 transition-all cursor-pointer"
              />
            );
          })}

          <path
            d={revenueData
              .map((month, index) => {
                const x = index * 90 + 52.5;
                const y = 160 - (month.revenue / maxRevenue) * 120;
                return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
              })
              .join(" ")}
            stroke="url(#lineGradient)"
            strokeWidth="3"
            fill="none"
            className="drop-shadow-sm"
          />

          {revenueData.map((month, index) => {
            const x = index * 90 + 52.5;
            const y = 160 - (month.revenue / maxRevenue) * 120;
            return (
              <circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r="4"
                fill="#3b82f6"
                className="hover:r-6 transition-all cursor-pointer"
              />
            );
          })}

          {revenueData.map((month, index) => (
            <text
              key={`label-${index}`}
              x={index * 90 + 52.5}
              y={200}
              textAnchor="middle"
              className="text-xs fill-slate-600 dark:fill-slate-400"
              fontSize="10"
            >
              {month.month}
            </text>
          ))}

          <g transform="translate(20, 20)">
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <text
              x="25"
              y="8"
              className="text-xs fill-slate-600 dark:fill-slate-400"
              fontSize="10"
            >
              Revenue
            </text>
            <rect
              x="80"
              y="0"
              width="15"
              height="8"
              fill="rgba(139, 92, 246, 0.4)"
            />
            <text
              x="100"
              y="8"
              className="text-xs fill-slate-600 dark:fill-slate-400"
              fontSize="10"
            >
              Deals
            </text>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#E9FDF9] via-[#C8F4EE] to-[#B2E8F7] p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-start  bg-linear-to-r from-[#25C2A0] via-[#266d61] to-[#235d76] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
            {/* <Wallet className="w-8 h-8 text-transparent bg-gradient-to-r from-[#25C2A0] via-[#2AD4B7] to-[#38BDF8] bg-clip-text" /> */}
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Welcome back, {userName}! Here's your GTM overview.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-white/20 rounded-lg px-4 py-2">
          <Switch
            checked={chartsMode === "graphic"}
            onCheckedChange={() =>
              setChartsMode(chartsMode === "graphic" ? "numeric" : "graphic")
            }
          />
          <span className="hidden sm:inline">
            {chartsMode === "graphic" ? "Graphic Mode" : "Numeric Mode"}
          </span>
          <span className="sm:hidden">
            {chartsMode === "graphic" ? "Graphic" : "Numeric"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <MetricCard
          className="bg-white/20"
          title="Onboarding Rate"
          value={onboardingData.rate}
          change={onboardingData.change}
          icon={Users}
        />
        <MetricCard
          title="Leads Converted"
          value={leadsData.converted}
          change={leadsData.change}
          icon={TrendingUp}
        />
        <MetricCard
          title="Deals Won"
          value={dealsData.won}
          change={dealsData.change}
          icon={Trophy}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Deal Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartsMode === "graphic" ? (
              <PieChartSVG />
            ) : (
              <div className="space-y-2">
                {dealClassification.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xl font-bold">{item.rate}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Customer Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartsMode === "graphic" ? (
              <BarChartSVG />
            ) : (
              <div className="space-y-2">
                {leadSources.map((source, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                  >
                    <span className="font-medium">{source.name}</span>
                    <span className="text-xl font-bold">{source.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Revenue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartsMode === "graphic" ? (
            <LineHistogramChart />
          ) : (
            <div className="space-y-2">
              {revenueData.map((month, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                >
                  <span className="font-medium">{month.month}</span>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ${month.revenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {month.deals} deals
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2  gap-4 sm:gap-6">
        <Card className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.map((meeting, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 rounded-lg bg-white/30 dark:bg-slate-700/50"
              >
                <Phone className="w-4 h-4 text-blue-500" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{meeting.client}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {meeting.type}
                  </div>
                </div>
                <div className="text-xs font-medium">{meeting.time}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Active Deals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeDeals.map((deal, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-700/50"
              >
                <div>
                  <div className="font-medium text-sm">{deal.company}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {deal.stage}
                  </div>
                </div>
                <div className="text-sm font-bold text-green-600">
                  {deal.value}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

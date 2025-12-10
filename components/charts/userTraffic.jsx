"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";

export default function TrafficAreaChart() {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Get user session email
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) setUserEmail(user?.email);
  }, []);

  useEffect(() => {
    const fetchTrafficData = async () => {
      if (!userEmail) return;

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const counts = Array(7).fill(0);

      // Helper to count records per day
      const countPerDay = (rows, dateKey = "created_at") => {
        rows.forEach((row) => {
          const d = new Date(row[dateKey]);
          const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1; // make Mon=0, Sun=6
          counts[dayIndex] += 1;
        });
      };

      // Fetch from multiple tables
      const { data: users } = await supabase
        .from("Users")
        .select("created_at")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      const { data: leads } = await supabase
        .from("Leads")
        .select("created_at")
        .eq("user_email", userEmail)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      const { data: deals } = await supabase
        .from("Deals")
        .select("created_at")
        .eq("user_email", userEmail)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      const { data: campaigns } = await supabase
        .from("Campaigns")
        .select("sent_at, created_at")
        .eq("user_email", userEmail)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      // Aggregate
      if (users) countPerDay(users);
      if (leads) countPerDay(leads);
      if (deals) countPerDay(deals);
      if (campaigns) countPerDay(campaigns, "sent_at" || "created_at");

      setChartData(counts);
    };

    fetchTrafficData();

    // Optional: Real-time listener (auto-update on inserts)
    const channels = [
      supabase
        .channel("realtime:Users")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Users" },
          fetchTrafficData
        )
        .subscribe(),
      supabase
        .channel("realtime:Deals")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Deals" },
          fetchTrafficData
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [userEmail]);

  useEffect(() => {
    if (!chartRef.current) return;
    const myChart = echarts.init(chartRef.current);

    const option = {
      title: {
        text: "👥 Weekly User Traffic",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", label: { backgroundColor: "#14b8a6" } },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      series: [
        {
          name: "Activity",
          type: "line",
          smooth: true,
          showSymbol: false,
          areaStyle: {
            opacity: 0.6,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#14b8a6" },
              { offset: 1, color: "#0ea5e9" },
            ]),
          },
          lineStyle: { width: 3, color: "#14b8a6" },
          data: chartData,
        },
      ],
    };

    myChart.setOption(option);
    if (typeof window === "undefined") return;
    const handleResize = () => myChart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      myChart.dispose();
    };
  }, [chartData]);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

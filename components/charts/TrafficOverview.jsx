"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function TrafficLineChart() {
  const chartRef = useRef(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) setUserEmail(user?.email);
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const fetchData = async () => {
      // 📨 Fetch campaigns (as "Page Views")
      const { data: campaignData, error: campaignError } = await supabase
        .from("Campaigns")
        .select("created_at")
        .eq("user_email", userEmail);

      // 🧲 Fetch leads (as "Unique Visitors")
      const { data: leadsData, error: leadsError } = await supabase
        .from("Leads")
        .select("created_at")
        .eq("user_email", userEmail);

      if (campaignError || leadsError) {
        console.error(
          "Error fetching chart data:",
          campaignError || leadsError
        );
        return;
      }

      // 🧮 Aggregate by date
      const countByDate = (data) => {
        const counts = {};
        data.forEach((row) => {
          const date = new Date(row.created_at).toLocaleDateString("en-CA"); // YYYY-MM-DD
          counts[date] = (counts[date] || 0) + 1;
        });
        return counts;
      };

      const campaignCounts = countByDate(campaignData);
      const leadCounts = countByDate(leadsData);

      // Merge all unique dates
      const allDates = Array.from(
        new Set([...Object.keys(campaignCounts), ...Object.keys(leadCounts)])
      ).sort();

      // Prepare datasets
      const pageViews = allDates.map((d) => campaignCounts[d] || 0);
      const uniqueVisitors = allDates.map((d) => leadCounts[d] || 0);

      const option = {
        title: {
          text: "🌐 Website Traffic Overview",
          left: "center",
          textStyle: { color: "#0f172a", fontWeight: "600" },
        },
        tooltip: { trigger: "axis" },
        legend: {
          data: ["Page Views", "Unique Visitors"],
          textStyle: { color: "#475569" },
          top: 30,
        },
        grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
        xAxis: {
          type: "category",
          data: allDates,
          axisLine: { lineStyle: { color: "#94a3b8" } },
          axisLabel: { color: "#475569" },
        },
        yAxis: {
          type: "value",
          axisLine: { lineStyle: { color: "#94a3b8" } },
          axisLabel: { color: "#475569" },
        },
        series: [
          {
            name: "Page Views",
            type: "line",
            data: pageViews,
            smooth: true,
            lineStyle: {
              width: 3,
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: "#14b8a6" },
                { offset: 1, color: "#0ea5e9" },
              ]),
            },
            symbolSize: 8,
          },
          {
            name: "Unique Visitors",
            type: "line",
            data: uniqueVisitors,
            smooth: true,
            lineStyle: {
              width: 3,
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: "#0ea5e9" },
                { offset: 1, color: "#14b8a6" },
              ]),
            },
            symbolSize: 8,
          },
        ],
      };

      myChart.setOption(option);
    };

    fetchData();

    // 🔄 Real-time updates from Supabase
    const channel = supabase
      .channel("realtime-traffic")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Campaigns" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Leads" },
        () => fetchData()
      )
      .subscribe();
    if (typeof window === "undefined") return;
    const handleResize = () => myChart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("resize", handleResize);
      myChart.dispose();
    };
  }, [userEmail]);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function GrowthRateLineChart() {
  const chartRef = useRef(null);
  const [userEmail, setUserEmail] = useState("");
  const [leadsCount, setLeadsCount] = useState([]);
  const [dealsCount, setDealsCount] = useState([]);

  useEffect(() => {
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) setUserEmail(user?.email);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) return;

      // Fetch leads (count per week)
      const { data: leadsData, error: leadsError } = await supabase
        .from("Leads")
        .select("created_at")
        .eq("user_email", userEmail);

      if (leadsError) console.error("Leads error:", leadsError);

      // Fetch deals (count per week)
      const { data: dealsData, error: dealsError } = await supabase
        .from("Deals")
        .select("created_at, status")
        .eq("user_email", userEmail)
        .eq("status", "Closed-won");

      if (dealsError) console.error("Deals error:", dealsError);

      // Helper: group counts by week number
      const groupByWeek = (data) => {
        const counts = [0, 0, 0, 0, 0];
        data.forEach((item) => {
          const week = Math.ceil(new Date(item.created_at).getDate() / 7);
          if (week >= 1 && week <= 5) counts[week - 1]++;
        });
        return counts;
      };

      setLeadsCount(groupByWeek(leadsData || []));
      setDealsCount(groupByWeek(dealsData || []));
    };

    fetchData();
  }, [userEmail]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "📈 Growth Rate (Leads vs Deals)",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#cbd5e1",
        textStyle: { color: "#0f172a" },
      },
      legend: {
        data: ["Leads Generated", "Deals Closed"],
        bottom: 0,
        textStyle: { color: "#475569" },
      },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      yAxis: {
        type: "value",
        name: "Count",
        nameTextStyle: { color: "#475569" },
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: "Leads Generated",
          type: "line",
          smooth: true,
          data: leadsCount,
          lineStyle: { width: 3, color: "#3b82f6" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(59,130,246,0.4)" },
              { offset: 1, color: "rgba(59,130,246,0.05)" },
            ]),
          },
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#3b82f6" },
        },
        {
          name: "Deals Closed",
          type: "line",
          smooth: true,
          data: dealsCount,
          lineStyle: { width: 3, color: "#10b981" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(16,185,129,0.4)" },
              { offset: 1, color: "rgba(16,185,129,0.05)" },
            ]),
          },
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#10b981" },
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
  }, [leadsCount, dealsCount]);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function TrafficSourceDonutChart() {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState([]);
  const [userEmail, setUserEmail] = useState("");

  // ✅ Get the logged-in user email from localStorage session
  useEffect(() => {
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) {
      setUserEmail(user?.email);
    }
  }, []);

  // ✅ Fetch real-time leads data from Supabase
  useEffect(() => {
    const fetchLeads = async () => {
      if (!userEmail) return;

      const { data, error } = await supabase
        .from("Leads")
        .select("source")
        .eq("user_email", userEmail);

      if (error) {
        console.error("Supabase Leads fetch error:", error);
        return;
      }

      // ✅ Aggregate source counts
      const sourceCounts = data.reduce((acc, item) => {
        const src = item.source || "Unknown";
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {});

      // ✅ Convert to chart-friendly format
      const formattedData = Object.entries(sourceCounts).map(
        ([name, value]) => ({
          name,
          value,
        })
      );

      setChartData(formattedData);
    };

    fetchLeads();
  }, [userEmail]);

  // ✅ Initialize ECharts
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    if (typeof window === "undefined") return;
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "🌐 Traffic Source Breakdown",
        left: "center",
        top: "5%",
        textStyle: {
          color: "#0f172a",
          fontWeight: "600",
          fontSize: 16,
        },
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#475569" },
      },
      series: [
        {
          name: "Traffic Source",
          type: "pie",
          radius: ["60%", "85%"], // half donut
          center: ["50%", "70%"], // move down
          startAngle: 180,
          endAngle: 360,
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: "outside",
            color: "#0f172a",
            formatter: "{b}\n{d}%",
          },
          itemStyle: {
            borderRadius: 8,
            borderColor: "#fff",
            borderWidth: 2,
            color: (params) => {
              const colors = [
                "#0ea5e9", // sky-500
                "#14b8a6", // teal-500
                "#22d3ee", // cyan-400
                "#38bdf8", // sky-400
                "#2dd4bf", // teal-400
              ];
              return colors[params.dataIndex % colors.length];
            },
          },
          data: chartData,
        },
      ],
    };

    myChart.setOption(option);
    const handleResize = () => myChart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      myChart.dispose();
    };
  }, [chartData]);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function TrafficSourcesPie() {
  const chartRef = useRef(null);
  const [userEmail, setUserEmail] = useState("");
  const [trafficData, setTrafficData] = useState([]);

  useEffect(() => {
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) {
      setUserEmail(user?.email);
    }
  }, []);

  useEffect(() => {
    const fetchTrafficData = async () => {
      if (!userEmail) return;

      // Fetch from Leads and Deals
      const { data: leads, error: leadsError } = await supabase
        .from("Leads")
        .select("source")
        .eq("user_email", userEmail);

      const { data: deals, error: dealsError } = await supabase
        .from("Deals")
        .select("source")
        .eq("user_email", userEmail);

      if (leadsError || dealsError) {
        console.error("Error fetching traffic data:", leadsError || dealsError);
        return;
      }

      // Combine both sources
      const combined = [...(leads || []), ...(deals || [])];

      // Count occurrences of each traffic source
      const sourceCount = combined.reduce((acc, item) => {
        const src = item.source || "Unknown";
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {});

      // Convert to ECharts format
      const chartData = Object.entries(sourceCount).map(([name, value]) => ({
        name,
        value,
      }));

      setTrafficData(chartData);
    };

    fetchTrafficData();
  }, [userEmail]);

  useEffect(() => {
    if (!chartRef.current || trafficData.length === 0) return;
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "🌐 Traffic Sources",
        subtext: "Visitor Channels",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
        subtextStyle: { color: "#64748b", fontSize: 13 },
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} visits ({d}%)",
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#475569" },
      },
      series: [
        {
          name: "Traffic Source",
          type: "pie",
          radius: ["45%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "outside",
            formatter: "{b}\n{d}%",
            color: "#0f172a",
            fontWeight: "500",
          },
          data: trafficData,
          color: [
            "#14b8a6",
            "#0ea5e9",
            "#38bdf8",
            "#2dd4bf",
            "#7dd3fc",
            "#818cf8",
            "#c084fc",
          ],
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
  }, [trafficData]);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

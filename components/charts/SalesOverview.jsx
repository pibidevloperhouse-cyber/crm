"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function SalesOverviewBarChart() {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState({
    deals: 0,
    leads: 0,
    customers: 0,
    campaigns: 0,
  });
  const [userEmail, setUserEmail] = useState("");

  // 🧩 Get logged-in user email from localStorage
  useEffect(() => {
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) {
      setUserEmail(user?.email);
    }
  }, []);

  // 🔍 Fetch sales data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) return;

      try {
        // Fetch Closed-won Deals
        const { data: dealsData, error: dealsError } = await supabase
          .from("Deals")
          .select("*")
          .eq("status", "Closed-won")
          .eq("user_email", userEmail);
        if (dealsError) console.error("Deals error:", dealsError);

        // Fetch Qualified Leads
        const { data: leadsData, error: leadsError } = await supabase
          .from("Leads")
          .select("*")
          .eq("status", "Qualified")
          .eq("user_email", userEmail);
        if (leadsError) console.error("Leads error:", leadsError);

        // Fetch Active Customers
        const { data: customersData, error: customersError } = await supabase
          .from("Customers")
          .select("*")
          .eq("status", "Active")
          .eq("user_email", userEmail);
        if (customersError) console.error("Customers error:", customersError);

        // Fetch Sent Campaigns
        const { data: campaignData, error: campaignError } = await supabase
          .from("Campaigns")
          .select("*")
          .eq("status", "Sent")
          .eq("user_email", userEmail);
        if (campaignError) console.error("Campaign error:", campaignError);

        // Update State
        setChartData({
          deals: dealsData?.length || 0,
          leads: leadsData?.length || 0,
          customers: customersData?.length || 0,
          campaigns: campaignData?.length || 0,
        });
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchData();
  }, [userEmail]);

  // 🎨 Initialize & render chart
  useEffect(() => {
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "📈 Sales Overview",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "category",
        data: ["Deals", "Leads", "Customers", "Campaigns"],
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      series: [
        {
          name: "Count",
          type: "bar",
          data: [
            chartData.deals,
            chartData.leads,
            chartData.customers,
            chartData.campaigns,
          ],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#14b8a6" }, // teal
              { offset: 1, color: "#0ea5e9" }, // sky
            ]),
            borderRadius: 6,
          },
          barWidth: "40%",
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

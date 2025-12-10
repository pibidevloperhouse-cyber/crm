"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client"; // Make sure this path is correct

export default function CustomerSatisfactionHalfDonut() {
  const chartRef = useRef(null);
  const [userEmail, setUserEmail] = useState("");
  const [chartData, setChartData] = useState([]);

  // 1️⃣ Get the logged-in user’s email from localStorage
  useEffect(() => {
    const local = localStorage.getItem("session");
    const user = JSON.parse(local)?.user;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  // 2️⃣ Fetch Customer data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) return;

      const { data, error } = await supabase
        .from("Customers")
        .select(
          "status, issues, price, industry, customFields, messages, purchase_history"
        )
        .eq("user_email", userEmail);

      if (error) {
        console.error("Error fetching Customers:", error);
        return;
      }

      if (!data || data.length === 0) {
        setChartData([]);
        return;
      }

      // 3️⃣ Compute satisfaction metrics (simple example logic)
      // You can adjust this logic based on real fields in your Customers table.
      const metrics = {
        "Product Quality": 0,
        Pricing: 0,
        "Delivery Speed": 0,
        "Customer Support": 0,
        "Ease of Use": 0,
      };

      data.forEach((cust) => {
        // Example heuristic:
        // - Customers with no "issues" are happier.
        // - If they have purchase history, increase satisfaction.
        // - If they have messages (support chats), weigh toward support.
        const hasIssues = cust.issues && cust.issues.trim() !== "";
        const purchases = Array.isArray(cust.purchase_history)
          ? cust.purchase_history.length
          : 0;
        const messages = Array.isArray(cust.messages)
          ? cust.messages.length
          : 0;

        // Basic weighting
        if (!hasIssues) metrics["Product Quality"] += 1;
        if (cust.price) metrics["Pricing"] += 1;
        if (purchases > 0) metrics["Delivery Speed"] += 1;
        if (messages > 0) metrics["Customer Support"] += 1;
        if (cust.customFields && cust.customFields.length > 0)
          metrics["Ease of Use"] += 1;
      });

      // Normalize to percentage (0–100%)
      const total = data.length || 1;
      const formatted = Object.entries(metrics).map(([key, value]) => ({
        name: key,
        value: Math.round((value / total) * 100),
      }));

      setChartData(formatted);
    };

    fetchData();
  }, [userEmail]);

  // 4️⃣ Initialize and render chart when data changes
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "🌟 Customer Satisfaction Overview",
        left: "center",
        textStyle: {
          color: "#0f172a",
          fontWeight: "600",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c}%",
        backgroundColor: "#f8fafc",
        borderColor: "#cbd5e1",
        textStyle: { color: "#0f172a" },
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#475569" },
      },
      series: [
        {
          name: "Customer Satisfaction",
          type: "pie",
          radius: ["50%", "80%"],
          center: ["50%", "70%"], // move lower for half donut
          startAngle: 180, // 180° = half circle
          endAngle: 360,
          label: {
            show: true,
            position: "outside",
            formatter: "{b}\n{c}%",
            color: "#0f172a",
            fontWeight: "500",
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
          },
          data: chartData,
          color: ["#14b8a6", "#0ea5e9", "#38bdf8", "#2dd4bf", "#7dd3fc"],
        },
      ],
    };

    myChart.setOption(option);
    const handleResize = () => myChart.resize();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      myChart.dispose();
    };
  }, [chartData]);

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: "400px",
        display: "flex",
        justifyContent: "center",
      }}
    />
  );
}

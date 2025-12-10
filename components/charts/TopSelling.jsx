"use client";
import * as echarts from "echarts";
import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { supabase } from "@/utils/supabase/client";

export default function TopProductsChart() {
  const [userEmail, setUserEmail] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    try {
      const local = localStorage.getItem("session");
      const user = JSON.parse(local)?.user;
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        console.warn("⚠️ No user email found in session");
      }
    } catch (e) {
      console.error("Failed to parse session:", e);
    }
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("products") // ✅ Make sure this matches your table name
          .select("name, stock, price, category, user_email")
          .eq("user_email", userEmail);

        if (error) {
          console.error("Error fetching product data:", error.message || error);
          return;
        }

        console.log("Fetched product data:", data);

        const cleaned = (data || [])
          .map((p) => ({
            name: p.name,
            stock: Number(p.stock) || 0,
            category: p.category,
            price: Number(p.price) || 0,
          }))
          .sort((a, b) => b.stock - a.stock) // Sort descending
          .slice(0, 5);

        setProducts(cleaned);
      } catch (err) {
        console.error("Unexpected fetch error:", err);
      }
    };

    fetchData();

    const channel = supabase
      .channel("realtime-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  const option = {
    title: {
      text: "🏆 Top Selling Products",
      left: "center",
      textStyle: { color: "#0f172a", fontWeight: "600" },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "5%",
      top: "15%",
      containLabel: true,
    },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: products.map((item) => item.name) },
    series: [
      {
        type: "bar",
        data: products.map((item) => item.stock),
        itemStyle: {
          borderRadius: 6,
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: "#0ea5e9" },
            { offset: 1, color: "#14b8a6" },
          ]),
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: "400px", width: "100%" }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}

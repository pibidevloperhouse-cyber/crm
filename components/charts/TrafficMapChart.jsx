"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function TrafficBarChart() {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current);

    const option = {
      title: {
        text: "🌍 Traffic by Country",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
      },
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: [
          "USA",
          "India",
          "China",
          "Germany",
          "Brazil",
          "France",
          "Australia",
        ],
        axisLabel: { color: "#475569" },
        axisLine: { lineStyle: { color: "#94a3b8" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#475569" },
        axisLine: { lineStyle: { color: "#94a3b8" } },
      },
      series: [
        {
          data: [1048, 735, 580, 484, 300, 200, 150],
          type: "bar",
          barWidth: "45%",
          itemStyle: {
            borderRadius: 6,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#14b8a6" }, // teal-500
              { offset: 1, color: "#0ea5e9" }, // sky-500
            ]),
          },
        },
      ],
    };

    chart.setOption(option);
    if (typeof window === "undefined") return;
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

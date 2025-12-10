"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function CampaignBubbleChart() {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current);

    const option = {
      title: {
        text: "📊 Campaign Performance Bubble Chart",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
      },
      tooltip: {
        trigger: "item",
        formatter: ({ name, value }) =>
          `${name}<br/>Visitors: ${value[2]}<br/>Conversions: ${value[1]}<br/>CTR: ${value[0]}%`,
      },
      xAxis: {
        name: "CTR (%)",
        type: "value",
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      yAxis: {
        name: "Conversions",
        type: "value",
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      grid: { left: "10%", right: "10%", bottom: "15%", top: "15%" },
      series: [
        {
          name: "Campaigns",
          type: "scatter",
          symbolSize: (val) => val[2] / 50, // size based on visitors
          data: [
            { name: "Google Ads", value: [8, 250, 420] }, // [CTR%, Conversions, Visitors]
            { name: "Facebook", value: [7, 260, 500] },
            { name: "Email", value: [6, 230, 380] },
            { name: "LinkedIn", value: [5, 150, 300] },
            { name: "Instagram", value: [9, 200, 350] },
          ],
          itemStyle: {
            color: (params) => {
              const colors = [
                "#14b8a6",
                "#0ea5e9",
                "#6366f1",
                "#06b6d4",
                "#8b5cf6",
              ];
              return colors[params.dataIndex % colors.length];
            },
            opacity: 0.8,
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

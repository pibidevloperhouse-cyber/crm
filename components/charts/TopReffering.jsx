"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function TopReferrers() {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "🌐 Top Referring Websites",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" }, // slate-900
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      grid: { left: "3%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#94a3b8" } }, // slate-400
        axisLabel: { color: "#475569" }, // slate-600
      },
      yAxis: {
        type: "category",
        data: [
          "Google",
          "LinkedIn",
          "Facebook",
          "Instagram",
          "YouTube",
          "Twitter",
        ],
        axisLine: { lineStyle: { color: "#94a3b8" } },
        axisLabel: { color: "#475569" },
      },
      series: [
        {
          name: "Visitors",
          type: "bar",
          data: [820, 680, 610, 450, 390, 320],
          barWidth: "45%",
          itemStyle: {
            borderRadius: 6,
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: "#0ea5e9" }, // sky-500
              { offset: 1, color: "#14b8a6" }, // teal-500
            ]),
          },
          label: {
            show: true,
            position: "right",
            color: "#0f172a",
            fontWeight: 500,
          },
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
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

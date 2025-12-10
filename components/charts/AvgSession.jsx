"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function AvgSessionGauge() {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "⏱ Average Session Duration",
        left: "center",
        textStyle: { color: "#0f172a", fontWeight: "600" },
        subtext: "Minutes per session",
        subtextStyle: { color: "#64748b", fontSize: 13 },
      },
      tooltip: {
        formatter: "{a} <br/>{b}: {c} min",
      },
      series: [
        {
          name: "Session Duration",
          type: "gauge",
          min: 0,
          max: 10, // max duration in minutes
          splitNumber: 5,
          radius: "90%",
          axisLine: {
            lineStyle: {
              width: 15,
              color: [
                [0.2, "#14b8a6"], // teal-500 for low engagement
                [0.6, "#0ea5e9"], // sky-500 for medium
                [1, "#0c4a6e"], // dark sky for high
              ],
            },
          },
          axisTick: {
            length: 8,
            lineStyle: { color: "#94a3b8" }, // slate-400
          },
          splitLine: {
            length: 12,
            lineStyle: { color: "#94a3b8" },
          },
          axisLabel: { color: "#475569" }, // slate-600
          pointer: {
            width: 5,
            itemStyle: { color: "#14b8a6" },
          },
          detail: {
            valueAnimation: true,
            fontSize: 20,
            color: "#0f172a",
            formatter: "{value} min",
          },
          data: [{ value: 6.2, name: "Avg Duration" }], // dummy value
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

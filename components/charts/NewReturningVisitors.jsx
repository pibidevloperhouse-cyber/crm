"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function NewReturningVisitors() {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "👥 New vs Returning Visitors",
        left: "center",
        top: 10,
        textStyle: { color: "#0f172a", fontWeight: "600" }, // slate-900
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        textStyle: { color: "#475569" }, // slate-600
      },
      series: [
        {
          name: "Visitor Type",
          type: "pie",
          radius: ["45%", "70%"], // donut shape
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: "outside",
            formatter: "{b}\n{d}%",
            fontSize: 14,
            color: "#0f172a",
          },
          labelLine: { show: true },
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 2,
          },
          data: [
            {
              value: 680,
              name: "New Visitors",
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                  { offset: 0, color: "#0ea5e9" }, // sky-500
                  { offset: 1, color: "#38bdf8" }, // sky-400
                ]),
              },
            },
            {
              value: 420,
              name: "Returning Visitors",
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                  { offset: 0, color: "#14b8a6" }, // teal-500
                  { offset: 1, color: "#2dd4bf" }, // teal-400
                ]),
              },
            },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.3)",
            },
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

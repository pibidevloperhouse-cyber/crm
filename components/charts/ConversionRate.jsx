"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function ConversionRateGauge() {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartDom = chartRef.current;
    const myChart = echarts.init(chartDom);

    const option = {
      title: {
        text: "💸 Conversion Rate",
        left: "center",
        textStyle: {
          color: "#0f172a", // dark slate
          fontWeight: "600",
        },
      },
      tooltip: {
        formatter: "{a} <br/>{b} : {c}%",
      },
      series: [
        {
          name: "Conversion Rate",
          type: "gauge",
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          progress: {
            show: true,
            width: 15,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: "#14b8a6" }, // teal-500
                { offset: 1, color: "#0ea5e9" }, // sky-500
              ]),
            },
          },
          pointer: {
            show: true,
            width: 4,
            length: "70%",
          },
          axisLine: {
            lineStyle: {
              width: 15,
              color: [[1, "#e2e8f0"]], // slate-200 background
            },
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            show: false,
          },
          axisLabel: {
            color: "#64748b", // slate-500
            fontSize: 12,
          },
          detail: {
            valueAnimation: true,
            formatter: "{value}%",
            color: "#0f172a",
            fontSize: 24,
            fontWeight: "600",
            offsetCenter: [0, "70%"],
          },
          data: [
            {
              value: 68, // 💡 dummy conversion rate (68%)
              name: "Completed Purchases",
            },
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
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

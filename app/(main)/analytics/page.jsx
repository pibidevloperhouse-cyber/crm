"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import MarketingSankey from "@/components/charts/campaignPerformance";
import SalesProductivityDonut from "@/components/charts/salesProductivity";
import GrowthRate from "@/components/charts/GrowthRate";
// import TopSelling from "@/components/charts/TopSelling";
// import UserTraffic from "@/components/charts/userTraffic";
import CustomerSatisfaction from "@/components/charts/CustomerSatisfaction";
import TrafficBreakdown from "@/components/charts/TrafficBreakdown";
import TrafficOverview from "@/components/charts/TrafficOverview";
import TrafficSource from "@/components/charts/TrafficSource";
import GeographicDistribution from "@/components/charts/TrafficMapChart";
import TopReferring from "@/components/charts/TopReffering";
import NewReturningVisitors from "@/components/charts/NewReturningVisitors";
import TrafficByCampaign from "@/components/charts/TrafficByCampaign";
import { analyticsData } from "@/constants/constant";
import dynamic from "next/dynamic";

const LeadSourcesChart = dynamic(
  () => import("@/components/LeadSourcesChart"),
  { ssr: false }
);
const TopPerformingChart = dynamic(
  () => import("@/components/charts/TopPerformingChart"),
  { ssr: false }
);
const TopIndustriesCard = dynamic(
  () => import("@/components/charts/TopIndustryCard"),
  { ssr: false }
);
const CustomerSegmentCharts = dynamic(
  () => import("@/components/charts/CustomerChart"),
  { ssr: false }
);
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  LineChart,
  Users,
  DollarSign,
  Calendar,
  Target,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [chartType, setChartType] = useState("chart");
  const [timeRange, setTimeRange] = useState("30d");
  const salesProductivityData = [
    {
      name: "Calls Made",
      value: 120,
      description: "Total number of calls made by sales team",
      itemStyle: { color: "#B2E5E0" },
    },
    {
      name: "Client Meetings Scheduled",
      value: 45,
      description: "Upcoming meetings scheduled with clients",
      itemStyle: { color: "#7FDCD4" },
    },
    {
      name: "Client Meetings Conducted",
      value: 30,
      description: "Meetings successfully conducted with clients",
      itemStyle: { color: "#4CCFC7" },
    },
    {
      name: "Follow ups Done",
      value: 85,
      description: "Sales-related tasks marked as completed",
      itemStyle: { color: "#26BDB5" },
    },
    {
      name: "Deals Closed",
      value: 25,
      description: "Number of deals closed successfully",
      itemStyle: { color: "#14B8A6" },
    },
  ];

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    format = "number",
  }) => {
    const formatValue = (val) => {
      if (typeof val === "string") return val;

      switch (format) {
        case "currency":
          return `$${(val / 1000000).toFixed(1)}M`;
        case "percentage":
          return `${val}%`;
        // default:
        //   return val.toLocaleString();
      }
    };

    return (
      <Card className="backdrop-blur-sm bg-teal-500/70 dark:bg-sky-800/50 border border-slate-200/50 dark:border-white/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 break-words">
                {title}
              </p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                {formatValue(value)}
              </p>
              {change !== undefined && (
                <div
                  className={`flex items-center text-xs sm:text-sm mt-1 ${
                    change > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {change > 0 ? (
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  {Math.abs(change)}% vs last period
                </div>
              )}
            </div>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const DataTable = ({ data, columns }) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {columns.map((col, index) => (
              <th
                key={index}
                className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-slate-100 dark:border-slate-800 hover:bg-white/50 dark:hover:bg-slate-700/50"
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className="py-3 px-4 text-slate-900 dark:text-white"
                >
                  {col.format ? col.format(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const PipelineChart = () => (
    <div className="space-y-4">
      {analyticsData.sales.pipeline.map((stage, index) => (
        <div key={index} className="flex items-center space-x-4">
          <div className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300">
            {stage.stage}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {stage.count} deals
              </span>
              <span className="text-sm font-medium">
                ${(stage.value / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-teal-500 to-sky-700 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(stage.value / 2500000) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const CustomerSegmentChart = () => (
    <div className="space-y-4">
      {analyticsData.customer.segmentation.map((segment, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-slate-700/50"
        >
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {segment.segment}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {segment.count} customers
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${(segment.revenue / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Revenue
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Comprehensive analytics with customizable views and data insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20 w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20 w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-white/20">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-white/20">
                <SelectValue placeholder="View type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chart">Chart View</SelectItem>
                <SelectItem value="table">Table View</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="bg-white/50 dark:bg-slate-800/50 border-white/20 w-full lg:w-auto lg:col-span-2"
            >
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-white/20">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <MetricCard
              title="Total Revenue"
              value={analyticsData.overview.totalRevenue}
              change={analyticsData.overview.revenueGrowth}
              icon={DollarSign}
              format="currency"
            />
            <MetricCard
              title="Total Leads"
              value={analyticsData.overview.totalLeads}
              change={analyticsData.overview.leadsGrowth}
              icon={Users}
            />
            <MetricCard
              title="Conversion Rate"
              value={analyticsData.overview.conversionRate}
              change={analyticsData.overview.conversionGrowth}
              icon={Target}
              format="percentage"
            />
            <MetricCard
              title="New Customers"
              value={analyticsData.overview.customerAcquisition}
              change={analyticsData.overview.acquisitionGrowth}
              icon={CheckCircle}
            />
          </div>

          <div>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <GrowthRate />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>User Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <UserTraffic />
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <TopSelling />
                </div>
              </CardContent>
            </Card>
          </div>  */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 items-center justify-center text-slate-500">
                  <CustomerSatisfaction />
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Traffic Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <TrafficBreakdown />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20 lg:col-span-2">
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <LeadSourcesChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="traffic" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <MetricCard
              title="Total Visitors"
              value={analyticsData.traffic.totalVisitors}
              icon={Users}
            />
            <MetricCard
              title="Page Views"
              value={analyticsData.traffic.pageViews}
              icon={Eye}
            />
            <MetricCard
              title="Bounce Rate"
              value={analyticsData.traffic.bounceRate}
              icon={AlertTriangle}
              format="percentage"
            />
            <MetricCard
              title="Avg Session"
              value={analyticsData.traffic.avgSessionDuration}
              icon={Calendar}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20 lg:col-span-2">
              <CardHeader>
                <CardTitle>Traffic By Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <TrafficByCampaign />
                </div>
              </CardContent>
            </Card>
            {/* <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>User Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <UserTraffic />
                </div>
              </CardContent>
            </Card> */}
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Top Reffering Websites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <TopReferring />
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>New Vs Returning Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <NewReturningVisitors />
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Traffic Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <TrafficSource />
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-full w-full flex items-center justify-center text-slate-500">
                  <GeographicDistribution />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Top Performing Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopPerformingChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <MetricCard
              title="Total Deals"
              value={analyticsData.sales.totalDeals}
              icon={BarChart3}
            />
            <MetricCard
              title="Won Deals"
              value={analyticsData.sales.wonDeals}
              icon={CheckCircle}
            />
            <MetricCard
              title="Avg Deal Size"
              value={analyticsData.sales.avgDealSize}
              icon={DollarSign}
              format="currency"
            />
            <MetricCard
              title="Sales Cycle"
              value={`${analyticsData.sales.salesCycle} days`}
              icon={Calendar}
            />
          </div>

          <CardHeader>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardContent>
                <SalesProductivityDonut data={salesProductivityData} />
              </CardContent>
            </Card>
          </CardHeader>
          <PipelineChart />
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <MarketingSankey />
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
            <CardHeader>
              <CardTitle>Lead Sources Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadSourcesChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <MetricCard
              title="Satisfaction Score"
              value={analyticsData.customer.satisfaction}
              icon={CheckCircle}
            />
            <MetricCard
              title="Net Promoter Score"
              value={analyticsData.customer.nps}
              icon={TrendingUp}
            />
            <MetricCard
              title="Churn Rate"
              value={analyticsData.customer.churnRate}
              icon={AlertTriangle}
              format="percentage"
            />
            <MetricCard
              title="Customer LTV"
              value={analyticsData.customer.ltv}
              icon={DollarSign}
              format="currency"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Customer Segmentation</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerSegmentCharts />
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>TopIndustryCard</CardTitle>
              </CardHeader>
              <CardContent>
                <TopIndustriesCard />
              </CardContent>

              <Card className="gap-5 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
                <CardHeader>
                  <CardTitle>Support Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
                    <span>Support Tickets</span>
                    <span className="font-bold">
                      {analyticsData.customer.supportTickets}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
                    <span>Avg Resolution Time</span>
                    <span className="font-bold">
                      {analyticsData.customer.resolutionTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
                    <span>Customer Satisfaction</span>
                    <span className="font-bold">
                      {analyticsData.customer.satisfaction}/5.0
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Card>

            {/* <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-white/20">
              <CardHeader>
                <CardTitle>Support Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
                  <span>Support Tickets</span>
                  <span className="font-bold">
                    {analyticsData.customer.supportTickets}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
                  <span>Avg Resolution Time</span>
                  <span className="font-bold">
                    {analyticsData.customer.resolutionTime}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
                  <span>Customer Satisfaction</span>
                  <span className="font-bold">
                    {analyticsData.customer.satisfaction}/5.0
                  </span>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

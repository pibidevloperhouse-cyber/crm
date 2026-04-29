"use client";

import { supabase } from "../../../../utils/supabase/client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Save, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Slider from "@radix-ui/react-slider";
import { motion } from "framer-motion";

export default function PricingDetailsSection({ selectedDealId, onNext, onBack }) {
  const [deal, setDeal] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [customerLoyalty, setCustomerLoyalty] = useState({});

  const fetchData = async (email, dealId) => {
    if (!email || !dealId) return;
    setIsLoading(true);

    const { data: dealData, error: dealError } = await supabase
      .from("Deals")
      .select("*")
      .eq("id", dealId)
      .single();

    if (dealError) {
      console.error("Error fetching deal:", dealError);
      toast.error("Failed to fetch deal details.");
      setIsLoading(false);
      return;
    }

    setDeal(dealData);

    const customerEmail = dealData.email;
    if (customerEmail) {
      const { data: allDeals, error: allDealsError } = await supabase
        .from("Deals")
        .select("email, value, status, created_at, finalPrice")
        .eq("email", customerEmail)
        .eq("user_email", email);

      if (!allDealsError && allDeals) {
        const loyaltyMap = {};
        allDeals.forEach((d) => {
          if (!loyaltyMap[d.email]) {
            loyaltyMap[d.email] = {
              total_orders: 0,
              total_spent: 0,
              last_purchase_date: null,
              discounts: [],
              won_deals: 0,
            };
          }
          loyaltyMap[d.email].total_orders += 1;
          loyaltyMap[d.email].total_spent += parseFloat(d.value || 0);

          const originalVal = parseFloat(d.value || 0);
          const paidVal = parseFloat(d.finalPrice || d.value || 0);
          if (originalVal > 0) {
            const dpt = ((originalVal - paidVal) / originalVal) * 100;
            loyaltyMap[d.email].discounts.push(dpt);
          }
          if (d.status === "Closed-won") {
            loyaltyMap[d.email].won_deals += 1;
          }
        });
        setCustomerLoyalty(loyaltyMap);
      }
    }

    const { data: productsData, error: productsError } = await supabase
      .from("Users")
      .select("products")
      .eq("email", email)
      .single();

    if (productsError) {
      console.error("Error fetching products:", productsError);
    } else if (productsData) {
      setProducts(productsData.products || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem("session");
    const userStr = localStorage.getItem("user");

    let email = "";
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        email = sessionObj.user?.email || "";
      } catch (e) { }
    }
    if (!email && userStr) {
      try {
        const userObj = JSON.parse(userStr);
        email = userObj.email || "";
      } catch (e) { }
    }
    if (email) setUserEmail(email);
  }, []);

  useEffect(() => {
    if (userEmail && selectedDealId) {
      fetchData(userEmail, selectedDealId);
    }
  }, [userEmail, selectedDealId]);

  const handleChange = (field, index, value) => {
    setDeal((prevDeal) => {
      const updatedDeal = { ...prevDeal };
      const perProductFields = [
        "quantity",
        "user_discount",
        "discount",
        "labour_cost",
        "manufacturing_cost",
        "shipping_cost",
        "line_taxes",
        "auto_discount_status",
        "pricing_strategy",
      ];

      if (perProductFields.includes(field)) {
        if (!updatedDeal[field]) updatedDeal[field] = [];
        const newFieldArray = [...updatedDeal[field]];
        while (newFieldArray.length <= index) {
          if (field === "quantity") newFieldArray.push(1);
          else if (field === "auto_discount_status") newFieldArray.push("pending");
          else if (
            field === "labour_cost" ||
            field === "manufacturing_cost" ||
            field === "shipping_cost" ||
            field === "line_taxes"
          )
            newFieldArray.push(0);
          else newFieldArray.push(field === "discount" ? "0%" : "0");
        }
        newFieldArray[index] = value;
        updatedDeal[field] = newFieldArray;
      } else {
        updatedDeal[field] = value;
      }
      return updatedDeal;
    });
  };

  const handleStrategyChange = (index, strategyValue) => {
    handleChange("pricing_strategy", index, strategyValue);
    if (strategyValue === "Bundled Pricing") {
      handleChange("user_discount", index, "20");
      handleChange("auto_discount_status", index, "accepted");
    } else if (strategyValue === "Competitive Pricing") {
      handleChange("user_discount", index, "15");
      handleChange("auto_discount_status", index, "accepted");
    } else if (strategyValue === "Anchor Pricing") {
      handleChange("user_discount", index, "5");
      handleChange("auto_discount_status", index, "accepted");
    } else if (strategyValue === "AI Auto") {
      handleChange("user_discount", index, "");
      handleChange("auto_discount_status", index, "pending");
    }
  };

  const handleSave = async () => {
    const legacyTaxRate =
      parseFloat(deal.tax_vat || 0) +
      parseFloat(deal.tax_gst || 0) +
      parseFloat(deal.tax_excise || 0) +
      parseFloat(deal.tax_customs || 0);

    const payload = {
      quantity: deal.quantity || [],
      discount: deal.discount || [],
      user_discount: deal.user_discount || [],
      labour_cost: deal.labour_cost || [],
      manufacturing_cost: deal.manufacturing_cost || [],
      shipping_cost: deal.shipping_cost || [],
      additional_fees: deal.additional_fees || [],
      tax: parseFloat(deal.tax_rate ?? legacyTaxRate),
      tax_rate: parseFloat(deal.tax_rate ?? legacyTaxRate),
      tax_region_type: deal.tax_region_type || "None",
      tax_inclusion: deal.tax_inclusion || "Exclusive",
      tax_scope: deal.tax_scope || "Transaction",
      line_taxes: deal.line_taxes || [],
      auto_discount_status: deal.auto_discount_status || [],
      pricing_strategy: deal.pricing_strategy || [],
    };

    const { error } = await supabase
      .from("Deals")
      .update(payload)
      .eq("id", deal.id);

    if (error) {
      toast.error("Failed to save pricing details.");
    } else {
      toast.success("Pricing details saved successfully!");
      if (onNext) onNext();
    }
  };

  const handleApprove = async () => {
    if (!deal) return;

    const {
      subtotalBeforeTax: subtotal,
      totalTax,
      grandTotal,
    } = getTotals();

    const payload = {
      subtotal: subtotal,
      total_tax: totalTax,
      total_cost: grandTotal,
      finalPrice: grandTotal,
      approved: true,
      status: "Negotiation", // Or keep as is, but mark approved
    };

    const { error } = await supabase
      .from("Deals")
      .update(payload)
      .eq("id", deal.id);

    if (error) {
      toast.error("Failed to approve deal.");
    } else {
      toast.success(`Deal approved with a final price of $${grandTotal.toFixed(2)}.`);
      fetchData(userEmail, deal.id);
      if (onNext) onNext();
    }
  };

  const getLoyaltyInfo = (customerEmail) => {
    const data = customerLoyalty[customerEmail] || {
      total_orders: 0,
      total_spent: 0,
    };
    let level = "BRONZE";
    let extraDiscount = 0;
    let color = "bg-slate-100 text-slate-800 border-slate-200";

    if (data.total_orders > 7) {
      level = "GOLD";
      extraDiscount = 5;
      color = "bg-slate-800 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900";
    } else if (data.total_orders >= 3) {
      level = "SILVER";
      extraDiscount = 2;
      color = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200";
    }

    return { ...data, level, extraDiscount, color };
  };

  const calculateOriginalPrice = (productName) => {
    const product = products.find((p) => p.name === productName);
    let price = parseFloat(product?.price || 0);

    if (!product && price === 0) {
      price = parseFloat(deal?.value || 0);
    }

    const productIndex = deal.products?.indexOf(productName);
    if (deal.configuration && deal.configuration[productIndex]) {
      const config = deal.configuration[productIndex];
      for (const cat in config) {
        price += parseFloat(config[cat]?.price || 0);
      }
    }
    return price;
  };

  const getCalculatedAIDiscount = (index) => {
    const quantityNum = parseInt(deal.quantity?.[index] || 1, 10);
    const loyaltyInfo = getLoyaltyInfo(deal.email);
    const liveIntentScore = deal.intent_score
      ? parseInt(deal.intent_score)
      : Math.min(95, 45 + quantityNum * 3 + loyaltyInfo.total_orders * 1.5);

    const dataSize = (loyaltyInfo.total_orders || 0) + 1;
    const seed = String(deal.id).split("-")[0].charCodeAt(0) || 0;
    const marketVolatility = Math.sin(seed + index) * 2;

    const productsInDeal = deal.products || [];
    const hasCRM = productsInDeal.includes("CRM");
    const hasAnalytics = productsInDeal.includes("Analytics");
    const hasSupport = productsInDeal.includes("Support");

    let bundleDiscount = 0;
    let bundleType = "None";
    if (hasCRM && hasAnalytics && hasSupport) {
      bundleDiscount = 20;
      bundleType = "Full Suite";
    } else if ((hasCRM && hasAnalytics) || (hasCRM && hasSupport) || (hasAnalytics && hasSupport)) {
      bundleDiscount = 10;
      bundleType = "Dual Combo";
    }

    let competitivePricingMod = 0;
    if (liveIntentScore > 80) competitivePricingMod = 2.5;
    else if (liveIntentScore > 50) competitivePricingMod = 1.0;

    let baseSuggested = 0;
    if (dataSize < 3) {
      if (liveIntentScore >= 75) baseSuggested = 8 - (liveIntentScore - 75) / 5;
      else if (liveIntentScore >= 50) baseSuggested = 12 - (liveIntentScore - 50) / 10;
      else baseSuggested = 18 - liveIntentScore / 10;
    } else if (dataSize < 7) {
      const mlPrediction = 15 - liveIntentScore / 10 + (quantityNum > 5 ? 2 : 0);
      baseSuggested = mlPrediction + marketVolatility;
    } else {
      const optimizedValue = 14 - liveIntentScore / 8 + quantityNum * 0.5;
      baseSuggested = optimizedValue + marketVolatility * 1.5;
    }

    const finalProductAi = Math.max(2, Math.min(45, baseSuggested));

    const combinedTarget = parseFloat(
      (finalProductAi + loyaltyInfo.extraDiscount + bundleDiscount + competitivePricingMod).toFixed(1)
    );

    return {
      productAiDiscount: finalProductAi.toFixed(1),
      loyaltyDiscount: loyaltyInfo.extraDiscount || 0,
      bundleDiscount,
      bundleType,
      competitiveDiscount: competitivePricingMod,
      combinedTargetDiscount: combinedTarget,
      intentScore: liveIntentScore,
      loyaltyLevel: loyaltyInfo.level,
    };
  };

  const calculateLineMetrics = (productName, index) => {
    const basePrice = calculateOriginalPrice(productName);
    const quantity = parseInt(deal.quantity?.[index] || 1, 10);

    const statusObj = deal.auto_discount_status || [];
    const status = statusObj.length > index ? statusObj[index] : "pending";
    const userValStr = String(deal.user_discount?.[index] || "");
    const userValNum = parseFloat(userValStr.replace("%", ""));

    let finalDiscountValue = 0;

    if (
      status === "accepted" ||
      status === "rejected" ||
      (!isNaN(userValNum) && userValStr !== "0" && userValStr !== "")
    ) {
      finalDiscountValue = isNaN(userValNum) ? 0 : userValNum;
    } else {
      const aiInfo = getCalculatedAIDiscount(index);
      finalDiscountValue = aiInfo.combinedTargetDiscount;
    }

    const discountMultiplier = 1 - finalDiscountValue / 100;

    const labour = parseFloat(deal.labour_cost?.[index] || 0);
    const manuf = parseFloat(deal.manufacturing_cost?.[index] || 0);
    const shipping = parseFloat(deal.shipping_cost?.[index] || 0);

    let otherFees = 0;
    try {
      const feeEntry = deal.additional_fees?.[index];
      if (typeof feeEntry === "number") otherFees = Number(feeEntry);
      else if (feeEntry && typeof feeEntry === "object" && feeEntry.amount) otherFees = Number(feeEntry.amount);
      else if (feeEntry && typeof feeEntry === "string") otherFees = parseFloat(feeEntry) || 0;
    } catch (e) {
      otherFees = 0;
    }

    const perUnitCost = basePrice + labour + manuf + shipping + otherFees;
    let lineAmount = perUnitCost * quantity * discountMultiplier;

    let lineBeforeTax = lineAmount;
    let lineTaxAmount = 0;

    const taxScope = deal.tax_scope || "Transaction";
    const taxInclusion = deal.tax_inclusion || "Exclusive";

    if (taxScope === "Line") {
      const lineTaxRate = parseFloat(deal.line_taxes?.[index] || 0) / 100;
      if (taxInclusion === "Inclusive") {
        lineBeforeTax = lineAmount / (1 + lineTaxRate);
        lineTaxAmount = lineAmount - lineBeforeTax;
      } else {
        lineTaxAmount = lineAmount * lineTaxRate;
      }
    }

    return { lineAmount, lineBeforeTax, lineTaxAmount };
  };

  const getTotals = () => {
    if (!deal?.products || deal.products.length === 0) {
      return { subtotalBeforeTax: 0, totalTax: 0, grandTotal: 0 };
    }

    const taxScope = deal.tax_scope || "Transaction";
    const taxInclusion = deal.tax_inclusion || "Exclusive";

    if (taxScope === "Line") {
      let subtotalBeforeTax = 0;
      let totalTax = 0;
      deal.products.forEach((productName, index) => {
        const { lineBeforeTax, lineTaxAmount } = calculateLineMetrics(productName, index);
        subtotalBeforeTax += lineBeforeTax;
        totalTax += lineTaxAmount;
      });
      return { subtotalBeforeTax, totalTax, grandTotal: subtotalBeforeTax + totalTax };
    } else {
      let rawSubtotal = 0;
      deal.products.forEach((productName, index) => {
        const { lineBeforeTax } = calculateLineMetrics(productName, index);
        rawSubtotal += lineBeforeTax;
      });

      const legacyTaxRate =
        parseFloat(deal.tax_vat || 0) +
        parseFloat(deal.tax_gst || 0) +
        parseFloat(deal.tax_excise || 0) +
        parseFloat(deal.tax_customs || 0);
      const taxRate = parseFloat(deal.tax_rate ?? legacyTaxRate) / 100;

      let subtotalBeforeTax = rawSubtotal;
      let totalTax = 0;
      let grandTotal = rawSubtotal;

      if (taxInclusion === "Inclusive") {
        subtotalBeforeTax = rawSubtotal / (1 + taxRate);
        totalTax = rawSubtotal - subtotalBeforeTax;
        grandTotal = rawSubtotal;
      } else {
        totalTax = rawSubtotal * taxRate;
        grandTotal = rawSubtotal + totalTax;
      }
      return { subtotalBeforeTax, totalTax, grandTotal };
    }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center">Loading pricing data...</div>;
  if (!deal) return <div className="text-center p-10">No deal selected.</div>;

  const totals = getTotals();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="bg-teal-500/10 text-teal-700 p-2 rounded-lg">
            Level 2
          </span>
          Pricing & Discounts
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Apply intelligent discounts, tax logic, and view the breakdown.
        </p>
      </div>

      <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-1">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  {deal.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className={`${deal.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"} border-none text-[10px]`}>
                    {deal.approved ? "APPROVED" : "DRAFT"}
                  </Badge>
                  <Badge className={`${getLoyaltyInfo(deal.email).color} border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm`}>
                    {getLoyaltyInfo(deal.email).level} CUSTOMER
                  </Badge>
                </div>
              </div>
              <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                <span className="flex items-center gap-1">
                  <span className="font-semibold">{deal.title || "No Title"}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium uppercase text-[10px] tracking-tight">
                  {deal.status}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  Account Hub:
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    {getLoyaltyInfo(deal.email).total_orders} Orders
                  </span>
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!deal.products || deal.products.length === 0 ? (
            <p>This deal has no products assigned.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Pricing Strategy</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-center">Discount (%)</TableHead>
                  <TableHead className="text-right">Net Price</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  {deal.tax_scope === "Line" && <TableHead className="text-center">Tax (%)</TableHead>}
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.products.map((productName, index) => {
                  const originalPrice = calculateOriginalPrice(productName);
                  const { lineBeforeTax } = calculateLineMetrics(productName, index);

                  const aiInfo = getCalculatedAIDiscount(index);
                  const statusObj = deal.auto_discount_status || [];
                  let status = statusObj.length > index ? statusObj[index] : "pending";
                  const userValStr = String(deal.user_discount?.[index] || "");
                  const userValNum = parseFloat(userValStr.replace("%", ""));
                  let isAutoApplied = false;

                  if (
                    status !== "accepted" &&
                    status !== "rejected" &&
                    (isNaN(userValNum) || userValStr === "0" || userValStr === "")
                  ) {
                    isAutoApplied = true;
                  }

                  const displayedValue = isAutoApplied ? aiInfo.combinedTargetDiscount : isNaN(userValNum) ? "0" : userValNum;
                  const netPrice = originalPrice * (1 - Number(displayedValue) / 100);

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{productName}</TableCell>
                      <TableCell>
                        <Select
                          value={deal.pricing_strategy?.[index] || "AI Auto"}
                          onValueChange={(val) => handleStrategyChange(index, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-[11px] font-bold tracking-tight bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Strategy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AI Auto">🤖 AI Auto</SelectItem>
                            <SelectItem value="Bundled Pricing">📦 Bundled Pricing</SelectItem>
                            <SelectItem value="Competitive Pricing">⚔️ Competitive Pricing</SelectItem>
                            <SelectItem value="Anchor Pricing">⚓ Anchor Pricing</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">${originalPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`relative flex items-center h-8 rounded-lg outline outline-1 outline-offset-[-1px] transition-all duration-300 w-[120px] mx-auto ${isAutoApplied ? "bg-amber-50/50 dark:bg-amber-500/[0.03] outline-amber-400/40 dark:outline-amber-500/40 shadow-[0_0_15px_-3px_rgba(251,191,36,0.15)]" : "bg-slate-50 dark:bg-slate-900/40 outline-slate-200 dark:outline-slate-800"
                                  }`}>
                                  <div className="flex-1 flex items-center border-r border-slate-200/60 dark:border-slate-800 h-full">
                                    <Input
                                      className={`w-full h-full p-0 bg-transparent border-none shadow-none focus-visible:ring-0 text-right font-mono text-[13px] font-black tracking-tight ${isAutoApplied ? "text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-white"
                                        }`}
                                      value={displayedValue}
                                      onChange={(e) => {
                                        handleChange("user_discount", index, e.target.value);
                                        handleChange("auto_discount_status", index, "accepted");
                                      }}
                                    />
                                    <span className={`text-[11px] pl-0.5 pr-2.5 font-bold mt-0.5 ${isAutoApplied ? "text-amber-600/50 dark:text-amber-400/40" : "text-slate-400 dark:text-slate-500"
                                      }`}>%</span>
                                  </div>
                                  <div className="flex px-1 gap-0.5 shrink-0 items-center h-full">
                                    <button onClick={() => {
                                      handleChange("user_discount", index, aiInfo.combinedTargetDiscount);
                                      handleChange("auto_discount_status", index, "accepted");
                                    }} className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${status === "accepted" ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                                      }`}>✓</button>
                                    <button onClick={() => {
                                      handleChange("user_discount", index, 0);
                                      handleChange("auto_discount_status", index, "rejected");
                                    }} className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${status === "rejected" ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/30" : "text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                                      }`}>✕</button>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-950 text-white w-64 p-4 rounded-xl shadow-xl border border-slate-800">
                                <p className="font-bold border-b border-white/20 pb-2 mb-3 text-[10px] uppercase">Discount Anatomy</p>
                                <div className="space-y-2 text-sm font-medium">
                                  <div className="flex justify-between items-center"><span>Client Loyalty</span><span className="text-emerald-400 font-mono">+{aiInfo.loyaltyDiscount}%</span></div>
                                  <div className="flex justify-between items-center"><span>Product ML</span><span className="text-amber-400 font-mono">+{aiInfo.productAiDiscount}%</span></div>
                                  {aiInfo.bundleDiscount > 0 && <div className="flex justify-between items-center"><span>Bundle</span><span className="text-purple-400 font-mono">+{aiInfo.bundleDiscount}%</span></div>}
                                  {aiInfo.competitiveDiscount > 0 && <div className="flex justify-between items-center"><span>Win-Mod</span><span className="text-rose-400 font-mono">+{aiInfo.competitiveDiscount}%</span></div>}
                                </div>
                                <div className="flex justify-between mt-3 pt-2 border-t border-white/20 font-black text-sm">
                                  <span>Combined Auto</span>
                                  <span>{aiInfo.combinedTargetDiscount}%</span>
                                </div>
                                {isAutoApplied ? (
                                  <p className="mt-3 text-amber-300 italic text-[10px] bg-amber-500/10 p-2 rounded text-center">
                                    Pending Your Approval
                                  </p>
                                ) : (
                                  <div className="mt-3 flex gap-2 justify-center">
                                    <button
                                      onClick={() => {
                                        handleChange("user_discount", index, "");
                                        handleChange("auto_discount_status", index, "pending");
                                      }}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 px-3 rounded w-full border border-slate-700 text-[10px]"
                                    >
                                      Reset to Auto
                                    </button>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help text-[8px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1 group/audit mt-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-50 group-hover/audit:opacity-100 transition-opacity"
                                  >
                                    <path d="m21 16-4 4-4-4" />
                                    <path d="M17 20V4" />
                                    <path d="m3 8 4-4 4 4" />
                                    <path d="M7 4v16" />
                                  </svg>
                                  AI Logic Audit
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="w-[320px] p-6 bg-slate-950/80 backdrop-blur-2xl border border-slate-800/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] rounded-2xl ring-1 ring-white/5 text-white"
                              >
                                <div className="space-y-5">
                                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                    <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-slate-200 to-slate-500 bg-clip-text text-transparent">
                                      Logic Audit
                                    </h4>
                                    <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>
                                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                                        Live
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                      {isAutoApplied
                                        ? `The systemic CPQ engine automatically provisioned a ${displayedValue}% cost-reduction concession for this specific line item to maximize win-rate probability.`
                                        : `This ${displayedValue}% discount is currently locked in via manual override by the sales agent, superseding algorithmic recommendations.`}
                                    </p>

                                    {isAutoApplied && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-start p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                                          <div className="pr-4">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <p className="text-[11px] font-bold text-slate-100">
                                                Propensity to Buy{" "}
                                                <span className="text-amber-400/80">
                                                  ({aiInfo.intentScore}% Intent)
                                                </span>
                                              </p>
                                            </div>
                                            <p className="text-[9px] text-slate-400 leading-snug">
                                              Engine detects a {aiInfo.intentScore >= 75 ? "high" : "moderate"} purchase likelihood based on cart density & historical win-loss vectors.
                                            </p>
                                          </div>
                                          <span className="text-xs font-mono text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">
                                            +{aiInfo.productAiDiscount}%
                                          </span>
                                        </div>

                                        <div className="flex justify-between items-start p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                                          <div className="pr-4">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <p className="text-[11px] font-bold text-slate-100">
                                                Patron Loyalty{" "}
                                                <span className="text-emerald-400/80">
                                                  ({aiInfo.loyaltyLevel})
                                                </span>
                                              </p>
                                            </div>
                                            <p className="text-[9px] text-slate-400 leading-snug">
                                              Recognizes established business relationship unlocking top-tier loyalty provisioning limits.
                                            </p>
                                          </div>
                                          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                            +{aiInfo.loyaltyDiscount}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        ${netPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          value={deal.quantity?.[index] || 1}
                          type="number"
                          min="1"
                          onChange={(e) => handleChange("quantity", index, e.target.value)}
                          className="w-20 mx-auto text-center"
                        />
                      </TableCell>
                      {deal.tax_scope === "Line" && (
                        <TableCell className="text-center">
                          <Input
                            value={deal.line_taxes?.[index] ?? 0}
                            type="number"
                            min="0"
                            onChange={(e) => handleChange("line_taxes", index, e.target.value)}
                            className="w-20 mx-auto text-center"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-right font-bold align-middle">
                        <motion.div key={lineBeforeTax} initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }} className="inline-block px-2 py-1 tabular-nums">
                          ${lineBeforeTax.toFixed(2)}
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Ultra-Compact Tax Configuration */}
          <div className="mt-4 mb-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tax</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 grow">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Region:</span>
                <Select value={deal.tax_region_type || "None"} onValueChange={(val) => handleChange("tax_region_type", null, val)}>
                  <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">No Tax</SelectItem>
                    <SelectItem value="Sales Tax">Sales Tax (US)</SelectItem>
                    <SelectItem value="GST">GST (IN/AU)</SelectItem>
                    <SelectItem value="VAT">VAT (EU/UK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Scope:</span>
                <Select value={deal.tax_scope || "Transaction"} onValueChange={(val) => handleChange("tax_scope", null, val)}>
                  <SelectTrigger className="h-8 text-sm min-w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transaction">Transaction-Level</SelectItem>
                    <SelectItem value="Line">Line-Level (Per SKU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Inclusion:</span>
                <Select value={deal.tax_inclusion || "Exclusive"} onValueChange={(val) => handleChange("tax_inclusion", null, val)}>
                  <SelectTrigger className="h-8 text-sm min-w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exclusive">Exclusive (+ Top)</SelectItem>
                    <SelectItem value="Inclusive">Inclusive (Built-in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(!deal.tax_scope || deal.tax_scope === "Transaction") && deal.tax_region_type !== "None" && (
                <div className="flex items-center gap-3 min-w-[160px] grow max-w-[240px]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Rate:</span>
                  <Slider.Root className="relative flex items-center select-none touch-none w-full h-4" value={[parseFloat(deal.tax_rate ?? 0)]} max={30} step={0.5} onValueChange={([val]) => handleChange("tax_rate", null, val)}>
                    <Slider.Track className="bg-slate-200 dark:bg-slate-800 relative grow rounded-full h-[4px]">
                      <Slider.Range className="absolute bg-slate-500 dark:bg-slate-400 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-3 h-3 bg-white border border-slate-500 rounded-full cursor-pointer shadow-sm" />
                  </Slider.Root>
                  <span className="text-sm font-mono font-bold">{deal.tax_rate ?? 0}%</span>
                </div>
              )}
            </div>
            <div className="ml-auto pl-4 border-l border-slate-200 dark:border-slate-800 flex flex-col items-end">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Tax Impact</span>
              <span className="text-sm font-black tabular-nums">${totals.totalTax.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 px-5 py-4 bg-slate-50 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-4 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Pricing Summary</div>
            <div className="flex gap-6 items-end">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">Subtotal</p>
                <p className="text-base font-bold tabular-nums">${totals.subtotalBeforeTax.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">
                  Tax {(!deal.tax_scope || deal.tax_scope === "Transaction") ? `(${deal.tax_rate ?? 0}%)` : "(Line)"}
                </p>
                <p className="text-base font-bold tabular-nums">${totals.totalTax.toFixed(2)}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 self-end mb-1" />
              <div className="text-right bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-[1.02] cursor-default min-w-[160px]">
                <p className="text-[10px] text-emerald-100 uppercase font-black tracking-widest mb-1.5 opacity-80">Grand Total</p>
                <p className="text-2xl font-black tabular-nums leading-none">${totals.grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onBack} className="rounded-xl px-6 border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-50">
          Back to Configure
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={deal.approved}
            className="rounded-xl px-6 border-teal-600 text-teal-600 font-bold hover:bg-teal-50 gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                disabled={deal.approved}
                className="rounded-xl px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg gap-2 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Confirm Approval
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Are you sure you want to approve this deal? Once approved, the pricing details will be locked and a formal quote will be generated.
                </p>
                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-tight">Final Price</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">${totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button variant="outline" className="rounded-xl border-slate-200" onClick={handleSave}>
                  Save as Draft
                </Button>
                <Button onClick={handleApprove} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
                  Confirm & Approve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

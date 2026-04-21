"use client";

import { supabase } from "../../../../utils/supabase/client";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
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




const SkeletonCard = () => (
  <div className="mb-6 border border-slate-200/50 dark:border-white/20 rounded-lg p-4 animate-pulse">
    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-6"></div>
    <div className="space-y-2">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
    </div>
    <div className="mt-6 p-4 flex flex-col items-end gap-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
      <div className="flex gap-2 flex-wrap justify-end">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
      </div>
    </div>
  </div>
);

export default function PricingDetailsPage() {

  const [dealsData, setDealsData] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dealsToShow, setDealsToShow] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dealConfig, setDealConfig] = useState([]);
 
  // --- CUSTOMER LOYALTY IDENTIFICATION FEATURE ---
  // Stores aggregated loyalty data (total orders, total spent, etc.) for each customer email
  const [customerLoyalty, setCustomerLoyalty] = useState({});

  const fetchData = async (email) => {
    if (!email) return;
    setIsLoading(true);

    const { data: deals, error: dealsError } = await supabase
      .from("Deals")
      .select("*")
      .eq("user_email", email);

    if (dealsError) {
      console.error("Error fetching deals:", dealsError);
      toast.error("Failed to fetch deals.");
      setIsLoading(false);
      return;
    }

    const activeStatuses = [
      "New",
      "Negotiation",
      "Proposal Sent",
      "Contract Sent",
      "Contacted",
      "On-hold",
    ];
    console.log("Fetching deals for email:", email, "with active statuses:", activeStatuses);
    const activeDeals = deals.filter((deal) =>
      activeStatuses.includes(deal.status)
    );

    setDealsData(activeDeals);
    setDealsToShow(activeDeals);

    // --- CUSTOMER LOYALTY IDENTIFICATION: DATA AGGREGATION ---
    // Fetch and calculate historical data for customers in active deals to determine loyalty levels
    const customerEmails = [
      ...new Set(activeDeals.map((d) => d.email).filter(Boolean)),
    ];
    if (customerEmails.length > 0) {
      const { data: allDeals, error: allDealsError } = await supabase
        .from("Deals")
        .select("email, value, status, created_at")
        .in("email", customerEmails)
        .eq("user_email", email);

      if (!allDealsError && allDeals) {
        const loyaltyMap = {};
        allDeals.forEach((deal) => {
          if (!loyaltyMap[deal.email]) {
            loyaltyMap[deal.email] = {
              total_orders: 0,
              total_spent: 0,
              last_purchase_date: null,
            };
          }
          loyaltyMap[deal.email].total_orders += 1;
          loyaltyMap[deal.email].total_spent += parseFloat(deal.value || 0);

          // Calculate historical discount for this deal
          const originalVal = parseFloat(deal.value || 0);
          const paidVal = parseFloat(deal.finalPrice || deal.value || 0);
          if (originalVal > 0) {
            const dpt = ((originalVal - paidVal) / originalVal) * 100;
            if (!loyaltyMap[deal.email].discounts) loyaltyMap[deal.email].discounts = [];
            loyaltyMap[deal.email].discounts.push(dpt);
          }

          if (deal.status === "Closed-won") {
            loyaltyMap[deal.email].won_deals = (loyaltyMap[deal.email].won_deals || 0) + 1;
          }

          const dealDate = new Date(deal.created_at);
          if (
            !loyaltyMap[deal.email].last_purchase_date ||
            dealDate > new Date(loyaltyMap[deal.email].last_purchase_date)
          ) {
            loyaltyMap[deal.email].last_purchase_date = deal.created_at;
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
      toast.error("Failed to fetch products.");
    } else if (productsData) {
      setProducts(productsData.products || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Try to get email from session first (used by CRM), then fallback to user
    const sessionStr = localStorage.getItem("session");
    const userStr = localStorage.getItem("user");

    let email = "";
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        email = sessionObj.user?.email || "";
      } catch (e) {
        console.error("Error parsing session from localStorage", e);
      }
    }

    if (!email && userStr) {
      try {
        const userObj = JSON.parse(userStr);
        email = userObj.email || "";
      } catch (e) {
        console.error("Error parsing user from localStorage", e);
      }
    }

    if (email) {
      setUserEmail(email);
    } else {
      console.warn("No user email found in localStorage (session or user keys)");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchData(userEmail);

      const channel = supabase
        .channel("deals-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Deals",
            filter: `user_email=eq.${userEmail}`,
          },
          (payload) => {
            console.log("Real-time change received!", payload);
            toast.info("Deals have been updated.");
            fetchData(userEmail);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userEmail]);

  useEffect(() => {
    if (searchTerm === null || searchTerm.trim() === "") {
      setShowSuggestions(false);
      setSearchSuggestions([]);
      return;
    }

    const suggestions = dealsData.filter(
      (deal) =>
        deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchSuggestions(suggestions);
    setShowSuggestions(true);
  }, [searchTerm, dealsData]);

  useEffect(() => {
    let result = [...dealsData];
    if (selectedProduct) {
      result = result.filter((deal) =>
        deal.products?.includes(selectedProduct)
      );
    }

    if (searchTerm) {
      const trimmedSearch = searchTerm.trim().toLowerCase();
      if (trimmedSearch) {
        if (!showSuggestions) {
          result = result.filter(
            (deal) =>
              deal.name.toLowerCase().includes(trimmedSearch) ||
              deal.title?.toLowerCase().includes(trimmedSearch)
          );
        }
      }
    }
    setDealsToShow(result);
    setDealConfig(result.map((deal) => deal.configuration || []));
  }, [searchTerm, showSuggestions, dealsData, selectedProduct]);

  // Generic handler to change numeric/string fields in dealsToShow arrays or simple keys
  const handleChange = (dealId, field, productIndex, value) => {
    setDealsToShow((prevDealsToShow) => {
      const updatedDeals = prevDealsToShow.map((deal) => {
        if (deal.id === dealId) {
          // If field is per-product array
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
            // additional_fees will be JSON strings or numbers (we accept numeric for simple UI)
          ];
          if (perProductFields.includes(field)) {
            const newFieldArray = [...(deal[field] || [])];
            while (newFieldArray.length <= productIndex) {
              // sensible defaults
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
            newFieldArray[productIndex] = value;
            return { ...deal, [field]: newFieldArray };
          } else if (
            field === "tax" ||
            field === "tax_vat" ||
            field === "tax_gst" ||
            field === "tax_excise" ||
            field === "tax_customs" ||
            field === "tax_rate" ||
            field === "tax_region_type" ||
            field === "tax_inclusion" ||
            field === "tax_scope"
          ) {
            // numeric and enum deal level fields
            return { ...deal, [field]: value };
          } else {
            // default: direct set
            return { ...deal, [field]: value };
          }
        }
        return deal;
      });
      return updatedDeals;
    });
  };

  const handleStrategyChange = (dealId, index, strategyValue) => {
    // Update the visual strategy selector
    handleChange(dealId, "pricing_strategy", index, strategyValue);
   
    // Override the discount strictly based on the chosen strategy
    if (strategyValue === "Bundled Pricing") {
       handleChange(dealId, "user_discount", index, "20");
       handleChange(dealId, "auto_discount_status", index, "accepted");
    }
    else if (strategyValue === "Competitive Pricing") {
       handleChange(dealId, "user_discount", index, "15");
       handleChange(dealId, "auto_discount_status", index, "accepted");
    }
    else if (strategyValue === "Anchor Pricing") {
       handleChange(dealId, "user_discount", index, "5");
       handleChange(dealId, "auto_discount_status", index, "accepted");
    }
    else if (strategyValue === "AI Auto") {
       handleChange(dealId, "user_discount", index, "");
       handleChange(dealId, "auto_discount_status", index, "pending");
    }
  };



  const handleSave = async (dealId) => {
    const dealToSave = dealsToShow.find((d) => d.id === dealId);
    if (!dealToSave) return;

    // Legacy fallback tax rate for storage
    const legacyTaxRate =
      parseFloat(dealToSave.tax_vat || 0) +
      parseFloat(dealToSave.tax_gst || 0) +
      parseFloat(dealToSave.tax_excise || 0) +
      parseFloat(dealToSave.tax_customs || 0);

    // Build payload: only fields we changed/added
    const payload = {
      quantity: dealToSave.quantity || [],
      discount: dealToSave.discount || [],
      user_discount: dealToSave.user_discount || [],
      labour_cost: dealToSave.labour_cost || [],
      manufacturing_cost: dealToSave.manufacturing_cost || [],
      shipping_cost: dealToSave.shipping_cost || [],
      additional_fees: dealToSave.additional_fees || [],
      tax: parseFloat(dealToSave.tax_rate ?? legacyTaxRate),
      tax_rate: parseFloat(dealToSave.tax_rate ?? legacyTaxRate),
      tax_region_type: dealToSave.tax_region_type || 'None',
      tax_inclusion: dealToSave.tax_inclusion || 'Exclusive',
      tax_scope: dealToSave.tax_scope || 'Transaction',
      line_taxes: dealToSave.line_taxes || [],
      auto_discount_status: dealToSave.auto_discount_status || [],
    };

    const { error } = await supabase
      .from("Deals")
      .update(payload)
      .eq("id", dealId);
    if (error) toast.error("Failed to save deal.");
    else toast.success(`Deal "${dealToSave.name}" saved successfully!`);
    fetchData(userEmail);
  };

  const handleApprove = async (dealId) => {
    const dealToApprove = dealsToShow.find((d) => d.id === dealId);
    if (!dealToApprove) return;

    const { subtotalBeforeTax: subtotal, totalTax, grandTotal } = getTotals(dealToApprove);

    const payload = {
      subtotal: subtotal,
      total_tax: totalTax,
      total_cost: grandTotal,
      finalPrice: grandTotal,
      approved: true,
    };

    const { error } = await supabase
      .from("Deals")
      .update(payload)
      .eq("id", dealId);
    if (error) toast.error("Failed to approve deal.");
    else {
      toast.success(
        `Deal approved with a final price of $${grandTotal.toFixed(2)}.`
      );
      fetchData(userEmail);
    }
  };

  // Calculate base price + configuration addons
  const calculateOriginalPrice = (productName, dealId, dealConfigLocal) => {
    const product = products.find((p) => p.name === productName);
    const dealIndex = dealsToShow.findIndex((d) => d.id === dealId);
    let price = parseFloat(product?.price || 0);

    if (!product && price === 0) {
      price = parseFloat(dealsToShow[dealIndex]?.value || 0);
    }

    const productIndex = dealsToShow[dealIndex]?.products.findIndex(
      (p) => p === productName
    );
    if (
      !dealConfigLocal[dealIndex] ||
      !dealConfigLocal[dealIndex][productIndex]
    ) {
      return price;
    }
    const config = dealConfigLocal[dealIndex][productIndex];
    for (const category in config) {
      price += parseFloat(config[category]?.price || 0);
    }
    return price;
  };

  const getCalculatedAIDiscount = (deal, index) => {
    const quantityNum = parseInt(deal.quantity?.[index] || 1, 10);
    const loyaltyInfo = getLoyaltyInfo(deal.email);
    const liveIntentScore = deal.intent_score
      ? parseInt(deal.intent_score)
      : Math.min(95, 45 + (quantityNum * 3) + (loyaltyInfo.total_orders * 1.5));
     
    const dataSize = (loyaltyInfo.total_orders || 0) + 1;
    const seed = String(deal.id).split('-')[0].charCodeAt(0) || 0;
    const marketVolatility = (Math.sin(seed + index) * 2);

    // --- BUNDLED PRICING LOGIC ---
    const productsInDeal = deal.products || [];
    const hasCRM = productsInDeal.includes("CRM");
    const hasAnalytics = productsInDeal.includes("Analytics");
    const hasSupport = productsInDeal.includes("Support");
   
    let bundleDiscount = 0;
    let bundleType = "None";
    if (hasCRM && hasAnalytics && hasSupport) {
      bundleDiscount = 20;
      bundleType = "Full Suite (3 core products)";
    } else if ((hasCRM && hasAnalytics) || (hasCRM && hasSupport) || (hasAnalytics && hasSupport)) {
      bundleDiscount = 10;
      bundleType = "Dual Combo (2 core products)";
    }

    // --- COMPETITIVE PRICING LOGIC ---
    let competitivePricingMod = 0;
    if (liveIntentScore > 80) competitivePricingMod = 2.5;
    else if (liveIntentScore > 50) competitivePricingMod = 1.0;

    let phase = "Phase 1: Rule-Based (Seeded)";
    let mode = "Rule Inference";
    let baseSuggested = 0;

    if (dataSize < 3) {
      if (liveIntentScore >= 75) baseSuggested = 8 - (liveIntentScore - 75) / 5;
      else if (liveIntentScore >= 50) baseSuggested = 12 - (liveIntentScore - 50) / 10;
      else baseSuggested = 18 - (liveIntentScore / 10);
    } else if (dataSize < 7) {
      phase = "Phase 2: Augmented ML (Synthetic)";
      mode = "Gradient Descent Simulation";
      const mlPrediction = 15 - (liveIntentScore / 10) + (quantityNum > 5 ? 2 : 0);
      baseSuggested = mlPrediction + marketVolatility;
    } else {
      phase = "Phase 3: Full RL / Gradient Boosting";
      mode = "Tensor-based Optimization";
      const optimizedValue = 14 - (liveIntentScore / 8) + (quantityNum * 0.5);
      baseSuggested = optimizedValue + (marketVolatility * 1.5);
    }

    const finalProductAi = Math.max(2, Math.min(45, baseSuggested));
   
    // --- ANCHOR PRICING LOGIC ---
    // Create an "Anchored" heavy list-price discount to make the final discount look better
    const anchorOriginalPriceDiscount = parseFloat(Math.min(60, bundleDiscount + competitivePricingMod + loyaltyInfo.extraDiscount + finalProductAi * 1.5).toFixed(1));

    const combinedTarget = parseFloat((finalProductAi + loyaltyInfo.extraDiscount + bundleDiscount + competitivePricingMod).toFixed(1));
    const confidence = Math.min(99, 72 + (dataSize * 3) + (liveIntentScore / 10));

    return {
      productAiDiscount: finalProductAi.toFixed(1),
      loyaltyDiscount: loyaltyInfo.extraDiscount || 0,
      bundleDiscount: bundleDiscount,
      bundleType: bundleType,
      competitiveDiscount: competitivePricingMod,
      anchorOriginalPriceDiscount: anchorOriginalPriceDiscount,
      combinedTargetDiscount: combinedTarget,
      phase, mode, volatility: marketVolatility.toFixed(1),
      confidence,
      intentScore: liveIntentScore,
      loyaltyLevel: loyaltyInfo.level
    };
  };

  const calculateLineMetrics = (deal, productName, index) => {
    const basePrice = calculateOriginalPrice(productName, deal.id, dealConfig);
    const quantity = parseInt(deal.quantity?.[index] || 1, 10);

    const statusObj = deal.auto_discount_status || [];
    const status = statusObj.length > index ? statusObj[index] : "pending";
    const userValStr = String(deal.user_discount?.[index] || "");
    const userValNum = parseFloat(userValStr.replace("%", ""));

    let finalDiscountValue = 0;

    if (status === "accepted" || status === "rejected" || (!isNaN(userValNum) && userValStr !== "0" && userValStr !== "")) {
         finalDiscountValue = isNaN(userValNum) ? 0 : userValNum;
    } else {
         const aiInfo = getCalculatedAIDiscount(deal, index);
         finalDiscountValue = aiInfo.combinedTargetDiscount;
    }

    const discountMultiplier = 1 - (finalDiscountValue / 100);

    const labour = parseFloat(deal.labour_cost?.[index] || 0);
    const manuf = parseFloat(deal.manufacturing_cost?.[index] || 0);
    const shipping = parseFloat(deal.shipping_cost?.[index] || 0);

    let otherFees = 0;
    try {
      const feeEntry = deal.additional_fees?.[index];
      if (typeof feeEntry === "number") otherFees = Number(feeEntry);
      else if (feeEntry && typeof feeEntry === "object" && feeEntry.amount)
        otherFees = Number(feeEntry.amount);
      else if (feeEntry && typeof feeEntry === "string")
        otherFees = parseFloat(feeEntry) || 0;
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

  const getTotals = (deal) => {
    if (!deal.products || deal.products.length === 0) {
       return { subtotalBeforeTax: 0, totalTax: 0, grandTotal: 0 };
    }
   
    const taxScope = deal.tax_scope || "Transaction";
    const taxInclusion = deal.tax_inclusion || "Exclusive";
   
    if (taxScope === "Line") {
      let subtotalBeforeTax = 0;
      let totalTax = 0;
      deal.products.forEach((productName, index) => {
         const { lineBeforeTax, lineTaxAmount } = calculateLineMetrics(deal, productName, index);
         subtotalBeforeTax += lineBeforeTax;
         totalTax += lineTaxAmount;
      });
      return { subtotalBeforeTax, totalTax, grandTotal: subtotalBeforeTax + totalTax };
    } else { // Transaction
      let rawSubtotal = 0;
      deal.products.forEach((productName, index) => {
         const { lineBeforeTax } = calculateLineMetrics(deal, productName, index);
         rawSubtotal += lineBeforeTax;
      });
     
      const legacyTaxRate = parseFloat(deal.tax_vat || 0) + parseFloat(deal.tax_gst || 0) + parseFloat(deal.tax_excise || 0) + parseFloat(deal.tax_customs || 0);
      const taxRate = parseFloat(deal.tax_rate ?? legacyTaxRate) / 100;
     
      let subtotalBeforeTax = rawSubtotal;
      let totalTax = 0;
      let grandTotal = rawSubtotal;

      if (taxInclusion === "Inclusive") {
         subtotalBeforeTax = rawSubtotal / (1 + taxRate);
         totalTax = rawSubtotal - subtotalBeforeTax;
         grandTotal = rawSubtotal;
      } else { // Exclusive
         totalTax = rawSubtotal * taxRate;
         grandTotal = rawSubtotal + totalTax;
      }
      return { subtotalBeforeTax, totalTax, grandTotal };
    }
  };

  // Backwards compatibility for existing JSX structure
  const calculateLineItem = (deal, productName, index) => calculateLineMetrics(deal, productName, index).lineBeforeTax;

  // --- CUSTOMER LOYALTY IDENTIFICATION: LOGIC & LEVELS ---
  // Determines loyalty level (GOLD, SILVER, BRONZE) based on order frequency
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

    const avgDiscount = data.discounts && data.discounts.length > 0
      ? data.discounts.reduce((a, b) => a + b, 0) / data.discounts.length
      : 0;

    const winRate = data.total_orders > 0
      ? ((data.won_deals || 0) / data.total_orders) * 100
      : 0;

    return { ...data, level, extraDiscount, color, avgDiscount, winRate };
  };



  return (
    <div className="w-full min-h-[70vh] relative p-4">
      <h1 className="text-3xl font-bold mb-2">Pricing Details</h1>
      <p className="text-slate-400 text-sm mb-8 font-medium italic">
        Unified Revenue Engine Standard & Pricing Module
      </p>

      <div className="w-full mb-8 relative z-50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative grow w-full md:max-w-md">
          <Input
            placeholder="Search deals..."
            value={searchTerm ? searchTerm : ""}
            type="text"
            className="w-full"
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
          />
          {showSuggestions && (
            <div className="absolute top-[110%] z-50 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg flex flex-col items-start w-full">
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((deal) => (
                  <button
                    key={deal.id}
                    className="w-full text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setSearchTerm(deal.name);
                      setShowSuggestions(false);
                    }}
                  >
                    {deal.name} -{" "}
                    <span className="text-slate-500">
                      {deal.title || "No Title"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-2 text-slate-500">No deals found.</div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Select
            onValueChange={(value) =>
              setSelectedProduct(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Products</SelectLabel>
                <SelectItem value="all">All Products</SelectItem>
                {products?.map((product, index) => (
                  <SelectItem key={index} value={product.name}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              setSearchTerm("");
              setSelectedProduct(null);
            }}
            variant="outline"
            className={`${
              searchTerm !== "" ||
              (selectedProduct !== null && selectedProduct !== "all")
                ? "opacity-100"
                : "hidden"
            }`}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : dealsToShow.length > 0 ? (
          dealsToShow.map((deal) => {
            const { subtotalBeforeTax: subtotal, grandTotal } = getTotals(deal);
            return (
              <Card
                key={deal.id}
                className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800"
              >
                <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                          {deal.name}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge className={`${deal.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} border-none text-[10px]`}>
                            {deal.approved ? 'APPROVED' : 'DRAFT'}
                          </Badge>
                          {/* Integrated Loyalty Badge directly in Header */}
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
                        <span className="text-slate-500 font-medium uppercase text-[10px] tracking-tight">{deal.status}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[11px] text-slate-500">
                          Owner: <span className="font-bold text-slate-700 dark:text-slate-300">{deal.owner || 'Unassigned'}</span>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          Account Hub:
                          <span className="font-bold text-slate-600 dark:text-slate-400">{getLoyaltyInfo(deal.email).total_orders} Orders</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="font-bold text-slate-600 dark:text-slate-400">{products[0]?.currency || "$"}{getLoyaltyInfo(deal.email).total_spent.toLocaleString()} Spent</span>
                        </span>
                      </CardDescription>
                    </div>
                        <div className="text-right p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Grand Total</div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                            {products[0]?.currency || "$"}
                            {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="flex justify-end gap-2 mt-1">
                             <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-tight">
                               Revenue Engine Standard
                             </span>
                          </div>
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
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-center">
                            Discount (%)
                          </TableHead>
                          <TableHead className="text-right">
                            Net Price
                          </TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          {deal.tax_scope === "Line" && <TableHead className="text-center">Tax (%)</TableHead>}
                          <TableHead className="text-right">
                            Line Before Tax
                          </TableHead>


                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deal.products.map((productName, index) => {
                          const productDetails = products.find(
                            (p) => p.name === productName
                          );
                          const originalPrice = calculateOriginalPrice(
                            productName,
                            deal.id,
                            dealConfig
                          );
                          const quantity = deal.quantity?.[index] || 1;
                          const discountStr = String(
                            deal.user_discount?.[index] || "0"
                          );
                          const userDiscount =
                            parseFloat(discountStr.replace("%", "")) || 0;
                          const lineBeforeTax = calculateLineItem(
                            deal,
                            productName,
                            index
                          );

                          const aiInfo = getCalculatedAIDiscount(deal, index);
                          const statusObj = deal.auto_discount_status || [];
                          let status = statusObj.length > index ? statusObj[index] : "pending";
                          const userValStr = String(deal.user_discount?.[index] || "");
                          const userValNum = parseFloat(userValStr.replace("%", ""));
                          let isAutoApplied = false;

                          if (status !== "accepted" && status !== "rejected" && (isNaN(userValNum) || userValStr === "0" || userValStr === "")) {
                              isAutoApplied = true;
                          }

                          const displayedValue = isAutoApplied ? aiInfo.combinedTargetDiscount : (isNaN(userValNum) ? "0" : userValNum);
                          const netPrice = originalPrice * (1 - (Number(displayedValue) / 100));

                          return (
                            <TableRow key={`${deal.id}-${index}`}>
                              <TableCell className="font-medium">
                                {productName}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={deal.pricing_strategy?.[index] || "AI Auto"}
                                  onValueChange={(val) => handleStrategyChange(deal.id, index, val)}
                                  disabled={deal.approved}
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-[11px] font-bold tracking-tight bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="Strategy" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AI Auto">🤖 AI Auto (Default)</SelectItem>
                                    <SelectItem value="Bundled Pricing">📦 Bundled Pricing</SelectItem>
                                    <SelectItem value="Competitive Pricing">⚔️ Competitive Pricing</SelectItem>
                                    <SelectItem value="Anchor Pricing">⚓ Anchor Pricing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                {`${productDetails?.currency || products[0]?.currency || "$"}${originalPrice.toFixed(2)}`}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={`relative flex items-center h-8 rounded-lg outline outline-1 outline-offset-[-1px] transition-all duration-300 w-[120px] mx-auto ${
                                          isAutoApplied
                                            ? 'bg-amber-50/50 dark:bg-amber-500/[0.03] outline-amber-400/40 dark:outline-amber-500/40 shadow-[0_0_15px_-3px_rgba(251,191,36,0.15)]'
                                            : 'bg-slate-50 dark:bg-slate-900/40 outline-slate-200 dark:outline-slate-800'
                                        }`}>
                                          <div className="flex-1 flex items-center border-r border-slate-200/60 dark:border-slate-800 h-full">
                                            <Input
                                              disabled={deal.approved}
                                              className={`w-full h-full p-0 bg-transparent border-none shadow-none focus-visible:ring-0 text-right font-mono text-[13px] font-black tracking-tight ${
                                                isAutoApplied
                                                  ? 'text-amber-700 dark:text-amber-400'
                                                  : 'text-slate-800 dark:text-white'
                                              }`}
                                              value={displayedValue}
                                              onChange={(e) => {
                                                handleChange(deal.id, "user_discount", index, e.target.value);
                                                handleChange(deal.id, "auto_discount_status", index, "accepted");
                                              }}
                                            />
                                            <span className={`text-[11px] pl-0.5 pr-2.5 font-bold mt-0.5 ${
                                              isAutoApplied ? 'text-amber-600/50 dark:text-amber-400/40' : 'text-slate-400 dark:text-slate-500'
                                            }`}>%</span>
                                          </div>

                                          {!deal.approved && (
                                            <div className="flex px-1 gap-0.5 shrink-0 items-center h-full">
                                              <button
                                                onClick={() => {
                                                  handleChange(deal.id, "user_discount", index, aiInfo.combinedTargetDiscount);
                                                  handleChange(deal.id, "auto_discount_status", index, "accepted");
                                                }}
                                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${
                                                  status === 'accepted'
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                                                    : 'text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                                                }`}
                                                title="Accept AI Recommendation"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                              </button>
                                              <button
                                                onClick={() => {
                                                  handleChange(deal.id, "user_discount", index, 0);
                                                  handleChange(deal.id, "auto_discount_status", index, "rejected");
                                                }}
                                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${
                                                  status === 'rejected'
                                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/30'
                                                    : 'text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-500/10'
                                                }`}
                                                title="Reject AI Recommendation"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="text-[10px] w-64 p-4 bg-slate-950 text-white border-slate-800 shadow-xl rounded-xl">
                                         <p className="font-bold border-b border-white/20 pb-2 mb-3 text-slate-300 uppercase tracking-widest text-[9px] flex items-center justify-between">
                                           Discount Anatomy <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                         </p>
                                         <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                               <span>Client Loyalty</span>
                                               <span className="text-emerald-400 font-mono text-sm">+{aiInfo.loyaltyDiscount}%</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                               <span>Product ML Suggestion</span>
                                               <span className="text-amber-400 font-mono text-sm">+{aiInfo.productAiDiscount}%</span>
                                            </div>
                                         </div>
                                         <div className="flex justify-between mt-3 pt-2 border-t border-white/20 font-black text-sm">
                                            <span>Combined Auto</span>
                                            <span>{aiInfo.combinedTargetDiscount}%</span>
                                         </div>
                                         {isAutoApplied ? (
                                           <p className="mt-3 text-amber-300 italic text-[10px] bg-amber-500/10 p-2 rounded text-center">Pending Your Approval</p>
                                         ) : (
                                           <div className="mt-3 flex gap-2 justify-center">
                                             <button
                                                onClick={() => {
                                                  handleChange(deal.id, "user_discount", index, 0);
                                                  handleChange(deal.id, "auto_discount_status", index, "pending");
                                                }}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 px-3 rounded w-full border border-slate-700"
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
                                        <div className="cursor-help text-[8px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1 group/audit">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover/audit:opacity-100 transition-opacity"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
                                          AI Logic Audit
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="w-[320px] p-6 bg-slate-950/80 backdrop-blur-2xl border border-slate-800/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] rounded-2xl ring-1 ring-white/5">
                                        <div className="space-y-5">
                                          <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-slate-200 to-slate-500 bg-clip-text text-transparent">Logic Audit</h4>
                                            <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>
                                              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">Live</span>
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
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                        <p className="text-[11px] font-bold text-slate-100">Propensity to Buy <span className="text-amber-400/80">({aiInfo.intentScore}% Intent)</span></p>
                                                      </div>
                                                      <p className="text-[9px] text-slate-400 leading-snug">Engine detects a {aiInfo.intentScore >= 75 ? "high" : "moderate"} purchase likelihood based on cart density & historical win-loss vectors.</p>
                                                   </div>
                                                   <span className="text-xs font-mono text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded shadow-sm">+{aiInfo.productAiDiscount}%</span>
                                                </div>
                                               
                                                <div className="flex justify-between items-start p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                                                   <div className="pr-4">
                                                      <div className="flex items-center gap-1.5 mb-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                                                        <p className="text-[11px] font-bold text-slate-100">Patron Loyalty <span className="text-emerald-400/80">({aiInfo.loyaltyLevel})</span></p>
                                                      </div>
                                                      <p className="text-[9px] text-slate-400 leading-snug">Recognizes established business relationship unlocking top-tier loyalty provisioning limits.</p>
                                                   </div>
                                                   <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded shadow-sm">+{aiInfo.loyaltyDiscount}%</span>
                                                </div>

                                                {aiInfo.bundleDiscount > 0 && (
                                                  <div className="flex justify-between items-start p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                                                    <div className="pr-4">
                                                      <div className="flex items-center gap-1.5 mb-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                                                        <p className="text-[11px] font-bold text-slate-100">Bundle Savings <span className="text-purple-400/80">({aiInfo.bundleType})</span></p>
                                                      </div>
                                                      <p className="text-[9px] text-slate-400 leading-snug">Automatically applied multi-product volume pricing logic.</p>
                                                    </div>
                                                    <span className="text-xs font-mono text-purple-400 font-bold bg-purple-400/10 px-1.5 py-0.5 rounded shadow-sm">+{aiInfo.bundleDiscount}%</span>
                                                  </div>
                                                )}

                                                {aiInfo.competitiveDiscount > 0 && (
                                                  <div className="flex justify-between items-start p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                                                    <div className="pr-4">
                                                      <div className="flex items-center gap-1.5 mb-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400"><path d="M14.5 4h5v5"/><path d="m19.5 4-4 4"/><path d="M9.5 20h-5v-5"/><path d="m4.5 20 4-4"/><path d="M14.5 20h5v-5"/><path d="m19.5 20-4-4"/><path d="M9.5 4h-5v5"/><path d="m4.5 4 4 4"/></svg>
                                                        <p className="text-[11px] font-bold text-slate-100">Competitive Adjust <span className="text-rose-400/80">(Win-Mod)</span></p>
                                                      </div>
                                                      <p className="text-[9px] text-slate-400 leading-snug">Aggressive market modifier applied to lock in high intent deals.</p>
                                                    </div>
                                                    <span className="text-xs font-mono text-rose-400 font-bold bg-rose-400/10 px-1.5 py-0.5 rounded shadow-sm">+{aiInfo.competitiveDiscount}%</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            <div className="pt-4 border-t border-white/10 flex justify-between items-center bg-slate-900/40 -mx-6 px-6 -mb-6 rounded-b-2xl pb-5">
                                              <div>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-0.5">Final Computed Discount</span>
                                                <span className="text-[9px] text-slate-500">Applied to line before tax</span>
                                              </div>
                                              <span className="text-xl font-black text-white px-2 py-1 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">-{displayedValue}%</span>
                                            </div>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                                {`${productDetails?.currency || products[0]?.currency || "$"}${netPrice.toFixed(2)}`}
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  value={deal.quantity?.[index] || 1}
                                  disabled={
                                    deal.finalPrice > 0 &&
                                    deal.finalPrice !== null &&
                                    deal.finalPrice !== undefined
                                  }
                                  type="number"
                                  min="1"
                                  onChange={(e) =>
                                    handleChange(
                                      deal.id,
                                      "quantity",
                                      index,
                                      e.target.value
                                    )
                                  }
                                  className="w-20 mx-auto text-center"
                                />
                              </TableCell>
                              {deal.tax_scope === "Line" && (
                                <TableCell className="text-center">
                                  <Input
                                    value={deal.line_taxes?.[index] ?? 0}
                                    disabled={
                                      deal.finalPrice > 0 &&
                                      deal.finalPrice !== null &&
                                      deal.finalPrice !== undefined
                                    }
                                    type="number"
                                    min="0"
                                    onChange={(e) => handleChange(deal.id, "line_taxes", index, e.target.value)}
                                    className="w-20 mx-auto text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                  />
                                </TableCell>
                              )}
                              <TableCell className="text-right font-bold align-middle">
                                <motion.div
                                  key={lineBeforeTax}
                                  initial={{ scale: 1.1 }}
                                  animate={{ scale: 1, color: 'inherit' }}
                                  transition={{ duration: 0.4 }}
                                  className="inline-block px-2 py-1 rounded-md"
                                >
                                  {`${productDetails?.currency || products[0]?.currency || "$"}${lineBeforeTax.toFixed(2)}`}
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M14.5 4h5v5"/><path d="m9.5 20h-5v-5"/><path d="m4 4 16 16"/></svg>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Tax</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 grow">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Region:</span>
                        <Select value={deal.tax_region_type || "None"} onValueChange={(val) => handleChange(deal.id, "tax_region_type", null, val)}>
                          <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 px-2 font-medium min-w-[120px]">
                            <SelectValue/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">No Tax / Custom</SelectItem>
                            <SelectItem value="Sales Tax">Sales Tax (US)</SelectItem>
                            <SelectItem value="GST">GST (IN/AU)</SelectItem>
                            <SelectItem value="VAT">VAT (EU/UK)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Scope:</span>
                        <Select value={deal.tax_scope || "Transaction"} onValueChange={(val) => handleChange(deal.id, "tax_scope", null, val)}>
                          <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 px-2 font-medium min-w-[130px]">
                            <SelectValue/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Transaction">Transaction-Level</SelectItem>
                            <SelectItem value="Line">Line-Level (Per SKU)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Inclusion:</span>
                        <Select value={deal.tax_inclusion || "Exclusive"} onValueChange={(val) => handleChange(deal.id, "tax_inclusion", null, val)}>
                          <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 px-2 font-medium min-w-[130px]">
                            <SelectValue/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Exclusive">Exclusive (+ Top)</SelectItem>
                            <SelectItem value="Inclusive">Inclusive (Built-in)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(!deal.tax_scope || deal.tax_scope === "Transaction") && deal.tax_region_type !== "None" && (
                        <div className="flex items-center gap-3 min-w-[160px] grow max-w-[240px]">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Rate:</span>
                          <Slider.Root
                            className="relative flex items-center select-none touch-none w-full h-4"
                            value={[parseFloat(deal.tax_rate ?? 0)]}
                            max={30}
                            step={0.5}
                            onValueChange={([val]) => handleChange(deal.id, "tax_rate", null, val)}
                          >
                            <Slider.Track className="bg-slate-200 dark:bg-slate-800 relative grow rounded-full h-[4px]">
                              <Slider.Range className="absolute bg-slate-500 dark:bg-slate-400 rounded-full h-full" />
                            </Slider.Track>
                            <Slider.Thumb className="block w-3 h-3 bg-white border border-slate-500 dark:border-slate-400 shadow-sm rounded-full focus:outline-none cursor-pointer" />
                          </Slider.Root>
                          <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 min-w-[40px] text-right">{deal.tax_rate ?? 0}%</span>
                        </div>
                      )}
                    </div>

                    <div className="ml-auto pl-4 border-l border-slate-200 dark:border-slate-800 flex flex-col items-end">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Tax Impact</span>
                       <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{products[0]?.currency || "$"}{getTotals(deal).totalTax.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="mt-3 px-5 py-4 bg-slate-50 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                      Pricing Summary
                    </div>
                    <div className="flex gap-6 items-end">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">Subtotal</p>
                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                          {products[0]?.currency || "$"}{getTotals(deal).subtotalBeforeTax.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">
                          Tax {(!deal.tax_scope || deal.tax_scope === "Transaction") ? `(${deal.tax_rate ?? 0}%)` : "(Line)"}
                        </p>
                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                          {products[0]?.currency || "$"}{getTotals(deal).totalTax.toFixed(2)}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 self-end mb-1"/>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Grand Total</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {products[0]?.currency || "$"}{getTotals(deal).grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-8">
                    <Button onClick={() => handleSave(deal.id)}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </CardContent>

                <CardFooter className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSave(deal.id)}
                    disabled={
                      deal.finalPrice > 0 &&
                      deal.finalPrice !== null &&
                      deal.finalPrice !== undefined
                    }
                  >
                    Save Draft
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                       <Button
                        disabled={
                          deal.finalPrice > 0 &&
                          deal.finalPrice !== null &&
                          deal.finalPrice !== undefined
                        }
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white"
                      >
                        Approve Deal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <div className="p-4">
                        <h2 className="text-lg font-bold mb-4">
                          Confirm Approval
                        </h2>
                        <p>
                          Are you sure you want to approve this deal? After you
                          confirm, the details cannot be changed.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="border-slate-200 dark:border-slate-700"
                          onClick={() => handleSave(deal.id)}
                        >
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => handleApprove(deal.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          Confirm Approval
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>


                </CardFooter>
              </Card >
            );
})
        ) : (
  <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
    <p className="text-slate-500 text-lg">
      No active deals match your filters.
    </p>
    <Button
      variant="link"
      onClick={() => {
        setSearchTerm("");
        setSelectedProduct(null);
      }}
    >
      Clear all filters
    </Button>
  </div>
)}
      </div >
    </div >
  );
}
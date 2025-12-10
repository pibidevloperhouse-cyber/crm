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
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const triggerRef = useRef({});
  const [dealsData, setDealsData] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dealsToShow, setDealsToShow] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [intentScore, setIntentScore] = useState("");
  const [dealConfig, setDealConfig] = useState([]);

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
      "Contacted",
      "On-hold",
    ];
    const activeDeals = deals.filter((deal) =>
      activeStatuses.includes(deal.status)
    );

    setDealsData(activeDeals);
    setDealsToShow(activeDeals);

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
    const user = localStorage.getItem("user");
    if (user) {
      const userObj = JSON.parse(user);
      setUserEmail(userObj.email);
    } else {
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
    const updatedDeals = dealsToShow.map((deal) => {
      if (deal.id === dealId) {
        // If field is per-product array
        const perProductFields = [
          "quantity",
          "user_discount",
          "discount",
          "labour_cost",
          "manufacturing_cost",
          "shipping_cost",
          // additional_fees will be JSON strings or numbers (we accept numeric for simple UI)
        ];
        if (perProductFields.includes(field)) {
          const newFieldArray = [...(deal[field] || [])];
          while (newFieldArray.length <= productIndex) {
            // sensible defaults
            if (field === "quantity") newFieldArray.push(1);
            else if (
              field === "labour_cost" ||
              field === "manufacturing_cost" ||
              field === "shipping_cost"
            )
              newFieldArray.push(0);
            else newFieldArray.push(field === "discount" ? "0%" : "0");
          }
          newFieldArray[productIndex] = value;
          return { ...deal, [field]: newFieldArray };
        } else if (field === "tax" || field === "margin_percent") {
          // numeric deal level
          return { ...deal, [field]: value };
        } else {
          // default: direct set
          return { ...deal, [field]: value };
        }
      }
      return deal;
    });
    setDealsToShow(updatedDeals);
  };

  const handleIntentChange = async (dealId, intentScore, index) => {
    const { data, error } = await supabase
      .from("Deals")
      .update({
        intent_score: intentScore,
      })
      .eq("id", dealId);
    if (error) {
      console.error("Error updating intent score:", error);
      toast.error("Failed to update intent score.");
    }
    setIntentScore("");
    fetchData(userEmail);
    handleGeneratePrice(dealId, index);
  };

  const handleSave = async (dealId) => {
    const dealToSave = dealsToShow.find((d) => d.id === dealId);
    if (!dealToSave) return;

    // Build payload: only fields we changed/added
    const payload = {
      quantity: dealToSave.quantity || [],
      discount: dealToSave.discount || [],
      user_discount: dealToSave.user_discount || [],
      labour_cost: dealToSave.labour_cost || [],
      manufacturing_cost: dealToSave.manufacturing_cost || [],
      shipping_cost: dealToSave.shipping_cost || [],
      additional_fees: dealToSave.additional_fees || [],
      tax: dealToSave.tax || 0,
      margin_percent: dealToSave.margin_percent || 0,
      // subtotal, total_tax, total_cost and finalPrice will be calculated and updated on approve
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

    const grandTotal = calculateGrandTotal(dealToApprove); // includes tax
    const subtotal = calculateSubtotal(dealToApprove);
    const totalTax = Number((grandTotal - subtotal).toFixed(2));

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
    let price = parseFloat(product?.price || 0);
    const dealIndex = dealsToShow.findIndex((d) => d.id === dealId);
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

  // Calculate a single product line total before tax (includes costs & discounts)
  const calculateLineItem = (deal, productName, index) => {
    const productDetails = products.find((p) => p.name === productName);
    if (!productDetails) return 0;

    const basePrice = calculateOriginalPrice(productName, deal.id, dealConfig);
    const quantity = parseInt(deal.quantity?.[index] || 1, 10);

    // parse discounts
    const discountStr = String(deal.user_discount?.[index] || "0");
    const discountValue = parseFloat(discountStr.replace("%", "")) || 0;
    const discountMultiplier = 1 - discountValue / 100;

    // additional costs per product (numeric)
    const labour = parseFloat(deal.labour_cost?.[index] || 0);
    const manuf = parseFloat(deal.manufacturing_cost?.[index] || 0);
    const shipping = parseFloat(deal.shipping_cost?.[index] || 0);

    // additional_fees may be stored as numeric or JSON. Handle common cases:
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

    // cost before tax (per unit)
    const perUnitCost = basePrice + labour + manuf + shipping + otherFees;
    const lineBeforeTax = perUnitCost * quantity * discountMultiplier;

    return lineBeforeTax;
  };

  const calculateSubtotal = (deal) => {
    if (!deal.products || deal.products.length === 0) return 0;
    const subtotal = deal.products.reduce((total, productName, index) => {
      const line = calculateLineItem(deal, productName, index);
      return total + line;
    }, 0);
    return subtotal;
  };

  // Grand total includes tax (deal.tax_rate) and optionally margin adjustments
  const calculateGrandTotal = (deal) => {
    const subtotal = calculateSubtotal(deal);
    const taxRate = parseFloat(deal.tax || 0);
    const totalTax = subtotal * (taxRate / 100);
    let grand = subtotal + totalTax;

    // If a margin_percent is set, we can add margin on top (optional)
    const marginPercent = parseFloat(deal.margin_percent || 0);
    if (!isNaN(marginPercent) && marginPercent > 0) {
      grand = grand * (1 + marginPercent / 100);
    }

    return Number(grand || 0);
  };

  const handleGeneratePrice = async (dealId, productIndex) => {
    const deal = dealsToShow.find((d) => d.id === dealId);
    const intentScore = deal.intent_score;
    if (!intentScore) {
      setIntentScore("");
      triggerRef.current[dealId]?.click();
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:5000/get_discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent_score: intentScore }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      const suggestedDiscount = data.suggested_discount;

      await fetch("http://127.0.0.1:5000/update_discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: dealId,
          product_index: productIndex,
          discount_value: suggestedDiscount,
        }),
      });

      toast.success("Suggested discount saved.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch or save suggested price.");
    }
    fetchData(userEmail);
  };

  return (
    <div className="w-full min-h-[70vh] relative p-4">
      <h1 className="text-3xl font-bold mb-2">Pricing Details</h1>
      <p className="text-slate-500 mb-8">
        Manage pricing, discounts, quantities, costs and taxes for your deals.
      </p>

      <div className="w-full mb-8 relative z-[50] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-grow w-full md:max-w-md">
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
            const grandTotal = calculateGrandTotal(deal);
            const subtotal = calculateSubtotal(deal);
            return (
              <Card
                key={deal.id}
                className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800"
              >
                <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                        {deal.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {deal.title || "No Title"} •{" "}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {deal.status}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">Grand Total</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {products[0]?.currency || "$"}
                        {grandTotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Subtotal: {products[0]?.currency || "$"}
                        {subtotal.toFixed(2)} • Tax: {deal.tax || 0}%
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Deal Tax (%)</label>
                      <Input
                        value={deal.tax || 0}
                        onChange={(e) =>
                          handleChange(deal.id, "tax", null, e.target.value)
                        }
                        className="w-24 text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Margin (%)</label>
                      <Input
                        value={deal.margin_percent || 0}
                        onChange={(e) =>
                          handleChange(
                            deal.id,
                            "margin_percent",
                            null,
                            e.target.value
                          )
                        }
                        className="w-24 text-center"
                      />
                    </div>
                  </div>

                  {!deal.products || deal.products.length === 0 ? (
                    <p>This deal has no products assigned.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-center">
                            Discount (%)
                          </TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">
                            Line Before Tax
                          </TableHead>
                          <TableHead className="text-center">
                            Costs (Labour/Manufacturing/Shipping/Other)
                          </TableHead>
                          <TableHead className="text-center">Actions</TableHead>
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

                          return (
                            <TableRow key={`${deal.id}-${index}`}>
                              <TableCell className="font-medium">
                                {productName}
                              </TableCell>
                              <TableCell className="text-right">
                                {productDetails
                                  ? `${
                                      productDetails.currency || "$"
                                    }${originalPrice.toFixed(2)}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Input
                                    disabled={
                                      deal.finalPrice > 0 &&
                                      deal.finalPrice !== null &&
                                      deal.finalPrice !== undefined
                                    }
                                    value={deal.user_discount?.[index] || "0"}
                                    onChange={(e) =>
                                      handleChange(
                                        deal.id,
                                        "user_discount",
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className="w-20 text-center"
                                  />
                                  <Input
                                    disabled
                                    value={deal.discount?.[index] || "0%"}
                                    className="w-20 text-center bg-slate-100 dark:bg-slate-700"
                                    title="ML Suggestion"
                                  />
                                </div>
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
                              <TableCell className="text-right font-bold">
                                {productDetails
                                  ? `${
                                      productDetails.currency || "$"
                                    }${lineBeforeTax.toFixed(2)}`
                                  : "N/A"}
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex gap-2 flex-wrap justify-center">
                                  <Input
                                    value={deal.labour_cost?.[index] ?? 0}
                                    onChange={(e) =>
                                      handleChange(
                                        deal.id,
                                        "labour_cost",
                                        index,
                                        e.target.value
                                      )
                                    }
                                    placeholder="labour"
                                    className="w-20 text-center"
                                  />
                                  <Input
                                    value={
                                      deal.manufacturing_cost?.[index] ?? 0
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        deal.id,
                                        "manufacturing_cost",
                                        index,
                                        e.target.value
                                      )
                                    }
                                    placeholder="manufacturing"
                                    className="w-20 text-center"
                                  />
                                  <Input
                                    value={deal.shipping_cost?.[index] ?? 0}
                                    onChange={(e) =>
                                      handleChange(
                                        deal.id,
                                        "shipping_cost",
                                        index,
                                        e.target.value
                                      )
                                    }
                                    placeholder="shipping"
                                    className="w-20 text-center"
                                  />
                                  <Input
                                    value={deal.additional_fees?.[index] ?? ""}
                                    onChange={(e) =>
                                      handleChange(
                                        deal.id,
                                        "additional_fees",
                                        index,
                                        e.target.value
                                      )
                                    }
                                    placeholder="other"
                                    className="w-20 text-center"
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleGeneratePrice(deal.id, index)
                                    }
                                    disabled={
                                      deal.finalPrice > 0 &&
                                      deal.finalPrice !== null &&
                                      deal.finalPrice !== undefined
                                    }
                                  >
                                    Suggest
                                  </Button>
                                  {/* Hidden Trigger for Intent Score Dialog */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        ref={(element) => {
                                          triggerRef.current[deal.id] = element;
                                        }}
                                        className="hidden"
                                      >
                                        Hidden
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogTitle>
                                        Missing Intent Score
                                      </DialogTitle>
                                      <DialogDescription>
                                        Enter intent score (1-100) for{" "}
                                        {deal.name}
                                      </DialogDescription>
                                      <Input
                                        value={intentScore}
                                        onChange={(e) =>
                                          setIntentScore(e.target.value)
                                        }
                                        placeholder="Score"
                                      />
                                      <DialogFooter>
                                        <Button
                                          onClick={() =>
                                            handleIntentChange(
                                              deal.id,
                                              intentScore,
                                              index
                                            )
                                          }
                                        >
                                          Submit
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-4 text-right">
                    <div>
                      Subtotal: {products[0]?.currency || "$"}
                      {subtotal.toFixed(2)}
                    </div>
                    <div>
                      Tax ({deal.tax || 0}%): {products[0]?.currency || "$"}
                      {(subtotal * (parseFloat(deal.tax || 0) / 100)).toFixed(
                        2
                      )}
                    </div>
                    <div className="text-lg font-bold">
                      Total: {products[0]?.currency || "$"}
                      {grandTotal.toFixed(2)}
                    </div>
                  </div>

                  <DialogFooter>
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
                        className="bg-green-600 hover:bg-green-700 text-white"
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
                          onClick={() => handleApprove(deal.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Confirm Approval
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
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
      </div>
    </div>
  );
}

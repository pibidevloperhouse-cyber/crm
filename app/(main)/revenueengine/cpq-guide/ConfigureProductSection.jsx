"use client";

import { supabase } from "../../../../utils/supabase/client";
import { useEffect, useState } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ProductConfigCard } from "@/components/ProductConfig";
import { Settings, Search, CheckCircle } from "lucide-react";

const SkeletonCard = () => (
  <div className="mb-6 border border-slate-200/50 dark:border-white/20 rounded-lg p-4 animate-pulse">
    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-6"></div>
    <div className="space-y-2">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
    </div>
  </div>
);

export default function ConfigureProductSection({ onDealSelect, onNext }) {
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
  const [activeDealId, setActiveDealId] = useState(null);

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
      setDealsToShow(result);
      setDealConfig(result.map((deal) => deal.configuration || []));
    }
  }, [searchTerm, showSuggestions, dealsData, selectedProduct]);

  const handleSaveConfiguration = async (dealId, currentConfig) => {
    const dealIndex = dealsToShow.findIndex((d) => d.id === dealId);
    const { error } = await supabase
      .from("Deals")
      .update({ configuration: currentConfig[dealIndex] })
      .eq("id", dealId);
    if (error) {
      console.error("Error saving configurations:", error);
      toast.error("Failed to save configurations.");
    } else {
      toast.success("Configurations saved successfully.");
      fetchData(userEmail);
    }
  };

  const selectDeal = (dealId) => {
    setActiveDealId(dealId);
    onDealSelect(dealId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="bg-teal-500/10 text-teal-700 p-2 rounded-lg">Level 1</span>
            Configure Products
          </h2>
          <p className="text-slate-500 text-sm mt-1">Select a deal and customize its product offerings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Deal Selection */}
        <div className="md:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search deals..."
              value={searchTerm || ""}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              className="pl-10"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
            {isLoading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />)
            ) : dealsToShow.length > 0 ? (
              dealsToShow.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => selectDeal(deal.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border",
                    activeDealId === deal.id
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "bg-white border-slate-100 dark:bg-slate-900/50 dark:border-slate-800 hover:border-blue-300"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{deal.name}</span>
                    {activeDealId === deal.id && <CheckCircle className="h-4 w-4 text-blue-500" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{deal.title || "No Title"}</p>
                </button>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 italic">No deals found.</div>
            )}
          </div>
        </div>

        {/* Right Column: Configuration */}
        <div className="md:col-span-2">
          {activeDealId ? (
            <div className="space-y-6">
              {dealsToShow
                .filter((d) => d.id === activeDealId)
                .map((deal) => (
                  <Card key={deal.id} className="border-none shadow-none bg-transparent">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-xl">Configuration for {deal.name}</CardTitle>
                      <CardDescription>
                        {deal.products?.length || 0} Products assigned to this deal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {!deal.products || deal.products.length === 0 ? (
                          <div className="col-span-full p-10 text-center border-2 border-dashed rounded-3xl text-slate-500">
                            No products assigned to this deal.
                          </div>
                        ) : (
                          deal.products.map((productName, productIndex) => {
                            const product = products.find((p) => p.name === productName);
                            return (
                              <div key={productIndex} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold text-lg">{productName}</h3>
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-600 bg-teal-50 dark:bg-teal-900/20">
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent className="md:min-w-[50vw] overflow-y-auto">
                                      <SheetHeader>
                                        <SheetTitle>Configure {productName}</SheetTitle>
                                      </SheetHeader>
                                      <ProductConfigCard
                                        product={product}
                                        productIndex={productIndex}
                                        dealIndex={dealsToShow.findIndex((d) => d.id === deal.id)}
                                        index={productIndex}
                                        dealConfig={dealConfig}
                                        setDealConfig={setDealConfig}
                                      />
                                      <SheetFooter className="mt-6">
                                        <Button
                                          className="w-full bg-blue-600 hover:bg-blue-700"
                                          onClick={() => handleSaveConfiguration(deal.id, dealConfig)}
                                        >
                                          Save Product Config
                                        </Button>
                                      </SheetFooter>
                                    </SheetContent>
                                  </Sheet>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                                  Configure features and options for this product.
                                </p>
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                                  Base Price: ${product?.price || 0}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-slate-400">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <Search className="h-10 w-10" />
              </div>
              <p className="text-lg font-medium">Select a deal from the left</p>
              <p className="text-sm">to start configuring products</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
import { toast } from "react-toastify";
import QuotePreview from "@/components/QuotePreview";
import { FileText, Package, DollarSign, Calendar, TrendingUp, Search, Filter, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const SkeletonCard = () => (
  <div className="mb-6 border border-[#25C2A0]/10 dark:border-slate-700 rounded-3xl p-6 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md animate-pulse">
    <div className="flex justify-between mb-8">
      <div>
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
      <div className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
      <div className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
    </div>
    <div className="mt-6 flex justify-end">
      <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
    </div>
  </div>
);

export default function PreviewQuotePage() {
  const [dealsData, setDealsData] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dealsToShow, setDealsToShow] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        .channel("deals-channel-preview")
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
  }, [searchTerm, showSuggestions, dealsData, selectedProduct]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#E9FDF9] via-[#C8F4EE] to-[#B2E8F7] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8 rounded-3xl">
      <div className="relative mb-6">
        <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-[#25C2A0] via-[#266d61] to-[#235d76] dark:from-[#2AD4B7] dark:to-[#38BDF8] bg-clip-text text-transparent tracking-tight">
          Revenue Forecast & Quotes
        </h1>
        <p className="text-teal-900/60 dark:text-slate-400 text-lg max-w-2xl font-medium">
          Manage your deal lifecycle with precision. Generate professional quotes and track estimated revenue in real-time.
        </p>
      </div>

      <div className="w-full mb-6 relative z-[50] rounded-2xl p-1.5 flex flex-col md:flex-row gap-3 items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-[#25C2A0]/20 dark:border-slate-800/60 shadow-lg dark:shadow-none">
        <div className="relative flex-grow w-full md:max-w-lg p-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#25C2A0] transition-colors group-focus-within:text-teal-600" />
            <Input
              placeholder="Search by client name or project title..."
              value={searchTerm ? searchTerm : ""}
              type="text"
              className="w-full pl-10 h-11 bg-white/60 dark:bg-slate-950 border-none rounded-xl focus-visible:ring-[#25C2A0]/30 transition-all shadow-sm"
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
            />
          </div>
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-[110%] left-2 z-50 p-2 bg-white/95 dark:bg-slate-900 border border-[#25C2A0]/30 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col items-start w-[calc(100%-16px)]"
              >
                {searchSuggestions.length > 0 ? (
                  searchSuggestions.map((deal) => (
                    <button
                      key={deal.id}
                      className="w-full text-left p-3 rounded-lg hover:bg-[#25C2A0]/10 dark:hover:bg-teal-900/20 transition-colors flex items-center justify-between group"
                      onClick={() => {
                        setSearchTerm(deal.name);
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-teal-900 dark:text-slate-200">{deal.name}</span>
                        <span className="text-xs text-teal-600/60 dark:text-slate-400">{deal.title || "Untitled Project"}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-slate-500 flex items-center gap-2 w-full justify-center italic">
                    <Search className="h-4 w-4 opacity-30" />
                    No deals match your search
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 w-full md:w-auto p-2">
          <div className="relative flex items-center w-full md:w-auto">
            <Filter className="absolute left-3 h-4 w-4 text-[#25C2A0] z-10 hidden md:block" />
            <Select
              onValueChange={(value) =>
                setSelectedProduct(value === "all" ? null : value)
              }
            >
              <SelectTrigger className="w-full md:min-w-[180px] h-10 md:pl-9 bg-white/60 dark:bg-slate-950 border-none rounded-xl shadow-sm focus:ring-1 focus:ring-[#25C2A0]/30 text-xs font-bold text-teal-900 dark:text-slate-200">
                <SelectValue placeholder="Product Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                <SelectGroup>
                  <SelectLabel className="text-xs uppercase text-slate-400 font-bold p-3">Available Products</SelectLabel>
                  <SelectItem value="all" className="rounded-lg m-1">All Portfolio</SelectItem>
                  {products?.map((product, index) => (
                    <SelectItem key={index} value={product.name} className="rounded-lg m-1">
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              setSearchTerm("");
              setSelectedProduct(null);
            }}
            variant="ghost"
            size="icon"
            className={`h-11 w-11 rounded-xl bg-white/60 dark:bg-slate-950 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${searchTerm !== "" ||
              (selectedProduct !== null && selectedProduct !== "all")
              ? "opacity-100"
              : "hidden"
              }`}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </motion.div>
          ) : dealsToShow.length > 0 ? (
            dealsToShow.map((deal, index) => {
              const totalValue = deal.products?.reduce((sum, _, i) => sum + (Number(deal.value?.[i] || 0) * Number(deal.quantity?.[i] || 1)), 0) || 0;

              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Card
                    className="overflow-hidden border border-[#25C2A0]/10 shadow-lg dark:shadow-none bg-white/40 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl group hover:shadow-[#25C2A0]/5 transition-all duration-300"
                  >
                    <CardHeader className="relative overflow-hidden p-5 pb-2">
                      {/* Decorative Mesh Gradient Background */}
                      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#E9FDF9]/80 to-[#B2E8F7]/50 dark:from-teal-900/10 dark:to-blue-900/10 opacity-60 group-hover:opacity-100 transition-opacity" />

                      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-6 w-full relative z-10">
                        <div className="flex-grow space-y-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            <CardTitle className="text-xl font-black text-[#1e7e68] dark:text-teal-400 tracking-tight">
                              {deal.name}
                            </CardTitle>
                            <Badge variant="outline" className="bg-white/80 dark:bg-teal-900/20 text-[#25C2A0] dark:text-teal-400 border-[#25C2A0]/30 font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase backdrop-blur-sm">
                              ID: {String(deal.id).slice(-6)}
                            </Badge>
                          </div>
                          <CardDescription className="text-teal-800 font-semibold text-sm flex items-center gap-2 opacity-70">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#25C2A0] animate-pulse" />
                            {deal.title || "Cloud Strategic Project"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={`${deal.status === 'Negotiation' ? 'bg-rose-500' :
                            deal.status === 'Proposal Sent' ? 'bg-emerald-500' :
                              deal.status === 'On-hold' ? 'bg-amber-500' :
                                'bg-teal-500'
                            } text-white border-none font-black px-4 py-1.5 text-[10px] rounded-full shadow-md dark:shadow-none tracking-wider`}>
                            {deal.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Products Section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-[#E9FDF9] dark:bg-teal-950 rounded-lg text-[#25C2A0]">
                              <Package className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-black text-[#266d61] dark:text-teal-500 uppercase tracking-widest">Items List</span>
                          </div>



                          <div className="grid grid-cols-1 gap-3">
                            {deal.products?.length > 0 ? (
                              deal.products.map((prod, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-900/40 border border-[#25C2A0]/10 dark:border-slate-800/60 rounded-xl hover:bg-white transition-all">
                                  <span className="text-sm font-bold text-teal-900 dark:text-slate-200">{prod}</span>
                                  <div className="bg-gradient-to-r from-[#25C2A0] to-[#2AD4B7] text-white px-2 py-1 rounded-lg text-xs font-black">
                                    x{deal.quantity?.[i] || 1}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl text-center text-xs text-slate-400">
                                No Items Configured
                              </div>
                            )}
                          </div>


                        </div>

                        {/* Financial Analytics */}
                        <div className="space-y-2 md:border-l border-[#25C2A0]/10 dark:border-slate-800 md:pl-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-[#E9FDF9] dark:bg-emerald-950 rounded-lg text-emerald-500">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-black text-[#266d61] dark:text-emerald-500 uppercase tracking-widest">Est. Value</span>
                          </div>
                          <div className="relative group/val cursor-default">
                            <p className="text-3xl font-black text-[#1e7e68] dark:text-white tabular-nums tracking-tighter">
                              ₹{totalValue.toLocaleString()}
                            </p>
                            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#E9FDF9] dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                              <TrendingUp className="h-3 w-3" />
                              Market Weight
                            </div>
                          </div>
                        </div>

                        {/* Lifecycle Timeline */}
                        <div className="space-y-2 lg:border-l border-[#25C2A0]/10 dark:border-slate-800 lg:pl-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-[#E9FDF9] dark:bg-blue-950 rounded-lg text-blue-500">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-black text-[#266d61] dark:text-blue-500 uppercase tracking-widest">Timeline</span>
                          </div>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between p-2.5 bg-white/60 dark:bg-slate-950/40 rounded-xl border border-[#25C2A0]/10 group-hover:border-[#25C2A0]/30 transition-colors">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-teal-600 uppercase">Onboarded</span>
                                <span className="font-bold text-xs text-teal-900 dark:text-slate-300">{new Date(deal.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <div className="w-7 h-7 rounded-full border border-[#25C2A0]/30 flex items-center justify-center bg-white dark:bg-slate-900">
                                <span className="text-[10px] font-black text-[#25C2A0]">1st</span>
                              </div>
                            </div>
                            {deal.valid_until && (
                              <div className="flex items-center justify-between p-2.5 bg-orange-50/30 dark:bg-orange-950/10 rounded-xl border border-orange-100/20">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-orange-400 uppercase">Expiration</span>
                                  <span className="font-bold text-xs text-orange-600 dark:text-orange-400">{new Date(deal.valid_until).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-end pt-4 border-t border-[#25C2A0]/10 dark:border-slate-800/50">
                        <QuotePreview dealId={deal.id}>
                          <Button
                            className="bg-gradient-to-r from-blue-800 to-blue-900 hover:opacity-90 text-white font-black px-8 h-10 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 group/btn"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-tight">Preview Quote</span>
                            <ArrowRight className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 -translate-x-1 group-hover/btn:translate-x-0 transition-all" />
                          </Button>
                        </QuotePreview>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/40 dark:bg-slate-900/50 backdrop-blur-md rounded-[3rem] border border-[#25C2A0]/20 dark:border-slate-800/50 shadow-xl"
            >
              <div className="h-20 w-20 bg-[#E9FDF9] dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-[#25C2A0]" />
              </div>
              <p className="text-[#1e7e68] dark:text-white text-2xl font-black tracking-tight mb-2">
                No deals found
              </p>
              <p className="text-teal-900/60 dark:text-slate-400 mb-8 max-w-xs mx-auto font-medium">
                Try adjusting your filters or search terms to find what you're looking for.
              </p>
              <Button
                variant="outline"
                className="rounded-full px-8 h-12 border-[#25C2A0] text-[#25C2A0] font-bold hover:bg-[#25C2A0] hover:text-white transition-all"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedProduct(null);
                }}
              >
                Clear Portfolio Filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}



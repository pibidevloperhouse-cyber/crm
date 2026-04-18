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
import InvoicePreview from "@/components/InvoicePreview";
import { FileText, Package, DollarSign, Calendar, TrendingUp, Search, Filter, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const SkeletonCard = () => (
    <div className="mb-6 border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-800 animate-pulse">
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
        <div className="w-full min-h-[70vh] relative p-4">
            <div className="relative mb-12">
                <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent tracking-tight">
                    Revenue Forecast & Quotes
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl font-medium">
                    Manage your deal lifecycle with precision. Generate professional quotes and track estimated revenue in real-time.
                </p>
            </div>

            <div className="w-full mb-12 relative z-[50] rounded-2xl p-2 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
                <div className="relative flex-grow w-full md:max-w-lg p-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                        <Input
                            placeholder="Search by client name or project title..."
                            value={searchTerm ? searchTerm : ""}
                            type="text"
                            className="w-full pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500/30 transition-all border-none shadow-sm"
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
                                className="absolute top-[110%] left-2 z-50 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col items-start w-[calc(100%-16px)]"
                            >
                                {searchSuggestions.length > 0 ? (
                                    searchSuggestions.map((deal) => (
                                        <button
                                            key={deal.id}
                                            className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                setSearchTerm(deal.name);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{deal.name}</span>
                                                <span className="text-xs text-slate-400">{deal.title || "Untitled Project"}</span>
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
                        <Filter className="absolute left-3 h-4 w-4 text-slate-400 z-10 hidden md:block" />
                        <Select
                            onValueChange={(value) =>
                                setSelectedProduct(value === "all" ? null : value)
                            }
                        >
                            <SelectTrigger className="w-full md:min-w-[200px] h-11 md:pl-9 bg-white dark:bg-slate-950 border-none rounded-xl shadow-sm focus:ring-1 focus:ring-indigo-500/30">
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
                        className={`h-11 w-11 rounded-xl bg-white dark:bg-slate-950 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${searchTerm !== "" ||
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
                                        className="overflow-hidden border-none shadow-[0_10px_40px_rgba(0,0,0,0.06)] dark:shadow-none bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] group"
                                    >
                                        <CardHeader className="relative overflow-hidden p-8 pb-4">
                                            {/* Decorative Mesh Gradient Background */}
                                            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50/50 to-indigo-50/30 dark:from-slate-800/20 dark:to-indigo-900/10 opacity-60 group-hover:opacity-100 transition-opacity" />

                                            <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-6 w-full relative z-10">
                                                <div className="flex-grow space-y-2">
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <CardTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            {deal.name}
                                                        </CardTitle>
                                                        <Badge variant="outline" className="bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50 font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
                                                            ID: {String(deal.id).slice(-6)}
                                                        </Badge>
                                                    </div>
                                                    <CardDescription className="text-slate-500 dark:text-slate-400 font-semibold text-base flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                                                        {deal.title || "Cloud Strategic Project"}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className={`${deal.status === 'Negotiation' ? 'bg-red-700 shadow-red-200 dark:shadow-none' :
                                                        deal.status === 'Proposal Sent' ? 'bg-green-700 shadow-green-200 dark:shadow-none' :
                                                            deal.status === 'On-hold' ? 'bg-amber-500 shadow-amber-200 dark:shadow-none' :
                                                                'bg-indigo-500 shadow-indigo-200 dark:shadow-none'
                                                        } text-white border-none font-black px-4 py-1.5 text-xs rounded-full shadow-lg`}>
                                                        {deal.status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-8 pt-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                                {/* Products Section */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-500">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Inventory List</span>
                                                    </div>



                                                    <div className="grid grid-cols-1 gap-3">
                                                        {deal.products?.length > 0 ? (
                                                            deal.products.map((prod, i) => (
                                                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{prod}</span>
                                                                    <div className="bg-indigo-600 text-white px-2 py-1 rounded-lg text-[10px] font-black">
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
                                                <div className="space-y-4 md:border-l border-slate-100 dark:border-slate-800 md:pl-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-emerald-500">
                                                            <DollarSign className="h-5 w-5" />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Estimated Value</span>
                                                    </div>
                                                    <div className="relative group/val cursor-default">
                                                        <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter group-hover:scale-105 transition-transform origin-left duration-300">
                                                            ₹{totalValue.toLocaleString()}
                                                        </p>
                                                        <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                            <TrendingUp className="h-3 w-3" />
                                                            Market Weighted
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Lifecycle Timeline */}
                                                <div className="space-y-4 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500">
                                                            <Calendar className="h-5 w-5" />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Deal Lifecycle</span>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 group-hover:border-indigo-200/30 transition-colors">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-600 uppercase">Onboarded</span>
                                                                <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(deal.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full border border-indigo-100 dark:border-indigo-900 flex items-center justify-center bg-white dark:bg-slate-900">
                                                                <span className="text-[10px] font-black text-indigo-500">1st</span>
                                                            </div>
                                                        </div>
                                                        {deal.valid_until && (
                                                            <div className="flex items-center justify-between p-3 bg-orange-50/30 dark:bg-orange-950/10 rounded-2xl border border-orange-100/20 dark:border-orange-900/20">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black text-orange-400 uppercase">Expiration</span>
                                                                    <span className="font-bold text-orange-600 dark:text-orange-400">{new Date(deal.valid_until).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                </div>
                                                                <div className="p-1 px-2 border border-orange-200 dark:border-orange-800 rounded uppercase font-black text-[8px] text-orange-500">
                                                                    Urgent
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-12 flex items-center justify-end pt-6 border-t border-slate-100/80 dark:border-slate-800/50">


                                                <InvoicePreview dealId={deal.id}>
                                                    <Button
                                                        className="bg-blue-900 dark:bg-white hover:bg-indigo-600 dark:hover:bg-indigo-100 text-white dark:text-slate-900 font-black px-8 h-12 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2 group/btn"
                                                    >
                                                        <FileText className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" />
                                                        PREVIEW INVOICE
                                                        <ArrowRight className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all ml-1" />
                                                    </Button>
                                                </InvoicePreview>
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
                            className="text-center py-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[3rem] border border-slate-200/50 dark:border-slate-800/50 shadow-inner"
                        >
                            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-900 dark:text-white text-2xl font-black tracking-tight mb-2">
                                No deals found
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto font-medium">
                                Try adjusting your filters or search terms to find what you're looking for.
                            </p>
                            <Button
                                variant="outline"
                                className="rounded-full px-8 h-12 border-slate-200 dark:border-slate-700 font-bold"
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



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
import { Settings, Search, CheckCircle, Package, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyDropDown } from "@/components/ui/CurrencyDropDown";
import { BillingCycleSelect } from "@/components/BillingCycleSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    basePrice: "",
    currency: "",
    billingCycle: "",
    stock: "",
    description: "",
    isActive: true,
    isConfigurable: false,
    configurations: {},
  });
  const [errors, setErrors] = useState({ newProduct: {} });

  const fetchData = async (email) => {
    if (!email) return;
    setIsLoading(true);

    const { data: deals, error: dealsError } = await supabase
      .from("Deals")
      .select("*")
      .eq("user_email", email);

    if (dealsError) {
      console.error("Error fetching deals:", JSON.stringify(dealsError, null, 2), dealsError);
      toast.error(`Failed to fetch deals: ${dealsError.message || 'Unknown error'}`);
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
    if (email) {
      setUserEmail(email);
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

  const validateNewProduct = () => {
    const newErrors = {};
    if (!newProduct.name.trim()) newErrors.name = "Product name is required.";
    if (!newProduct.description.trim()) newErrors.description = "Description is required.";
    if (!newProduct.category.trim()) newErrors.category = "Category is required.";
    setErrors({ newProduct: newErrors });
    return Object.keys(newErrors).length === 0;
  };

  const addProduct = async () => {
    if (!validateNewProduct()) return;
    
    try {
      const { data: insertedProduct, error: productError } = await supabase
        .from("products")
        .insert([{
          name: newProduct.name,
          description: newProduct.description,
          category: newProduct.category,
          base_price: parseFloat(newProduct.basePrice) || 0,
          stock: parseInt(newProduct.stock) || 0,
          is_configurable: newProduct.isConfigurable,
          configurations: newProduct.configurations || {},
          user_email: userEmail,
        }])
        .select("*")
        .single();

      if (productError) throw productError;

      const productToAdd = { ...newProduct, id: insertedProduct.id };
      const updatedProductsList = [...products, productToAdd];

      const { error: userError } = await supabase
        .from("Users")
        .update({ products: updatedProductsList })
        .eq("email", userEmail);

      if (userError) throw userError;

      setProducts(updatedProductsList);

      // AUTOMATICALLY ASSIGN TO ACTIVE DEAL IF IT HAS NO PRODUCTS
      if (activeDealId) {
        const activeDeal = dealsData.find(d => d.id === activeDealId);
        const existingProducts = activeDeal?.products || [];
        const updatedDealProducts = [...existingProducts, insertedProduct.name];

        const { error: dealUpdateError } = await supabase
          .from("Deals")
          .update({ products: updatedDealProducts })
          .eq("id", activeDealId);

        if (dealUpdateError) {
          console.error("Error assigning product to deal:", dealUpdateError);
        } else {
          // Update local deals data to reflect the change
          const updatedDeals = dealsData.map(d => 
            d.id === activeDealId ? { ...d, products: updatedDealProducts } : d
          );
          setDealsData(updatedDeals);
          setDealsToShow(updatedDeals);
          
          // Inform parent about the new product status
          onDealSelect(activeDealId, true);
        }
      }

      setNewProduct({
        name: "", category: "", currency: "", basePrice: "", billingCycle: "",
        description: "", stock: "", isActive: true, isConfigurable: false, configurations: {},
      });
      setErrors({ newProduct: {} });
      toast.success("Product added and assigned to deal!");
    } catch (err) {
      console.error("Error adding product:", err);
      toast.error("Failed to add product. Please try again.");
    }
  };

  const selectDeal = (dealId) => {
    setActiveDealId(dealId);
    const deal = dealsData.find(d => d.id === dealId);
    const hasProducts = deal?.products && deal.products.length > 0;
    onDealSelect(dealId, hasProducts);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="bg-teal-500/10 text-teal-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-black">Level 1</span>
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
                          <div className="col-span-full flex flex-col items-center justify-center p-12 border border-teal-100 rounded-[2.5rem] bg-teal-50/30 text-center space-y-5">
                            <div className="bg-teal-100 p-5 rounded-full text-teal-600 shadow-inner">
                              <Package className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-teal-900">No products assigned to this deal</h3>
                              <p className="text-sm text-teal-600/80 max-w-sm mx-auto leading-relaxed">
                                This deal doesn't have any products assigned yet. You can start by adding a new product to your global catalog.
                              </p>
                            </div>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 h-12 font-bold shadow-xl shadow-teal-600/20 cursor-pointer transition-all hover:scale-105 active:scale-95">
                                  + Add New Product
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] sm:max-w-xl backdrop-blur-md bg-white/90 border border-teal-100 shadow-2xl rounded-3xl p-4 sm:p-8 overflow-y-auto max-h-[90vh]">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-bold text-slate-800">Add New Product</DialogTitle>
                                  <DialogDescription className="text-slate-500">
                                    Please fill in the details of the new product you want to add to your catalog.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-5 py-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                      <Label htmlFor="name" className="text-sm font-semibold text-slate-700 ml-1">Product Name</Label>
                                      <Input
                                        id="name"
                                        placeholder="e.g. Premium Subscription"
                                        value={newProduct.name}
                                        className="rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500"
                                        onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                                      />
                                      {errors.newProduct?.name && (
                                        <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.newProduct.name}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Label htmlFor="category" className="text-sm font-semibold text-slate-700 ml-1">Product Category</Label>
                                      <Input
                                        id="category"
                                        placeholder="e.g. Software"
                                        value={newProduct.category}
                                        className="rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500"
                                        onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
                                      />
                                      {errors.newProduct?.category && (
                                        <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.newProduct.category}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="description" className="text-sm font-semibold text-slate-700 ml-1">Product Description</Label>
                                    <Input
                                      id="description"
                                      placeholder="Briefly describe the product..."
                                      value={newProduct.description}
                                      className="rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500"
                                      onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                                    />
                                    {errors.newProduct?.description && (
                                      <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.newProduct.description}</p>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                      <Label htmlFor="stock" className="text-sm font-semibold text-slate-700 ml-1">Product Stock</Label>
                                      <Input
                                        id="stock"
                                        type="number"
                                        placeholder="0"
                                        value={newProduct.stock}
                                        className="rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500"
                                        onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: e.target.value }))}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Label htmlFor="basePrice" className="text-sm font-semibold text-slate-700 ml-1">Base Price</Label>
                                      <Input
                                        id="basePrice"
                                        placeholder="0.00"
                                        type="number"
                                        value={newProduct.basePrice}
                                        className="rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500"
                                        onChange={(e) => setNewProduct((prev) => ({ ...prev, basePrice: e.target.value }))}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 items-end">
                                    <div className="flex flex-col gap-2">
                                      <Label className="text-sm font-semibold text-slate-700 ml-1">Currency</Label>
                                      <CurrencyDropDown
                                        value={newProduct.currency}
                                        onValueChange={(value) => setNewProduct((prev) => ({ ...prev, currency: value }))}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Label className="text-sm font-semibold text-slate-700 ml-1">Billing Cycle</Label>
                                      <BillingCycleSelect
                                        value={newProduct.billingCycle}
                                        onChange={(value) => setNewProduct((prev) => ({ ...prev, billingCycle: value }))}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                                    <div className="space-y-0.5">
                                      <Label htmlFor="isConfigurable" className="text-sm font-bold text-teal-900">Enable Configuration</Label>
                                      <p className="text-xs text-teal-600/70 font-medium">Allow custom features for this product</p>
                                    </div>
                                    <Switch
                                      id="isConfigurable"
                                      checked={newProduct.isConfigurable}
                                      onCheckedChange={(value) => setNewProduct((prev) => ({ ...prev, isConfigurable: value }))}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-2xl shadow-lg shadow-teal-500/20" onClick={addProduct}>
                                    Add Product to Catalog
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-50 dark:bg-blue-900/20">
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6">
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
            <div className="h-full flex flex-col items-center justify-center p-10 border border-slate-200 dark:border-slate-800 rounded-[3rem] text-slate-400">
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

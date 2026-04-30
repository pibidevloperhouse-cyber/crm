"use client";

import { ToastContainer, toast } from "react-toastify";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  PackageSearch,
  Box,
  Package,
  Wrench,
  FlagOff,
  Edit,
  LayoutList,
  Settings2,
} from "lucide-react";
import { redirect } from "next/navigation";
import ConfigureProduct from "@/components/ConfigureProduct";
import { BillingCycleSelect } from "@/components/BillingCycleSelect";
import { CurrencyDropDown } from "@/components/ui/CurrencyDropDown";
import "react-toastify/dist/ReactToastify.css";

export default function ProductsPage() {
  // ── Shared ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "configure"
  const [userEmail, setUserEmail] = useState(null);

  // ── Inventory state ─────────────────────────────────────────────────────────
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [inventoryLoading, setInventoryLoading] = useState(true);

  // ── Configure state ─────────────────────────────────────────────────────────
  const [discontinue, setDiscontinue] = useState(false);
  const [reinstate, setReinstate] = useState(false);
  const [edit, setEdit] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [config, setConfig] = useState(false);
  const [configureLoading, setConfigureLoading] = useState(false);
  const [companyData, setCompanyData] = useState({});
  const [products, setProducts] = useState([]);
  const [configurable, setConfigurable] = useState(false);
  const today = new Date();
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
  const [editProductIndex, setEditProductIndex] = useState(null);
  const [errors, setErrors] = useState({ newProduct: {} });

  // ── Session init ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const rawSession = localStorage.getItem("session");
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) redirect("/");
      if (rawSession) {
        const session = JSON.parse(rawSession);
        setUserEmail(session?.user?.email || null);
      }
    } catch (err) {
      console.error("Session parse error:", err);
    }
  }, []);

  // ── Inventory fetch ─────────────────────────────────────────────────────────
  const fetchInventory = async () => {
    if (!userEmail) return;
    setInventoryLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_email", userEmail);
    if (!error) {
      setInventoryProducts(data);
      setFiltered(data);
    }
    setInventoryLoading(false);
  };

  useEffect(() => {
    if (userEmail) fetchInventory();
  }, [userEmail]);

  // ── Inventory filters ────────────────────────────────────────────────────────
  useEffect(() => {
    let p = [...inventoryProducts];
    if (search.trim() !== "") {
      p = p.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (category !== "all") p = p.filter((item) => item.category === category);
    const sortFunctions = {
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
      "price-asc": (a, b) => Number(a.base_price) - Number(b.base_price),
      "price-desc": (a, b) => Number(b.base_price) - Number(a.base_price),
      "stock-asc": (a, b) => a.stock - b.stock,
      "stock-desc": (a, b) => b.stock - a.stock,
    };
    p.sort(sortFunctions[sort]);
    setFiltered(p);
  }, [search, category, sort, inventoryProducts]);

  // ── Configure fetch ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("Users")
        .select("products, email")
        .eq("email", userEmail)
        .single();
      if (error) throw error;
      setCompanyData(data);
      setProducts(
        typeof data.products === "string"
          ? JSON.parse(data.products || "[]")
          : data.products || []
      );
    } catch (err) {
      console.error("Error fetching configure data:", err);
    }
  };

  useEffect(() => {
    if (userEmail) fetchData();
  }, [userEmail]);

  // ── Configure handlers ──────────────────────────────────────────────────────
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value, stock: 0 };
    setProducts(updatedProducts);
    setCompanyData((prev) => ({ ...prev, products: updatedProducts }));

    const handleUpdate = async () => {
      const { error: userTableError } = await supabase
        .from("Users")
        .update({ ...companyData, products: updatedProducts })
        .eq("email", userEmail);
      const updatedProduct = updatedProducts[index];
      const { error: productTableError } = await supabase
        .from("products")
        .update({
          name: updatedProduct.name,
          description: updatedProduct.description,
          category: updatedProduct.category,
          base_price: updatedProduct.basePrice ? parseFloat(updatedProduct.basePrice) : null,
          stock: updatedProduct.stock,
          is_configurable: Boolean(updatedProduct.isConfigurable),
          configurations: updatedProduct.configurations || {},
          tier_pricing: updatedProduct.tierPricing ?? null,
          bundle_pricing: updatedProduct.bundlePricing ?? null,
          cost_breakdown: updatedProduct.costBreakdown ?? null,
          raw: updatedProduct.raw ?? null,
        })
        .eq("id", updatedProduct.id)
        .eq("user_email", userEmail);
      if (userTableError || productTableError) {
        toast.error("Failed to update products. Please try again.", { position: "top-right" });
      } else {
        toast.success("Products updated successfully!", { position: "top-right" });
        fetchInventory();
      }
    };
    handleUpdate();
  };

  const handleProductEditor = (index, field, value) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
    setCompanyData((prev) => ({ ...prev, products: updatedProducts }));
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
    const { data: insertedProduct, error: productError } = await supabase
      .from("products")
      .insert([{
        name: newProduct.name,
        description: newProduct.description,
        category: newProduct.category,
        base_price: parseFloat(newProduct.basePrice),
        stock: parseInt(newProduct.stock),
        is_configurable: newProduct.isConfigurable,
        configurations: newProduct.configurations,
        tier_pricing: newProduct.tierPricing ?? null,
        bundle_pricing: newProduct.bundlePricing ?? null,
        cost_breakdown: newProduct.costBreakdown ?? null,
        raw: newProduct.raw ?? null,
        user_email: userEmail,
      }])
      .select("*")
      .single();

    if (productError) {
      toast.error("Failed to sync product to products table.");
      console.log(productError);
      return;
    }

    const productToAdd = { ...newProduct, id: insertedProduct.id };
    const updatedProducts = [...products, productToAdd];

    const { error: userError } = await supabase
      .from("Users")
      .update({ ...companyData, products: updatedProducts })
      .eq("email", userEmail)
      .select("*")
      .single();

    if (userError) {
      toast.error("Failed to update user products.");
      return;
    }

    setProducts(updatedProducts);
    setNewProduct({
      name: "", category: "", currency: "", basePrice: "", billingCycle: "",
      description: "", stock: "", isActive: true, isConfigurable: false, configurations: {},
    });
    setErrors({ newProduct: {} });
    toast.success("Product added successfully!", { position: "top-right" });
    fetchInventory();
  };

  const handleUpdate = async () => {
    const { error } = await supabase.from("Users").update(companyData).eq("email", userEmail);
    if (error) {
      toast.error("Failed to update products. Please try again.", { position: "top-right" });
    } else {
      toast.success("Products updated successfully!", { position: "top-right" });
    }

    if (editProductIndex !== null) {
      const updatedProduct = products[editProductIndex];
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: updatedProduct.name,
          description: updatedProduct.description,
          category: updatedProduct.category,
          base_price: updatedProduct.basePrice
            ? parseFloat(updatedProduct.basePrice)
            : updatedProduct.base_price ? parseFloat(updatedProduct.base_price) : null,
          stock: updatedProduct.stock ? parseInt(updatedProduct.stock) : null,
          is_configurable: updatedProduct.isConfigurable !== undefined
            ? Boolean(updatedProduct.isConfigurable)
            : Boolean(updatedProduct.is_configurable),
          configurations: updatedProduct.configurations || {},
          tier_pricing: updatedProduct.tierPricing ?? updatedProduct.tier_pricing ?? null,
          bundle_pricing: updatedProduct.bundlePricing ?? updatedProduct.bundle_pricing ?? null,
          cost_breakdown: updatedProduct.costBreakdown ?? updatedProduct.cost_breakdown ?? null,
          raw: updatedProduct.raw ?? null,
        })
        .eq("id", parseInt(updatedProduct.id))
        .eq("user_email", userEmail);

      if (productError) {
        toast.error("Failed to update product details.");
        return;
      }
      fetchInventory();
    }
  };

  // ── Add Product Dialog Content (reusable) ───────────────────────────────────
  const AddProductDialogContent = () => (
    <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-2xl max-w-lg">
      <DialogTitle className="text-lg font-semibold text-slate-800">Add New Product</DialogTitle>
      <DialogDescription className="text-sm text-slate-500">
        Fill in the details below to add a new product.
      </DialogDescription>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Product Name</Label>
            <Input className="h-9 text-sm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            {errors.newProduct?.name && <p className="text-red-500 text-xs">{errors.newProduct.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Category</Label>
            <Input className="h-9 text-sm" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
            {errors.newProduct?.category && <p className="text-red-500 text-xs">{errors.newProduct.category}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Description</Label>
          <Input className="h-9 text-sm" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
          {errors.newProduct?.description && <p className="text-red-500 text-xs">{errors.newProduct.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Stock</Label>
            <Input className="h-9 text-sm" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Base Price</Label>
            <Input className="h-9 text-sm" placeholder="0.00" type="number" value={newProduct.basePrice} onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Currency</Label>
            <CurrencyDropDown value={newProduct.currency} onValueChange={(value) => setNewProduct((prev) => ({ ...prev, currency: value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Billing Cycle</Label>
            <BillingCycleSelect value={newProduct.billingCycle} onValueChange={(value) => setNewProduct((prev) => ({ ...prev, billingCycle: value }))} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Enable Configuration</p>
            <p className="text-xs text-slate-500">Allow custom configuration options for this product</p>
          </div>
          <Switch checked={newProduct.isConfigurable} onCheckedChange={(value) => setNewProduct({ ...newProduct, isConfigurable: value })} />
        </div>
      </div>
      <DialogFooter className="pt-2">
        <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-6" onClick={addProduct}>
          Add Product
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-0 pb-8 space-y-5">
      <ToastContainer />

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-teal-600">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your inventory and product configurations in one place.
          </p>
        </div>

        {/* Add New Product — opens original dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 h-10 font-medium shadow-sm cursor-pointer">
              + Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 bg-white/70 mb-6">
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Please fill in the details of the new product you want to add.
            </DialogDescription>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                />
                {errors.newProduct?.name && (
                  <p className="text-red-500 text-xs">{errors.newProduct.name}</p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="description">Product Description</Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                />
                {errors.newProduct?.description && (
                  <p className="text-red-500 text-xs">{errors.newProduct.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="stock">Product Stock</Label>
                <Input
                  id="stock"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="category">Product Category</Label>
                <Input
                  id="category"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
                />
                {errors.newProduct?.category && (
                  <p className="text-red-500 text-xs">{errors.newProduct.category}</p>
                )}
              </div>
              <div>
                <div className="flex flex-col gap-2">
                  <div className="flex mt-2 gap-2">
                    <Label className="mb-2 text-slate-700 dark:text-slate-300 w-1/5">Currency</Label>
                    <CurrencyDropDown
                      value={newProduct.currency}
                      onValueChange={(value) => setNewProduct((prev) => ({ ...prev, currency: value }))}
                    />
                  </div>
                  <Label className="mb-2 text-slate-700 dark:text-slate-300">Base Price</Label>
                  <Input
                    placeholder="Price"
                    type="number"
                    value={newProduct.basePrice}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, basePrice: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Billing Cycle</Label>
                <BillingCycleSelect
                  value={newProduct.billingCycle}
                  onChange={(value) => setNewProduct((prev) => ({ ...prev, billingCycle: value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="isConfigurable"
                  checked={newProduct.isConfigurable}
                  onCheckedChange={(value) => setNewProduct((prev) => ({ ...prev, isConfigurable: value }))}
                />
                <Label htmlFor="isConfigurable">Enable Configuration</Label>
              </div>
            </div>
            <DialogFooter>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={addProduct}>
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "inventory"
              ? "bg-white shadow-sm text-teal-700 border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <LayoutList className="size-4" />
          Inventory
        </button>
        <button
          onClick={() => setActiveTab("configure")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "configure"
              ? "bg-white shadow-sm text-teal-700 border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Settings2 className="size-4" />
          Configure Products
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          INVENTORY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <>
          {/* Search & Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by name or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm bg-white border-slate-200 rounded-lg"
              />
            </div>

            <Select onValueChange={setCategory} defaultValue="all">
              <SelectTrigger className="w-44 h-10 text-sm bg-white border-slate-200 rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {[...new Set(inventoryProducts.map((p) => p.category))].map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setSort} defaultValue="name-asc">
              <SelectTrigger className="w-44 h-10 text-sm bg-white border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A → Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z → A)</SelectItem>
                <SelectItem value="price-asc">Price (Low → High)</SelectItem>
                <SelectItem value="price-desc">Price (High → Low)</SelectItem>
                <SelectItem value="stock-asc">Stock (Low → High)</SelectItem>
                <SelectItem value="stock-desc">Stock (High → Low)</SelectItem>
              </SelectContent>
            </Select>

            <span className="ml-auto text-xs text-slate-400 font-medium">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 pl-6">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Price</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Stock</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryLoading ? (
                  <TableRow>
                    <TableCell colSpan="5" className="py-16 text-center">
                      <Loader2 className="size-6 animate-spin mx-auto text-teal-500" />
                      <p className="text-sm text-slate-400 mt-2">Loading products…</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                            <Box className="size-4 text-teal-600" />
                          </div>
                          <span className="font-medium text-slate-800 text-sm">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800 text-sm">
                        ₹{Number(item.base_price).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.stock}</TableCell>
                      <TableCell>
                        {item.stock == 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full">
                            <span className="size-1.5 rounded-full bg-red-500 inline-block" />
                            Out of Stock
                          </span>
                        ) : item.stock < 10 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full">
                            <span className="size-1.5 rounded-full bg-orange-500 inline-block" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                            In Stock
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="5" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <PackageSearch className="size-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">No products found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIGURE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "configure" && (
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <PackageSearch className="size-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No products configured yet</p>
                <p className="text-xs text-slate-400">Click "Add New Product" to get started</p>
              </div>
            </div>
          ) : (
            products.map((product, index) => (
              <div
                key={index}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  product.isActive === false ? "opacity-70" : ""
                }`}
              >
                {/* Card top bar */}
                <div className={`h-1 w-full ${product.isActive === false ? "bg-slate-200" : "bg-gradient-to-r from-teal-400 to-teal-600"}`} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                        <Package className="size-5 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-800 leading-tight">{product.name}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{product.description || "No description"}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      product.isActive === false
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    }`}>
                      {product.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </div>

                  {/* Info chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                      📦 {product.category || "Uncategorised"}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                      ₹ {product.basePrice || product.base_price || 0}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      product.stock === 0 || product.stock === undefined
                        ? "bg-red-50 text-red-500"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {product.stock === 0 || product.stock === undefined
                        ? "⚠ Out of stock — update needed"
                        : `🗃 ${product.stock} units`}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      product.isConfigurable
                        ? "bg-teal-50 text-teal-600 border border-teal-200"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {product.isConfigurable ? "⚙ Configurable" : "⚙ Not configurable"}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 mb-4" />

                  {/* Action buttons — active */}
                  <div className={`flex flex-wrap gap-2 ${product.isActive === false ? "hidden" : "flex"}`}>
                    <Dialog open={dialogOpen && editProductIndex === index} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) setEditProductIndex(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-none rounded-lg cursor-pointer"
                          onClick={() => { setEdit(true); setEditProductIndex(index); setDialogOpen(true); }}
                        >
                          <Edit className="mr-1.5 size-3.5" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-2xl max-w-md">
                        <DialogTitle className="text-lg font-semibold text-slate-800">Edit Product</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">Update the product details below.</DialogDescription>
                        {editProductIndex !== null && products[editProductIndex] && (
                          <div className="flex flex-col gap-4 py-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Name</Label>
                                <Input className="h-9 text-sm" value={products[editProductIndex].name || ""} onChange={(e) => handleProductEditor(editProductIndex, "name", e.target.value)} />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Category</Label>
                                <Input className="h-9 text-sm" value={products[editProductIndex].category || ""} onChange={(e) => handleProductEditor(editProductIndex, "category", e.target.value)} />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Description</Label>
                              <Input className="h-9 text-sm" value={products[editProductIndex].description || ""} onChange={(e) => handleProductEditor(editProductIndex, "description", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Stock</Label>
                              <Input className="h-9 text-sm" type="number" value={products[editProductIndex].stock || ""} onChange={(e) => handleProductEditor(editProductIndex, "stock", e.target.value)} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-700">Enable Configuration</p>
                                <p className="text-xs text-slate-500">Allow custom options for this product</p>
                              </div>
                              <Switch
                                checked={products[editProductIndex].isConfigurable !== undefined ? products[editProductIndex].isConfigurable : configurable}
                                onCheckedChange={(value) => { setConfigurable(value); handleProductEditor(editProductIndex, "isConfigurable", value); }}
                              />
                            </div>
                          </div>
                        )}
                        <DialogFooter className="pt-2">
                          <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg" onClick={() => { setEdit(false); handleUpdate(); setDialogOpen(false); }}>
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {product.isConfigurable && (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 shadow-none rounded-lg cursor-pointer"
                            onClick={() => { setConfig(true); setConfig(false); }}
                          >
                            {config && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                            <Wrench className="mr-1.5 size-3.5" />
                            Configure
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] md:min-w-[85vw] min-w-screen bg-white border border-slate-200">
                          <SheetHeader>
                            <SheetTitle className="text-slate-800">Customise Product Configuration</SheetTitle>
                            <SheetDescription>Configure the settings as per your product's design.</SheetDescription>
                          </SheetHeader>
                          <ConfigureProduct product={product} config={product.config} userEmail={userEmail} />
                        </SheetContent>
                      </Sheet>
                    )}

                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-white border border-red-200 hover:bg-red-50 text-red-500 shadow-none rounded-lg cursor-pointer ml-auto"
                      onClick={() => { setDiscontinue(true); handleProductChange(index, "isActive", false); setDiscontinue(false); }}
                    >
                      {discontinue && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                      <FlagOff className="mr-1.5 size-3.5" />
                      Discontinue
                    </Button>
                  </div>

                  {/* Reinstate button — inactive */}
                  <div className={`flex justify-end ${product.isActive === false ? "flex" : "hidden"}`}>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-600 shadow-none rounded-lg cursor-pointer"
                      onClick={() => {
                        setReinstate(true);
                        const { id: _dropped, ...productWithoutId } = product;
                        setNewProduct({ ...productWithoutId, isActive: true, name: product.name + "-" + today.getFullYear() });
                        addProduct();
                        handleUpdate();
                        setReinstate(false);
                      }}
                    >
                      {reinstate && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                      <Package className="mr-1.5 size-3.5" />
                      Reinstate Product
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
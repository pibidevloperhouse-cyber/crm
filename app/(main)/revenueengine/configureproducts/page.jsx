"use client";
import { ToastContainer, toast } from "react-toastify";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Wrench, FlagOff, Edit, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import "react-toastify/dist/ReactToastify.css";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import ConfigureProduct from "@/components/ConfigureProduct";
import { Switch } from "@/components/ui/switch";
import { BillingCycleSelect } from "@/components/BillingCycleSelect";
import { CurrencyDropDown } from "@/components/ui/CurrencyDropDown";

export default function PricingPage() {
  const [discontinue, setDiscontinue] = useState(false);
  const [reinstate, setReinstate] = useState(false);
  const [edit, setEdit] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [config, setConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({});
  const [products, setProducts] = useState([]);
  const [result, setResult] = useState(null);
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
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem("session");
      if (rawSession) {
        const session = JSON.parse(rawSession);
        setUserEmail(session?.user?.email || null);
      }
    } catch (error) {
      console.error("Failed to parse session from localStorage:", error);
    }
  }, []);

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
      console.error("Error fetching data from Supabase:", err);
    }
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
      stock: 0,
    };
    setProducts(updatedProducts);
    setCompanyData((prev) => ({ ...prev, products: updatedProducts }));
    const handleUpdate = async () => {
      const { error: userTableError } = await supabase
        .from("Users")
        .update({ ...companyData, products: updatedProducts })
        .eq("email", userEmail);
      
      const updatedProduct = updatedProducts[index]; // 👈 get the specific product
      const { error: productTableError } = await supabase
        .from("products")
        .update({
          name: updatedProduct.name,
          description: updatedProduct.description,
          category: updatedProduct.category,
          base_price: updatedProduct.basePrice
            ? parseFloat(updatedProduct.basePrice)
            : null,
          stock: updatedProduct.stock,
          is_configurable: Boolean(updatedProduct.isConfigurable),
          configurations: updatedProduct.configurations || {},
          tier_pricing: updatedProduct.tierPricing ?? null,
          bundle_pricing: updatedProduct.bundlePricing ?? null,
          cost_breakdown: updatedProduct.costBreakdown ?? null,
          raw: updatedProduct.raw ?? null,
        })
        .eq("id", updatedProduct.id)       // 👈 match by product id
        .eq("user_email", userEmail);      // 👈 correct column name

      if (userTableError || productTableError) {
        toast.error("Failed to update products. Please try again.", {
          position: "top-right",
        });
        console.error("Error updating products:", error);
      } else {
        toast.success("Products updated successfully!", {
          position: "top-right",
        });
      }
    };
    handleUpdate();
  };

  const handleProductEditor = (index, field, value) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
    };
    setProducts(updatedProducts);
    setCompanyData((prev) => ({ ...prev, products: updatedProducts }));
  };

  const validateNewProduct = () => {
    const newErrors = {};
    if (!newProduct.name.trim()) newErrors.name = "Product name is required.";
    if (!newProduct.description.trim())
      newErrors.description = "Description is required.";
    if (!newProduct.category.trim())
      newErrors.category = "Category is required.";
    setErrors({ newProduct: newErrors });
    return Object.keys(newErrors).length === 0;
  };

  const addProduct = async () => {
    if (!validateNewProduct()) return;

    //const productToAdd = { ...newProduct, id: Date.now().toString() };

    console.log("basePrice value:", newProduct.basePrice);
    console.log("parsed base_price:", parseFloat(newProduct.basePrice));

    const { data: insertedProduct, error: productError } = await supabase
    .from("products")
    .insert([
      {
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
      },
    ])
    .select("*")
    .single();

    if (productError) {
      console.error("CODE:", productError.code);
      console.error("MESSAGE:", productError.message);
      console.error("DETAILS:", productError.details);
      console.error("HINT:", productError.hint);
      toast.error("Failed to sync product to products table.");
      console.error("Product table insert error:", productError);
      return;
    }

    const productToAdd = { ...newProduct, id: insertedProduct.id };
    
    const updatedProducts = [...products, productToAdd];
    

    const { error: userError } = await supabase
    .from("Users")
    .update({ ...companyData, products: updatedProducts }) // variable, not state
    .eq("email", userEmail)
    .select("*")
    .single();

    if (userError) {
      console.error("User table update error:", userError);
      toast.error("Failed to update user products.");
      return;
    }

    // Update state AFTER both DB calls succeed
    setProducts(updatedProducts);

    setNewProduct({
      name: "",
      category: "",
      currency: "",
      basePrice: "",
      billingCycle: "",
      description: "",
      stock: "",
      isActive: true,
      isConfigurable: false,
      configurations: {},
    });
    setErrors({ newProduct: {} });
    const { error } = await supabase
      .from("Users")
      .update({ ...companyData, products: [...products, productToAdd] })
      .eq("email", userEmail)
      .select("*")
      .single();
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("Users")
      .update(companyData)
      .eq("email", userEmail);
    if (error) {
      toast.error("Failed to update products. Please try again.", {
        position: "top-right",
      });
      console.error("Error updating products:", error);
    } else {
      toast.success("Products updated successfully!", {
        position: "top-right",
      });
    }

    if (editProductIndex !== null) {
    const updatedProduct = products[editProductIndex];

    console.log("Updating product:", updatedProduct); // 👈 debug

    const { error: productError } = await supabase
      .from("products")
      .update({
        name: updatedProduct.name,
        description: updatedProduct.description,
        category: updatedProduct.category,
        // ✅ handle both camelCase and snake_case
        base_price: updatedProduct.basePrice
          ? parseFloat(updatedProduct.basePrice)
          : updatedProduct.base_price
          ? parseFloat(updatedProduct.base_price)
          : null,
        stock: updatedProduct.stock ? parseInt(updatedProduct.stock) : null,
        is_configurable:
          updatedProduct.isConfigurable !== undefined
            ? Boolean(updatedProduct.isConfigurable)
            : Boolean(updatedProduct.is_configurable),
        configurations: updatedProduct.configurations || {},
        tier_pricing:
          updatedProduct.tierPricing ?? updatedProduct.tier_pricing ?? null,
        bundle_pricing:
          updatedProduct.bundlePricing ?? updatedProduct.bundle_pricing ?? null,
        cost_breakdown:
          updatedProduct.costBreakdown ?? updatedProduct.cost_breakdown ?? null,
        raw: updatedProduct.raw ?? null,
      })
      .eq("id", parseInt(updatedProduct.id)) // ✅ parse to int
      .eq("user_email", userEmail);

    if (productError) {
      console.error("Product table error:", productError.message);
      toast.error("Failed to update product details.");
      return;
    }
  }
  };

  useEffect(() => {
    if (userEmail) {
      fetchData();
    }
  }, [userEmail]);

  return (  
    <div className="min-h-screen relative">
      <div className="flex flex-col md:flex-row justify-between w-full gap-6 items-center ">
        <div>
          <h1 className="text-3xl font-bold text-start ">
            Configure Your Products.
          </h1>
          <p className="text-start text-slate-800 text-md">
            {" "}
            Make sure to have the right plan for your needs.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer">
              Add New Product
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
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="description">Product Description</Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="stock">Product Stock</Label>
                <Input
                  id="stock"
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, stock: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="category">Product Category</Label>
                <Input
                  id="category"
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="mb-2 text-slate-700 dark:text-slate-300">
                  Base Price
                </Label>
                <div className="flex flex-col gap-2 ">
                  <div className="flex mt-2 gap-2">
                    <Label className="mb-2 text-slate-700 dark:text-slate-300 w-1/5">
                      Currency
                    </Label>
                    <CurrencyDropDown
                      value={newProduct.currency}
                      onValueChange={(value) =>
                        setNewProduct((prev) => ({
                          ...prev,
                          currency: value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex mt-2 gap-2">
                    <Label className="mb-2 text-slate-700 dark:text-slate-300 w-1/5">
                      Monetary Value
                    </Label>
                    <Input
                      value={newProduct.basePrice}
                      onChange={(e) =>
                        setNewProduct((prev) => ({
                          ...prev,
                          basePrice: e.target.value,
                        }))
                      }
                      className={`bg-white/70 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                        errors.newProduct.price ? "border-red-500" : ""
                      } w-1/2`}
                      placeholder="e.g., 99 or 99.99"
                    />
                  </div>
                  <div className="flex mt-2">
                    <Label className="mb-2 text-slate-700 dark:text-slate-300 w-1/5">
                      Billing Cycle
                    </Label>
                    <BillingCycleSelect
                      value={newProduct.billingCycle}
                      onChange={(value) =>
                        setNewProduct((prev) => ({
                          ...prev,
                          billingCycle: value,
                        }))
                      }
                      className=" bg-white/70 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="isConfigurable">
                  Enable Product Configuration
                </Label>
                <div className="flex items-center">
                  <Switch
                    id="isConfigurable"
                    checked={newProduct.isConfigurable}
                    onCheckedChange={(checked) =>
                      setNewProduct((prev) => ({
                        ...prev,
                        isConfigurable: checked,
                      }))
                    }
                  />
                  <span className="ml-2">
                    {newProduct.isConfigurable ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={addProduct}
              >
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-10 relative">
        {products.map((product, index) => (
          <Card
            key={product.id}
            className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 mb-6 bg-white/50"
          >
            <CardHeader className="flex justify-between items-center font-semibold">
              {product.name}
              <div className="flex gap-2">
                {product.isConfigurable &&
                  (product.config === null || product.config === undefined) && (
                    <Badge className="bg-yellow-500">
                      {product.config === null || product.config === undefined
                        ? "Unconfigured"
                        : ""}
                    </Badge>
                  )}
                <Badge
                  className={
                    product.isActive === undefined || product.isActive
                      ? "bg-green-500"
                      : "bg-red-500"
                  }
                >
                  {product.isActive === undefined || product.isActive
                    ? "Active"
                    : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 gap-4">
                <Label>
                  Stock:
                  {product.stock ? (
                    <span>{product.stock}</span>
                  ) : (
                    <span className="text-red-500">
                      Out of stock!!! Please update the stock.
                    </span>
                  )}
                </Label>
                <Label className="mt-2">Category: {product.category}</Label>
                <Label className="mt-2">Price: {product.price}</Label>
                <Label className="mt-2">
                  Configuration:{" "}
                  {product.isConfigurable ? "Enabled" : "Disabled"}
                </Label>
              </div>
              <div className="relative">
                <div
                  className={`flex justify-end flex-col md:flex-row w-full ${
                    product.isActive === undefined || product.isActive
                      ? "flex"
                      : "hidden"
                  }`}
                >
                  <Dialog
                    open={dialogOpen}
                    onOpenChange={() => {
                      setDialogOpen(!dialogOpen);
                      setEdit(false);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="bg-transparent border-2 border-blue-500 hover:bg-blue-200 hover:border-blue-600 text-blue-500 cursor-pointer"
                        onClick={() => {
                          setEdit(product.id);
                          setEditProductIndex(index);
                        }}
                      >
                        {edit === product.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Edit />
                        Edit Basic Product Info
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 mb-6">
                      <DialogTitle>Edit Product Information</DialogTitle>
                      {editProductIndex !== null && (
                        <div className="flex flex-col gap-4 py-4">
                          <div className=" flex flex-col gap-3">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                              id="name"
                              value={products[editProductIndex].name}
                              onChange={(e) =>
                                handleProductEditor(
                                  editProductIndex,
                                  "name",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="description">
                              Product Description
                            </Label>
                            <Input
                              id="description"
                              value={
                                products[editProductIndex].description || ""
                              }
                              onChange={(e) =>
                                handleProductEditor(
                                  editProductIndex,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="stock">Product Stock</Label>
                            <Input
                              id="stock"
                              type="number"
                              value={products[editProductIndex].stock || ""}
                              onChange={(e) =>
                                handleProductEditor(
                                  editProductIndex,
                                  "stock",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="category">Product Category</Label>
                            <Input
                              id="category"
                              value={products[editProductIndex].category}
                              onChange={(e) =>
                                handleProductEditor(
                                  editProductIndex,
                                  "category",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="price">
                              Enable Product Configuration
                            </Label>
                            <div>
                              {products[editProductIndex].isConfigurable ===
                              undefined ? (
                                <div>
                                  <Switch
                                    id="isConfigurable"
                                    checked={configurable}
                                    onCheckedChange={(value) => {
                                      setConfigurable(value);
                                      handleProductEditor(
                                        editProductIndex,
                                        "isConfigurable",
                                        value
                                      );
                                    }}
                                  />
                                  <span className="ml-2">
                                    {products[editProductIndex].isConfigurable
                                      ? "Enabled"
                                      : "Disabled"}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <Switch
                                    id="isConfigurable"
                                    checked={
                                      products[editProductIndex].isConfigurable
                                    }
                                    onCheckedChange={(value) => {
                                      setConfigurable(value);
                                      handleProductEditor(
                                        editProductIndex,
                                        "isConfigurable",
                                        value
                                      );
                                    }}
                                  />
                                  <span className="ml-2">
                                    {products[editProductIndex].isConfigurable
                                      ? "Enabled"
                                      : "Disabled"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <DialogFooter>
                        <Button
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => {
                            setEdit(false);
                            handleUpdate();
                            setDialogOpen(false);
                          }}
                        >
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {product.isConfigurable && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          className="bg-transparent border-2 border-gray-500 hover:bg-gray-200 hover:border-gray-600 text-gray-500 mt-2 md:mt-0 md:ml-2 cursor-pointer"
                          onClick={() => {
                            setConfig(true);
                            setConfig(false);
                          }}
                        >
                          {config && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          <Wrench />
                          Edit Product Configuration Info
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] md:min-w-[85vw] min-w-screen backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
                        <SheetHeader>
                          <SheetTitle>
                            Customise Your Product Configuration Settings Here
                          </SheetTitle>
                          <SheetDescription>
                            Configure the settings as per your product's design.
                          </SheetDescription>
                        </SheetHeader>
                        <ConfigureProduct
                          product={product}
                          config={product.config}
                          userEmail={userEmail}
                        />
                      </SheetContent>
                    </Sheet>
                  )}
                  <Button
                    className="bg-transparent border-2 border-red-500 hover:bg-red-200 hover:border-red-600 text-red-500 mt-2 md:mt-0 md:ml-2 cursor-pointer"
                    onClick={() => {
                      setDiscontinue(true);
                      handleProductChange(index, "isActive", false);
                      setDiscontinue(false);
                    }}
                  >
                    {discontinue && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <FlagOff />
                    Discontinue Product
                  </Button>
                </div>
                <div
                  className={`flex justify-end w-full ${
                    product.isActive === false ? "flex" : "hidden"
                  }`}
                >
                  <Button
                    className="bg-transparent border-2 cursor-pointer border-green-500 hover:bg-green-200 hover:border-green-600 text-green-500"
                    onClick={() => {
                      setReinstate(true);
                      setNewProduct({
                        ...product,
                        isActive: true,
                        name: product.name + "-" + today.getFullYear(),
                      });
                      addProduct();
                      handleUpdate();
                      setReinstate(false);
                    }}
                  >
                    {reinstate && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Package />
                    Reinstate Product
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

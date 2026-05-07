"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Upload, Plus, Trash2, Package, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import isEqual from "lodash/isEqual";
import "react-toastify/dist/ReactToastify.css";

const ErrorMessage = ({ error }) => {
  if (!error) return null;
  return (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <AlertCircle className="w-4 h-4" />
      {error}
    </p>
  );
};

/* ─────────────────────────────────────────────────────────
   ICP result display — handles BOTH shapes:
   • Supabase shape: { icp, high, medium, low }
   • Render /icp/chat shape: { ICP, high_prospect_group, … }
───────────────────────────────────────────────────────── */
function IcpCard({ icpData }) {
  if (!icpData) return null;

  // Normalise to a single shape
  const icp = icpData.ICP || icpData.icp || null;
  const high =
    icpData.high_prospect_group ||
    (icpData.high ? { conversion_chance: icpData.high.conversion_chance, profile: icpData.high.profile } : null);
  const medium =
    icpData.medium_prospect_group ||
    (icpData.medium ? { conversion_chance: icpData.medium.conversion_chance, profile: icpData.medium.profile } : null);
  const low =
    icpData.low_prospect_group ||
    (icpData.low ? { conversion_chance: icpData.low.conversion_chance, profile: icpData.low.profile } : null);

  const groups = [
    { label: "High Conversion", data: high, bg: "bg-green-50/50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-300" },
    { label: "Medium Conversion", data: medium, bg: "bg-yellow-50/50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300" },
    { label: "Low Conversion", data: low, bg: "bg-red-50/50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300" },
  ];

  return (
    <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle>Ideal Customer Profile (ICP)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core demographics */}
        {icp && (
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-4">Core Demographics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(icp).map(([k, v]) => (
                <div key={k}>
                  <Label className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                    {k.replace(/_/g, " ")}
                  </Label>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prospect segments */}
        {(high || medium || low) && (
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-4">Customer Segments</h4>
            <div className="space-y-3">
              {groups.map(({ label, data, bg, border, text }) =>
                data ? (
                  <div key={label} className={`p-4 rounded-lg border ${border} ${bg}`}>
                    <h5 className={`font-semibold ${text}`}>
                      {label}
                      {data.conversion_chance ? ` (${data.conversion_chance})` : ""}
                    </h5>
                    {data.profile && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{data.profile}</p>
                    )}
                    {/* Render any extra keys */}
                    {Object.entries(data)
                      .filter(([k]) => k !== "conversion_chance" && k !== "profile")
                      .map(([k, v]) => (
                        <p key={k} className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                          <span className="font-medium capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}
                        </p>
                      ))}
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════ */
export default function UpdateCompanyDetails({ onGenerateICP }) {
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({});
  const [products, setProducts] = useState([]);
  const [icpData, setIcpData] = useState(null);     // saved ICP from Supabase
  const [freshIcp, setFreshIcp] = useState(null);   // result just returned from /icp/chat
  const [newProduct, setNewProduct] = useState({ name: "", category: "", price: "", description: "" });
  const [errors, setErrors] = useState({ newProduct: {} });
  const [userEmail, setUserEmail] = useState(null);

  /* ── Session ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (raw) setUserEmail(JSON.parse(raw)?.user?.email || null);
    } catch (e) { console.error(e); }
  }, []);

  /* ── Fetch company + ICP ── */
  useEffect(() => {
    if (!userEmail) return;

    // Try cache first
    const cached = localStorage.getItem("companyDataCache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setCompanyData(parsed);
        setProducts(Array.isArray(parsed.products) ? parsed.products : []);
      } catch { localStorage.removeItem("companyDataCache"); }
      // Still fetch ICP even if cache hit
    }

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("Users")
          .select("companyName, companyDescription, companyWebsite, products, id, email")
          .eq("email", userEmail)
          .single();
        if (error) throw error;
        if (!cached) {
          setCompanyData(data);
          setProducts(
            typeof data.products === "string"
              ? JSON.parse(data.products || "[]")
              : data.products || []
          );
        }

        const { data: icp } = await supabase
          .from("ICP")
          .select("*")
          .eq("user_email", userEmail)
          .single();
        if (icp) setIcpData(icp);
      } catch (err) { console.error(err); }
    };
    load();
  }, [userEmail]);

  /* ── Field handlers ── */
  const handleCompanyChange = (field, value) =>
    setCompanyData((prev) => ({ ...prev, [field]: value }));

  const handleProductChange = (idx, field, value) => {
    const updated = [...products];
    updated[idx] = { ...updated[idx], [field]: value };
    setProducts(updated);
    setCompanyData((prev) => ({ ...prev, products: updated }));
  };

  const validateNewProduct = () => {
    const errs = {};
    if (!newProduct.name.trim()) errs.name = "Product name is required.";
    if (!newProduct.description.trim()) errs.description = "Description is required.";
    if (!newProduct.category.trim()) errs.category = "Category is required.";
    setErrors({ newProduct: errs });
    return Object.keys(errs).length === 0;
  };

  const addProduct = () => {
    if (!validateNewProduct()) return;
    setProducts((prev) => [...prev, { ...newProduct, id: Date.now().toString() }]);
    setNewProduct({ name: "", category: "", price: "", description: "" });
    setErrors({ newProduct: {} });
  };

  const removeProduct = (id) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  /* ── Save locally ── */
  const handleSaveChanges = () => {
    setLoading(true);
    localStorage.setItem("companyDataCache", JSON.stringify({ ...companyData, products }));
    toast.info("Saved locally. Update Database to make it permanent.", { position: "top-right" });
    setLoading(false);
  };

  /* ── Update DB + trigger ICP ── */
  const handleUpdateDB = async () => {
    setLoading(true);

    const dataToUpdate = {
      companyName: companyData.companyName,
      companyDescription: companyData.companyDescription,
      companyWebsite: companyData.companyWebsite,
      products,
    };

    try {
      // Check if anything actually changed
      const { data: existing } = await supabase
        .from("Users")
        .select("*")
        .eq("email", userEmail)
        .single();

      const noChanges =
        existing.companyName === companyData.companyName &&
        existing.companyDescription === companyData.companyDescription &&
        existing.companyWebsite === companyData.companyWebsite &&
        isEqual(existing.products, products);

      if (noChanges) {
        toast.info("No changes detected.", { position: "top-right" });
        setLoading(false);
        return;
      }

      // 1. Save to Users table
      const { error: updateError } = await supabase
        .from("Users")
        .update(dataToUpdate)
        .eq("email", userEmail);

      if (updateError) throw updateError;

      // 2. Clear old ICP row so it gets regenerated
      await supabase.from("ICP").delete().eq("user_email", userEmail);

      localStorage.removeItem("companyDataCache");
      toast.success("Database updated! Running ICP analysis…", { position: "top-right" });

      // 3. Call render backend /icp/chat — pass the exact saved payload
      const icpPayload = { ...dataToUpdate, email: userEmail };

      if (onGenerateICP) {
        // Parent (OurProspects) handles the fetch and shows spinner/result
        await onGenerateICP(icpPayload);
      } else {
        // Fallback: call directly and show result inline
        const res = await fetch("https://crmemail.onrender.com/icp/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(icpPayload),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const json = await res.json();
          setFreshIcp(json.response || json);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating database!", { position: "top-right" });
    } finally {
      setLoading(false);
    }
  };

  /* ══════════ RENDER ══════════ */
  return (
    <div className="py-4 md:py-6 w-full mx-auto space-y-6">
      <ToastContainer position="top-right" autoClose={5000} />

      {/* Company Profile */}
      <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
        <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2" htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Your Company Name"
              value={companyData.companyName || ""}
              onChange={(e) => handleCompanyChange("companyName", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2" htmlFor="companyDescription">Company Description</Label>
            <Textarea
              id="companyDescription"
              placeholder="Describe your company"
              value={companyData.companyDescription || ""}
              onChange={(e) => handleCompanyChange("companyDescription", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2" htmlFor="companyWebsite">Company Website</Label>
            <Input
              id="companyWebsite"
              placeholder="https://example.com"
              value={companyData.companyWebsite || ""}
              onChange={(e) => handleCompanyChange("companyWebsite", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
        <CardHeader><CardTitle>Products & Services</CardTitle></CardHeader>
        <CardContent className="space-y-6">

          {/* Add new */}
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20">
            <div className="flex items-center mb-4">
              <Package className="w-5 h-5 mr-2 text-blue-600" />
              <h4 className="font-medium text-slate-900 dark:text-white">Add Product or Service</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2">Product Name</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  className={errors.newProduct.name ? "border-red-500" : ""}
                  placeholder="Enter product name"
                />
                <ErrorMessage error={errors.newProduct.name} />
              </div>
              <div>
                <Label className="mb-2">Category</Label>
                <Input
                  value={newProduct.category}
                  onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                  className={errors.newProduct.category ? "border-red-500" : ""}
                  placeholder="e.g., Analytics, Automation"
                />
                <ErrorMessage error={errors.newProduct.category} />
              </div>
              <div>
                <Label className="mb-2">Price (Optional)</Label>
                <Input
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                  placeholder="e.g., $99/month"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-2">Description</Label>
                <Textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                  className={`min-h-24 ${errors.newProduct.description ? "border-red-500" : ""}`}
                  placeholder="Brief description"
                />
                <ErrorMessage error={errors.newProduct.description} />
              </div>
            </div>
            <Button onClick={addProduct} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>

          {/* Existing products */}
          {products.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-white">Your Products & Services</h4>
              {products.map((product, idx) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/30 dark:bg-slate-800/30"
                >
                  <div className="flex-1 space-y-3">
                    <Input
                      value={product.name}
                      onChange={(e) => handleProductChange(idx, "name", e.target.value)}
                      className="text-base font-bold bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                    />
                    <Textarea
                      value={product.description}
                      onChange={(e) => handleProductChange(idx, "description", e.target.value)}
                      placeholder="Description"
                      className="text-sm text-slate-600 dark:text-slate-400 bg-transparent border p-2 rounded-md w-full"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={product.category}
                        onChange={(e) => handleProductChange(idx, "category", e.target.value)}
                        placeholder="Category"
                        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded h-7"
                      />
                      <Input
                        value={product.price}
                        onChange={(e) => handleProductChange(idx, "price", e.target.value)}
                        placeholder="Price"
                        className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded h-7"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => removeProduct(product.id)}
                    variant="outline"
                    size="icon"
                    className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/50 dark:border-red-800 dark:text-red-300 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No products added yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleSaveChanges}
          disabled={loading}
          variant="secondary"
          className="cursor-pointer"
        >
          <Save className="mr-2 w-4 h-4" />
          Save Locally
        </Button>
        
        <Button
          onClick={handleUpdateDB}
          disabled={loading}
          className="cursor-pointer bg-[#25C2A0] hover:bg-[#1a8a72] text-white"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          ) : (
            <Upload className="mr-2 w-4 h-4" />
          )}
          Update Database
        </Button>

        <Button
          onClick={async () => {
            setLoading(true);
            try {
              const res = await fetch("/api/ICP", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_email: userEmail,
                  description: companyData,
                }),
              });
              if (res.ok) {
                const json = await res.json();
                setFreshIcp(json.response || json);
                toast.success("ICP Analysis Generated!");
              } else {
                throw new Error(`Error ${res.status}`);
              }
            } catch (err) {
              toast.error("ICP Generation failed: " + err.message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="cursor-pointer bg-gradient-to-r from-[#235d76] to-[#154b5f] hover:from-[#1a4456] hover:to-[#0f3442] text-white shadow-md hover:shadow-lg transition-all"
        >
          <Bot className="mr-2 w-4 h-4" />
          Generate ICP Analysis
        </Button>
      </div>
      {/* ICP from Supabase (persisted) — shown until fresh result arrives */}
      {icpData && !freshIcp && <IcpCard icpData={icpData} />}

      {/* Fresh ICP from /icp/chat — shown after Update Database */}
      {freshIcp && <IcpCard icpData={freshIcp} />}
    </div>
  );
}




















// "use client";

// import { useEffect, useState } from "react";
// import { supabase } from "@/utils/supabase/client";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Save, Upload, Plus, Trash2, Package, AlertCircle } from "lucide-react";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ToastContainer, toast } from "react-toastify";
// import isEqual from "lodash/isEqual";
// import "react-toastify/dist/ReactToastify.css";
// import { fetchData } from "next-auth/client/_utils";
// import { set } from "lodash";
// const ErrorMessage = ({ error }) => {
//   if (!error) return null;
//   return (
//     <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
//       <AlertCircle className="w-4 h-4" />
//       {error}
//     </p>
//   );
// };

// export default function CompanyProfile() {
//   const [loading, setLoading] = useState(false);
//   const [companyData, setCompanyData] = useState({});
//   const [products, setProducts] = useState([]);
//   const [icpData, setIcpData] = useState({});
//   const [result, setResult] = useState(null);
//   const [newProduct, setNewProduct] = useState({
//     name: "",
//     category: "",
//     price: "",
//     description: "",
//   });
//   const [errors, setErrors] = useState({ newProduct: {} });
//   const [userEmail, setUserEmail] = useState(null);
//   useEffect(() => {
//     try {
//       const rawSession = localStorage.getItem("session");
//       if (rawSession) {
//         const session = JSON.parse(rawSession);
//         setUserEmail(session?.user?.email || null);
//       }
//     } catch (error) {
//       console.error("Failed to parse session from localStorage:", error);
//     }
//   }, []);

//   useEffect(() => {
//     if (!userEmail) return;

//     const cachedData = localStorage.getItem("companyDataCache");
//     if (cachedData) {
//       try {
//         const parsed = JSON.parse(cachedData);
//         setCompanyData(parsed);
//         setProducts(Array.isArray(parsed.products) ? parsed.products : []);
//       } catch (error) {
//         console.error("Failed to parse cached data:", error);
//         localStorage.removeItem("companyDataCache");
//       }
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         const { data, error } = await supabase
//           .from("Users")
//           .select(
//             "companyName, companyDescription, companyWebsite, products, id, email",
//           )
//           .eq("email", userEmail)
//           .single();

//         if (error) throw error;

//         const { data: icpData, error: icpError } = await supabase
//           .from("ICP")
//           .select("*")
//           .eq("user_email", userEmail)
//           .single();

//         setCompanyData(data);
//         setProducts(
//           typeof data.products === "string"
//             ? JSON.parse(data.products || "[]")
//             : data.products || [],
//         );
//         if (icpData) setIcpData(icpData);

//         if (icpError) console.error("Error fetching ICP data:", icpError);
//       } catch (err) {
//         console.error("Error fetching data from Supabase:", err);
//       }
//     };

//     fetchData();
//   }, [userEmail]);

//   useEffect(() => {
//     const createICPEntry = async () => {
//       const res = await fetch("/api/ICP", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           user_email: userEmail,
//           description: companyData,
//         }),
//       });

//       if (res.ok) {
//         const data = await res.json();
//         setResult(data.output);
//       } else {
//         console.error("Error creating ICP entry:", res.statusText);
//       }
//     };

//     if (userEmail && companyData?.companyName && !icpData) {
//       createICPEntry();
//       window.location.reload();
//     }
//   }, [userEmail, companyData]);

//   const handleCompanyChange = (field, value) => {
//     setCompanyData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleProductChange = (index, field, value) => {
//     const updatedProducts = [...products];
//     updatedProducts[index] = { ...updatedProducts[index], [field]: value };
//     setProducts(updatedProducts);
//     setCompanyData((prev) => ({ ...prev, products: updatedProducts }));
//   };

//   const validateNewProduct = () => {
//     const newErrors = {};
//     if (!newProduct.name.trim()) newErrors.name = "Product name is required.";
//     if (!newProduct.description.trim())
//       newErrors.description = "Description is required.";
//     if (!newProduct.category.trim())
//       newErrors.category = "Category is required.";
//     setErrors({ newProduct: newErrors });
//     return Object.keys(newErrors).length === 0;
//   };

//   const addProduct = () => {
//     if (!validateNewProduct()) return;

//     const productToAdd = { ...newProduct, id: Date.now().toString() };
//     setProducts([...products, productToAdd]);
//     setNewProduct({ name: "", category: "", price: "", description: "" });
//     setErrors({ newProduct: {} });
//   };

//   const removeProduct = (id) => {
//     setProducts(products.filter((p) => p.id !== id));
//   };

//   const handleSaveChanges = () => {
//     setLoading(true);
//     localStorage.setItem(
//       "companyDataCache",
//       JSON.stringify({ ...companyData, products }),
//     );
//     toast.info(
//       "Changes saved locally. Don't clear browser history or the changes will be lost!",
//       {
//         position: "top-right",
//       },
//     );
//     setLoading(false);
//   };

//   const handleUpdateDB = async () => {
//     setLoading(true);
//     const dataToUpdate = {
//       companyName: companyData.companyName,
//       companyDescription: companyData.companyDescription,
//       companyWebsite: companyData.companyWebsite,
//       products: products,
//     };
//     const { data: companyDetails, error: companyDetailsError } = await supabase
//       .from("Users")
//       .select("*")
//       .eq("email", userEmail)
//       .single();
//     const noChanges =
//       companyDetails.companyName === companyData.companyName &&
//       companyDetails.companyDescription === companyData.companyDescription &&
//       companyDetails.companyWebsite === companyData.companyWebsite &&
//       isEqual(companyDetails.products, companyData.products);

//     if (noChanges) {
//       toast.info("No changes detected.", { position: "top-right" });
//       setLoading(false);
//       return;
//     } else {
//       if (icpData) {
//         const { error } = await supabase
//           .from("ICP")
//           .delete()
//           .eq("user_email", userEmail);

//         if (error) {
//           console.error("Error deleting ICP data:", error);
//         }
//       }
//       const res = await fetch("/api/ICP", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           user_email: userEmail,
//           description: companyData,
//         }),
//       });

//       if (res.ok) {
//         const data = await res.json();
//         setResult(data.output);
//       }

//       const { error } = await supabase
//         .from("Users")
//         .update(dataToUpdate)
//         .eq("email", userEmail);

//       if (error) {
//         console.error("Error updating database:", error);
//         toast.error("Error updating database!", { position: "top-right" });
//       } else {
//         toast.success(
//           "Data updated permanently. All changes made are permanent.",
//           { position: "top-right" },
//         );
//         localStorage.removeItem("companyDataCache");
//       }
//       setLoading(false);
//       window.location.reload();
//     }
//   };

//   return (
//     <div className="py-4 md:py-6 w-full mx-auto space-y-6">
//       <ToastContainer
//         position="top-right"
//         autoClose={5000}
//         hideProgressBar={false}
//         newestOnTop={false}
//         closeOnClick
//         rtl={false}
//         pauseOnFocusLoss
//         draggable
//         pauseOnHover
//       />
//       <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
//         <CardHeader>
//           <CardTitle>Company Profile</CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div>
//             <Label className={"mb-4"} htmlFor="companyName">
//               Company Name
//             </Label>
//             <Input
//               id="companyName"
//               placeholder="Your Company Name"
//               value={companyData.companyName || ""}
//               onChange={(e) =>
//                 handleCompanyChange("companyName", e.target.value)
//               }
//             />
//           </div>
//           <div>
//             <Label className={"mb-4"} htmlFor="companyDescription">
//               Company Description
//             </Label>
//             <Textarea
//               id="companyDescription"
//               placeholder="Describe your company"
//               value={companyData.companyDescription || ""}
//               onChange={(e) =>
//                 handleCompanyChange("companyDescription", e.target.value)
//               }
//             />
//           </div>
//           <div>
//             <Label className={"mb-4"} htmlFor="companyWebsite">
//               Company Website
//             </Label>
//             <Input
//               id="companyWebsite"
//               placeholder="https://example.com"
//               value={companyData.companyWebsite || ""}
//               onChange={(e) =>
//                 handleCompanyChange("companyWebsite", e.target.value)
//               }
//             />
//           </div>
//         </CardContent>
//       </Card>

//       <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
//         <CardHeader>
//           <CardTitle>Products & Services</CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           {/* Add New Product Form */}
//           <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20">
//             <div className="flex items-center mb-4">
//               <Package className="w-5 h-5 mr-2 text-blue-600" />
//               <h4 className="font-medium text-slate-900 dark:text-white">
//                 Add Product or Service
//               </h4>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label className="mb-2 text-slate-700 dark:text-slate-300">
//                   Product Name
//                 </Label>
//                 <Input
//                   value={newProduct.name}
//                   onChange={(e) =>
//                     setNewProduct((prev) => ({ ...prev, name: e.target.value }))
//                   }
//                   className={`bg-white/70 dark:bg-slate-800/50 ${errors.newProduct.name
//                     ? "border-red-500"
//                     : "border-slate-200 dark:border-slate-700"
//                     }`}
//                   placeholder="Enter product name"
//                 />
//                 <ErrorMessage error={errors.newProduct.name} />
//               </div>
//               <div>
//                 <Label className="mb-2 text-slate-700 dark:text-slate-300">
//                   Category
//                 </Label>
//                 <Input
//                   value={newProduct.category}
//                   onChange={(e) =>
//                     setNewProduct((prev) => ({
//                       ...prev,
//                       category: e.target.value,
//                     }))
//                   }
//                   className={`bg-white/70 dark:bg-slate-800/50 ${errors.newProduct.category
//                     ? "border-red-500"
//                     : "border-slate-200 dark:border-slate-700"
//                     }`}
//                   placeholder="e.g., Analytics, Automation"
//                 />
//                 <ErrorMessage error={errors.newProduct.category} />
//               </div>
//               <div>
//                 <Label className="mb-2 text-slate-700 dark:text-slate-300">
//                   Price (Optional)
//                 </Label>
//                 <Input
//                   value={newProduct.price}
//                   onChange={(e) =>
//                     setNewProduct((prev) => ({
//                       ...prev,
//                       price: e.target.value,
//                     }))
//                   }
//                   className="bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
//                   placeholder="e.g., $99/month"
//                 />
//               </div>
//               <div className="md:col-span-2">
//                 <Label className="mb-2 text-slate-700 dark:text-slate-300">
//                   Description
//                 </Label>
//                 <Textarea
//                   value={newProduct.description}
//                   onChange={(e) =>
//                     setNewProduct((prev) => ({
//                       ...prev,
//                       description: e.target.value,
//                     }))
//                   }
//                   className={`bg-white/70 dark:bg-slate-800/50 min-h-24 ${errors.newProduct.description
//                     ? "border-red-500"
//                     : "border-slate-200 dark:border-slate-700"
//                     }`}
//                   placeholder="Brief description"
//                 />
//                 <ErrorMessage error={errors.newProduct.description} />
//               </div>
//             </div>
//             <Button
//               onClick={addProduct}
//               className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
//             >
//               <Plus className="w-4 h-4 mr-2" /> Add Product
//             </Button>
//           </div>

//           {/* Existing Products List */}
//           {products.length > 0 && (
//             <div className="space-y-3">
//               <h4 className="font-medium text-slate-900 dark:text-white">
//                 Your Products & Services
//               </h4>
//               {products.map((product, idx) => (
//                 <div
//                   key={product.id}
//                   className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/30 dark:bg-slate-800/30"
//                 >
//                   <div className="flex-1 space-y-3">
//                     <Input
//                       value={product.name}
//                       onChange={(e) =>
//                         handleProductChange(idx, "name", e.target.value)
//                       }
//                       className="text-base font-bold bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
//                     />
//                     <Textarea
//                       value={product.description}
//                       onChange={(e) =>
//                         handleProductChange(idx, "description", e.target.value)
//                       }
//                       placeholder="Description"
//                       className="text-sm text-slate-600 dark:text-slate-400 bg-transparent border p-2 rounded-md w-full"
//                     />
//                     <div className="flex flex-wrap items-center gap-2">
//                       <Input
//                         value={product.category}
//                         onChange={(e) =>
//                           handleProductChange(idx, "category", e.target.value)
//                         }
//                         placeholder="Category"
//                         className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded h-7"
//                       />
//                       <Input
//                         value={product.price}
//                         onChange={(e) =>
//                           handleProductChange(idx, "price", e.target.value)
//                         }
//                         placeholder="Price"
//                         className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded h-7"
//                       />
//                     </div>
//                   </div>
//                   <Button
//                     onClick={() => removeProduct(product.id)}
//                     variant="outline"
//                     size="icon"
//                     className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-300 dark:border-red-800 p-2"
//                   >
//                     <Trash2 className="w-4 h-4" />
//                   </Button>
//                 </div>
//               ))}
//             </div>
//           )}

//           {products.length === 0 && (
//             <div className="text-center py-6 text-slate-500 dark:text-slate-400">
//               <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
//               <p className="text-sm">
//                 No products added yet. Add your first product above to get
//                 started.
//               </p>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* <div className="flex gap-4">
//         <Button></Button>
//         onClick={handleSaveChanges}
//         className={"cursor-pointer"}
//         variant="secondary"

//         <Save className="mr-2 w-4 h-4" /> Save Changes Locally */}
//       {/* </Button>
//         <Button onClick={handleUpdateDB} className={"cursor-pointer"}>
//           <Upload className="mr-2 w-4 h-4" /> Update Database
//         </Button> */}

//       <div className="flex gap-4">

//         {/* Save locally */}
//         <Button
//           onClick={handleSaveChanges}
//           className={"cursor-pointer"}
//           variant="secondary"
//         >
//           <Save className="mr-2 w-4 h-4" />
//           Save Changes Locally
//         </Button>

//         {/* Update DB + ICP */}
//         <Button
//           onClick={async () => {
//             await handleUpdateDB();   // save to DB first
//             if (onGenerateICP) {
//               await onGenerateICP();  // then call ICP API
//             }
//           }}
//           className={"cursor-pointer"}
//         >
//           <Upload className="mr-2 w-4 h-4" />
//           Update Database
//         </Button>
//       </div>





//       {/* ICP Details Card */}
//       {icpData && icpData.icp && (
//         <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
//           <CardHeader>
//             <CardTitle>Ideal Customer Profile (ICP)</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             <div>
//               <h4 className="font-medium text-slate-900 dark:text-white mb-4">
//                 Core Demographics
//               </h4>
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//                 <div>
//                   <Label className="text-sm text-slate-500 dark:text-slate-400">
//                     Industry
//                   </Label>
//                   <p className="font-semibold text-slate-800 dark:text-slate-200">
//                     {icpData.icp.industry}
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-sm text-slate-500 dark:text-slate-400">
//                     Company Size
//                   </Label>
//                   <p className="font-semibold text-slate-800 dark:text-slate-200">
//                     {icpData.icp.company_size}
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-sm text-slate-500 dark:text-slate-400">
//                     Region
//                   </Label>
//                   <p className="font-semibold text-slate-800 dark:text-slate-200">
//                     {icpData.icp.region}
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-sm text-slate-500 dark:text-slate-400">
//                     Designation
//                   </Label>
//                   <p className="font-semibold text-slate-800 dark:text-slate-200">
//                     {icpData.icp.designation}
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-sm text-slate-500 dark:text-slate-400">
//                     Age Group
//                   </Label>
//                   <p className="font-semibold text-slate-800 dark:text-slate-200">
//                     {icpData.icp.age_group}
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-sm text-slate-500 dark:text-slate-400">
//                     Income Range
//                   </Label>
//                   <p className="font-semibold text-slate-800 dark:text-slate-200">
//                     {icpData.icp.income_range}
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <div>
//               <h4 className="font-medium text-slate-900 dark:text-white mb-4">
//                 Customer Segments
//               </h4>
//               <div className="space-y-4">
//                 {icpData.high && (
//                   <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
//                     <h5 className="font-semibold text-green-700 dark:text-green-300">
//                       High Conversion ({icpData.high.conversion_chance}%)
//                     </h5>
//                     <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
//                       {icpData.high.profile}
//                     </p>
//                   </div>
//                 )}
//                 {icpData.medium && (
//                   <div className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20">
//                     <h5 className="font-semibold text-yellow-700 dark:text-yellow-300">
//                       Medium Conversion ({icpData.medium.conversion_chance}%)
//                     </h5>
//                     <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
//                       {icpData.medium.profile}
//                     </p>
//                   </div>
//                 )}
//                 {icpData.low && (
//                   <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
//                     <h5 className="font-semibold text-red-700 dark:text-red-300">
//                       Low Conversion ({icpData.low.conversion_chance}%)
//                     </h5>
//                     <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
//                       {icpData.low.profile}
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// }

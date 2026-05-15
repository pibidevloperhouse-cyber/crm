"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";

export default function UpdateCompanyDetails() {
    const [userEmail, setUserEmail] = useState(null);
    const [loading, setLoading] = useState(false);

    const [companyData, setCompanyData] = useState({
        name: "",
        role: "",
        phone: "",
        companyName: "",
        companyDescription: "",
        companyWebsite: "",
        industry: "",
        companySize: "",
    });

    const [products, setProducts] = useState([]);

    const [newProduct, setNewProduct] = useState({
        name: "",
        description: "",
        category: "",
        price: "",
        currency: "",
        billingCycle: "one-time",
    });

    /* ---------- SESSION ---------- */
    useEffect(() => {
        const raw = localStorage.getItem("session");
        if (raw) setUserEmail(JSON.parse(raw)?.user?.email || null);
    }, []);

    /* ---------- FETCH ---------- */
    useEffect(() => {
        if (!userEmail) return;

        const load = async () => {
            const { data } = await supabase
                .from("Users")
                .select("*")
                .eq("email", userEmail)
                .single();

            if (data) {
                setCompanyData({
                    name: data.name || "",
                    role: data.role || "",
                    phone: data.phone || "",
                    companyName: data.companyName || "",
                    companyDescription: data.companyDescription || "",
                    companyWebsite: data.companyWebsite || "",
                    industry: data.industry || "",
                    companySize: data.companySize || "",
                });

                setProducts(
                    typeof data.products === "string"
                        ? JSON.parse(data.products || "[]")
                        : data.products || []
                );
            }
        };

        load();
    }, [userEmail]);

    /* ---------- HANDLERS ---------- */
    const handleChange = (field, value) =>
        setCompanyData((prev) => ({ ...prev, [field]: value }));

    const handleProductChange = (idx, field, value) => {
        const updated = [...products];
        updated[idx][field] = value;
        setProducts(updated);
    };

    const addProduct = () => {
        if (!newProduct.name || !newProduct.description || !newProduct.category) {
            toast.error("Fill all product fields");
            return;
        }

        setProducts((prev) => [
            ...prev,
            { ...newProduct, id: crypto.randomUUID() },
        ]);

        setNewProduct({
            name: "",
            description: "",
            category: "",
            price: "",
            currency: "",
            billingCycle: "one-time",
        });
    };

    const removeProduct = (id) =>
        setProducts((prev) => prev.filter((p) => p.id !== id));

    const handleUpdate = async () => {
        setLoading(true);

        const { error } = await supabase
            .from("Users")
            .update({ ...companyData, products })
            .eq("email", userEmail);

        if (error) toast.error("Update failed");
        else toast.success("Updated successfully");

        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <ToastContainer />

            {/* ---------- PERSONAL ---------- */}
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-2xl text-slate-600 dark:text-slate-200 font-bold">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">

                    <Label className="text-slate-800 dark:text-slate-300">User Name</Label>
                    <Input value={companyData.name} onChange={(e) => handleChange("name", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">User Role</Label>
                    <Input value={companyData.role} onChange={(e) => handleChange("role", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Phone Number</Label>
                    <Input value={companyData.phone} onChange={(e) => handleChange("phone", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                </CardContent>
            </Card>

            {/* ---------- COMPANY ---------- */}
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-2xl text-slate-600 dark:text-slate-200 font-bold">Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">

                    <Label className="text-slate-800 dark:text-slate-300">Company Name</Label>
                    <Input value={companyData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Company Description</Label>
                    <Textarea value={companyData.companyDescription} onChange={(e) => handleChange("companyDescription", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Company Website</Label>
                    <Input value={companyData.companyWebsite} onChange={(e) => handleChange("companyWebsite", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Industry</Label>
                    <Input value={companyData.industry} onChange={(e) => handleChange("industry", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Company Size</Label>
                    <Input value={companyData.companySize} onChange={(e) => handleChange("companySize", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                </CardContent>
            </Card>

            {/* ---------- PRODUCTS ---------- */}
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-2xl text-slate-600 dark:text-slate-200 font-bold">Products and Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                    <Label className="text-slate-800 dark:text-slate-300">Product Name</Label>
                    <Input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Product Category</Label>
                    <Input value={newProduct.category} onChange={(e) => setNewProduct(p => ({ ...p, category: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Price (Numeric Value)</Label>
                    <Input value={newProduct.price} onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Currency (INR / USD)</Label>
                    <Input value={newProduct.currency} onChange={(e) => setNewProduct(p => ({ ...p, currency: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Billing Cycle (one-time / monthly)</Label>
                    <Input value={newProduct.billingCycle} onChange={(e) => setNewProduct(p => ({ ...p, billingCycle: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Label className="text-slate-800 dark:text-slate-300">Product Description</Label>
                    <Textarea value={newProduct.description} onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                    <Button onClick={addProduct} className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white">
                        <Plus className="mr-2 w-4 h-4" />Add Product
                    </Button>

                    {/* LIST */}
                    {products.map((p, i) => (
                        <div key={p.id} className="border dark:border-slate-700 p-4 rounded-lg bg-white dark:bg-slate-800/50 space-y-3 shadow-sm">

                            <Label className="text-slate-800 dark:text-slate-300">Product Name</Label>
                            <Input value={p.name} onChange={(e) => handleProductChange(i, "name", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                            <Label className="text-slate-800 dark:text-slate-300">Category</Label>
                            <Input value={p.category} onChange={(e) => handleProductChange(i, "category", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                            <Label className="text-slate-800 dark:text-slate-300">Price</Label>
                            <Input value={p.price} onChange={(e) => handleProductChange(i, "price", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                            <Label className="text-slate-800 dark:text-slate-300">Currency</Label>
                            <Input value={p.currency} onChange={(e) => handleProductChange(i, "currency", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                            <Label className="text-slate-800 dark:text-slate-300">Billing Cycle</Label>
                            <Input value={p.billingCycle} onChange={(e) => handleProductChange(i, "billingCycle", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                            <Label className="text-slate-800 dark:text-slate-300">Description</Label>
                            <Textarea value={p.description} onChange={(e) => handleProductChange(i, "description", e.target.value)} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />

                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={() => removeProduct(p.id)}
                                    className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border-none"
                                    size="icon"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                        </div>
                    ))}

                </CardContent>
            </Card>

            {/* ---------- ACTION ---------- */}
            <Button onClick={handleUpdate} disabled={loading} className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white">
                <Upload className="mr-2 w-4 h-4" />
                Update Database
            </Button>
        </div>
    );
}
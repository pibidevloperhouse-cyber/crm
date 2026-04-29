"use client";

import { supabase } from "../../../../utils/supabase/client";
import { useEffect, useState } from "react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { DollarSign, Percent, Info, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PricingDetailsSection({ selectedDealId, onNext, onBack }) {
  const [deal, setDeal] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  const fetchData = async (email, dealId) => {
    if (!email || !dealId) return;
    setIsLoading(true);

    const { data: dealData, error: dealError } = await supabase
      .from("Deals")
      .select("*")
      .eq("id", dealId)
      .single();

    if (dealError) {
      console.error("Error fetching deal:", dealError);
      toast.error("Failed to fetch deal details.");
      setIsLoading(false);
      return;
    }

    setDeal(dealData);

    const { data: productsData, error: productsError } = await supabase
      .from("Users")
      .select("products")
      .eq("email", email)
      .single();

    if (productsError) {
      console.error("Error fetching products:", productsError);
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
    }
  }, []);

  useEffect(() => {
    if (userEmail && selectedDealId) {
      fetchData(userEmail, selectedDealId);
    }
  }, [userEmail, selectedDealId]);

  const handleChange = (field, index, value) => {
    const updatedDeal = { ...deal };
    if (!updatedDeal[field]) updatedDeal[field] = [];
    updatedDeal[field][index] = value;
    setDeal(updatedDeal);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("Deals")
      .update({
        quantity: deal.quantity || [],
        user_discount: deal.user_discount || [],
        labour_cost: deal.labour_cost || [],
        manufacturing_cost: deal.manufacturing_cost || [],
        shipping_cost: deal.shipping_cost || [],
      })
      .eq("id", deal.id);

    if (error) {
      toast.error("Failed to save pricing details.");
    } else {
      toast.success("Pricing details saved successfully!");
      onNext();
    }
  };

  const calculateOriginalPrice = (productName) => {
    const product = products.find((p) => p.name === productName);
    let price = parseFloat(product?.price || 0);

    // Add configuration price if exists
    const productIndex = deal.products?.indexOf(productName);
    if (deal.configuration && deal.configuration[productIndex]) {
      const config = deal.configuration[productIndex];
      for (const cat in config) {
        price += parseFloat(config[cat]?.price || 0);
      }
    }
    return price;
  };

  if (isLoading) return <div className="h-full flex items-center justify-center">Loading pricing data...</div>;
  if (!deal) return <div className="text-center p-10">No deal selected.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="bg-teal-500/10 text-teal-700 p-2 rounded-lg">Level 2</span>
          Pricing & Discounts
        </h2>
        <p className="text-slate-500 text-sm mt-1">Set quantities, discounts, and costs for each item in the deal.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Price Items for {deal.name}</CardTitle>
            <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              {deal.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableHead className="w-[300px]">Product</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Discount (%)</TableHead>
                <TableHead>Total (Excl. Tax)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deal.products?.map((productName, index) => {
                const basePrice = calculateOriginalPrice(productName);
                const qty = parseInt(deal.quantity?.[index] || 1);
                const discount = parseFloat(deal.user_discount?.[index] || 0);
                const total = (basePrice * qty * (1 - discount / 100));

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{productName}</TableCell>
                    <TableCell>${basePrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20 h-9"
                        value={deal.quantity?.[index] || 1}
                        onChange={(e) => handleChange("quantity", index, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20 h-9"
                          value={deal.user_discount?.[index] || 0}
                          onChange={(e) => handleChange("user_discount", index, e.target.value)}
                        />
                        <Percent className="h-4 w-4 text-slate-400" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-teal-600 dark:text-teal-400">
                      ${total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Loyalty Bonus</h4>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Standard Discount</p>
              <p className="text-[10px] text-slate-500">Based on deal history</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">AI Suggestions</h4>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Optimized Range</p>
              <p className="text-[10px] text-slate-500">Suggested: 5% - 15%</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
          <h4 className="text-xs font-bold opacity-70 uppercase tracking-widest mb-2">Grand Total</h4>
          <p className="text-3xl font-bold">
            ${deal.products?.reduce((sum, productName, index) => {
              const basePrice = calculateOriginalPrice(productName);
              const qty = parseInt(deal.quantity?.[index] || 1);
              const discount = parseFloat(deal.user_discount?.[index] || 0);
              return sum + (basePrice * qty * (1 - discount / 100));
            }, 0).toFixed(2)}
          </p>
          <p className="text-[10px] opacity-70 mt-1">Excludes taxes and shipping</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onBack} className="rounded-xl px-6">
          Back to Configure
        </Button>
        <Button onClick={handleSave} className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Save className="h-4 w-4" />
          Save & Continue
        </Button>
      </div>
    </div>
  );
}

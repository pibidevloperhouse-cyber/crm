"use client";

import { supabase } from "../../../../utils/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QuotePreview from "@/components/QuotePreview";
import InvoicePreview from "@/components/InvoicePreview";
import { FileText, Package, DollarSign, Calendar, ArrowRight, Share2, Printer, Receipt } from "lucide-react";
import { toast } from "react-toastify";

export default function PreviewQuoteSection({ selectedDealId, onBack }) {
  const [deal, setDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (dealId) => {
    if (!dealId) return;
    setIsLoading(true);

    const { data: dealData, error: dealError } = await supabase
      .from("Deals")
      .select("*")
      .eq("id", dealId)
      .single();

    if (dealError) {
      console.error("Error fetching deal:", dealError);
      toast.error("Failed to fetch deal for preview.");
    } else {
      setDeal(dealData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedDealId) {
      fetchData(selectedDealId);
    }
  }, [selectedDealId]);

  if (isLoading) return <div className="h-full flex items-center justify-center">Generating quote preview...</div>;
  if (!deal) return <div className="text-center p-10">No deal data available for preview.</div>;

  const totalValue = deal.products?.reduce((sum, _, i) => {
    // This is a simplified calculation for the preview card
    // The actual QuotePreview component uses its own complex logic
    return sum + (parseFloat(deal.value?.[i] || 0) * parseInt(deal.quantity?.[i] || 1));
  }, 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="bg-teal-500/10 text-teal-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-black">Level 3</span>
          Preview & Generate Quote
        </h2>
        <p className="text-slate-500 text-sm mt-1">Review the final quote and send it to your client.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Deal Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6">
              <Badge className="w-fit mb-2 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                Final Review
              </Badge>
              <CardTitle className="text-2xl font-black text-slate-800 dark:text-white">{deal.name}</CardTitle>
              <CardDescription>{deal.title || "Standard Project Quote"}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Items</p>
                    <p className="text-sm font-bold">{deal.products?.length || 0} Products Selected</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Value</p>
                    <p className="text-sm font-bold">${totalValue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Created At</p>
                    <p className="text-sm font-bold">{new Date(deal.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-slate-200 dark:border-slate-800">
                  <Printer className="h-4 w-4" />
                  Print Quote
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-slate-200 dark:border-slate-800">
                  <Share2 className="h-4 w-4" />
                  Share with Client
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote Preview Area */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px] bg-white dark:bg-slate-950">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Preview</span>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
            </div>
            <div className="p-4 sm:p-8 h-full overflow-y-auto flex flex-col items-center justify-center gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                <QuotePreview dealId={deal.id}>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-6 h-14 shadow-xl shadow-teal-600/20 gap-3">
                    <FileText className="h-5 w-5" />
                    Preview Quote
                  </Button>
                </QuotePreview>

                <InvoicePreview dealId={deal.id}>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-6 h-14 shadow-xl shadow-teal-600/20 gap-3">
                    <Receipt className="h-5 w-5" />
                    Preview Invoice
                  </Button>
                </InvoicePreview>
              </div>

              <div className="mt-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-center w-full">
                <p className="text-slate-500 text-sm italic">
                  "This preview shows the finalized prices, configurations, and terms.
                  Click the button above to view the high-fidelity document ready for client approval."
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-start pt-6 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onBack} className="rounded-xl px-6">
          Back to Pricing
        </Button>
      </div>
    </div>
  );
}

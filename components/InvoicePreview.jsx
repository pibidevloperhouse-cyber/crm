"use client";

import { useState, cloneElement, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "../utils/supabase/client";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { X, Download } from "lucide-react";

export default function InvoicePreview({ dealId, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deal, setDeal] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Calculate totals from deal data
  const subtotal =
    deal?.products?.reduce((sum, _, i) => {
      return (
        sum + Number(deal.value?.[i] || 0) * Number(deal.quantity?.[i] || 1)
      );
    }, 0) || 0;

  const taxRate = 0.0625;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handlePreview = () => {
    setIsOpen(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch deal data
      const { data: dealData, error: dealError } = await supabase
        .from("Deals")
        .select("*")
        .eq("id", dealId)
        .single();

      if (dealError) {
        console.error("Error fetching deal:", dealError);
      } else {
        setDeal(dealData);
      }

      // Fetch template data
      const { data: templateData, error: templateError } = await supabase
        .from("quote_templates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError) {
        console.error("Error fetching template:", templateError);
      } else {
        setTemplate(templateData);
      }
    } catch (err) {
      console.error("Unexpected error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!deal) {
      toast.error("No deal data available");
      return;
    }

    setGeneratingPDF(true);

    try {
      const element = document.getElementById("invoice-pdf-content");
      if (!element) {
        toast.error("Invoice content not found");
        setGeneratingPDF(false);
        return;
      }

      toast.info("Generating PDF, please wait...");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById("invoice-pdf-content");
          if (clonedElement) {
            clonedElement.style.visibility = "visible";
            clonedElement.style.display = "block";
          }
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      let pageCount = 1;
      while (heightLeft > 0 && pageCount < 10) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        pageCount++;
      }

      pdf.save(`Invoice-${dealId}-${new Date().getTime()}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(`PDF Error: ${error.message || "Unknown error"}. Try again.`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <>
      {children && cloneElement(children, { onClick: handlePreview })}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>Invoice Preview - Deal #{dealId}</SheetTitle>
            <SheetClose />
          </SheetHeader>
          {!deal ? (
            <p className="text-center mt-10 text-gray-500">
              {loading ? "Loading..." : "No data"}
            </p>
          ) : (
            <div className="space-y-6">
              <div
                id="invoice-pdf-content"
                className="bg-white w-full p-8 shadow-md"
              >
                {/* Header Section */}
                {template?.header_image_url ? (
                  <div className="w-full mb-6 h-[150px] overflow-hidden">
                    <img
                      src={template.header_image_url}
                      alt="Company Header"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-2xl text-black font-semibold">
                        My Company name
                      </h1>
                      <p className="text-gray-500">My company slogan</p>

                      <div className="mt-4 border border-black rounded-md w-48 h-20 flex items-center justify-center text-gray-400">
                        Insert Your Logo
                      </div>
                    </div>

                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-blue-900">
                        Invoice
                      </h2>

                      <div className="mt-3 text-black text-sm space-y-1">
                        <p>
                          <strong>Date:</strong>{" "}
                          {deal?.created_at
                            ? new Date(deal.created_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                        <p>
                          <strong>Invoice #:</strong> INV-
                          {String(dealId).slice(-6)}
                        </p>
                        <p>
                          <strong>Customer ID:</strong>{" "}
                          {deal?.customer_id || "ABC12345"}
                        </p>
                        <p>
                          <strong>Purchase Order #:</strong>{" "}
                          {deal?.po_number || "12345678"}
                        </p>
                        <p>
                          <strong>Payment Due by:</strong>{" "}
                          {deal?.valid_until
                            ? new Date(deal.valid_until).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Details Box - Show even with header image */}
                {template?.header_image_url && (
                  <div className="flex justify-between mt-4">
                    <div>
                      {/* Optionally show text address here if preferred */}
                    </div>
                    <div className="text-right">
                      <h2 className="text-3xl text-blue-800 font-bold mb-2">
                        INVOICE
                      </h2>
                      <table className="text-sm border border-gray-700">
                        <tbody>
                          <tr>
                            <td className="border border-gray-700 px-2 font-semibold">
                              DATE
                            </td>
                            <td className="border border-gray-700 px-2">
                              {deal?.created_at
                                ? new Date(deal.created_at).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-700 px-2 font-semibold">
                              INVOICE #
                            </td>
                            <td className="border border-gray-700 px-2">
                              INV-{String(dealId).slice(-6)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-700 px-2 font-semibold">
                              CUSTOMER ID
                            </td>
                            <td className="border border-gray-700 px-2">
                              {deal?.customer_id || "N/A"}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-700 px-2 font-semibold">
                              PAYMENT DUE
                            </td>
                            <td className="border border-gray-700 px-2">
                              {deal?.valid_until
                                ? new Date(
                                    deal.valid_until,
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bill To & Ship To */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="bg-blue-900 text-white px-2 py-1 text-sm">
                      Bill To:
                    </h3>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      <p>{deal?.name || "[Customer Name]"}</p>
                      <p>{deal?.customer_company || "[Company Name]"}</p>
                      <p>{deal?.address || "[Street Address]"}</p>
                      <p>{deal?.city || "[City, ST ZIP Code]"}</p>
                      <p>{deal?.number || "[Phone]"}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="bg-blue-900 text-white px-2 py-1 text-sm">
                      Ship To (If Different):
                    </h3>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      <p>{deal?.ship_to_name || deal?.name || "[Name]"}</p>
                      <p>
                        {deal?.ship_to_company ||
                          deal?.customer_company ||
                          "[Company Name]"}
                      </p>
                      <p>
                        {deal?.ship_to_address ||
                          deal?.address ||
                          "[Street Address]"}
                      </p>
                      <p>
                        {deal?.ship_to_city ||
                          deal?.city ||
                          "[City, ST ZIP Code]"}
                      </p>
                      <p>{deal?.ship_to_phone || deal?.number || "[Phone]"}</p>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full border border-black text-sm mb-6">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Unit Price</th>
                      <th className="text-right px-3 py-2">Qty</th>
                      <th className="text-right px-3 py-2">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-black border-black">
                    {deal?.products?.length > 0
                      ? deal.products.map((item, index) => {
                          const qty = deal.quantity?.[index] || 1;
                          const price = Number(deal.value?.[index]) || 0;
                          const lineTotal = qty * price;
                          return (
                            <tr key={index} className="border-t border-black">
                              <td className="px-3 py-2">{item}</td>
                              <td className="px-3 py-2 text-right">
                                ₹{price.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">{qty}</td>
                              <td className="px-3 py-2 text-right">
                                ₹{lineTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      : Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i} className="border-t border-black h-8">
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                  </tbody>
                </table>

                {/* Notes & Totals */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Notes */}
                  <div>
                    <h3 className="bg-blue-900 text-white px-2 py-1 text-sm">
                      Special Notes and Instructions
                    </h3>
                    <div className="border border-black h-32 p-2 text-xs text-gray-600">
                      {deal?.description || "Add special notes here"}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="text-sm text-black">
                    <div className="flex justify-between py-1">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Sales Tax Rate</span>
                      <span>{(taxRate * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Sales Tax</span>
                      <span>₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>S&amp;H</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Discount</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold border-t mt-2">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Image or Default Footer */}
                {template?.footer_image_url ? (
                  <div className="w-full mt-8 h-[120px] overflow-hidden">
                    <img
                      src={template.footer_image_url}
                      alt="Company Footer"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="text-center mt-8 text-sm text-gray-600">
                    <p>
                      Make all checks payable to{" "}
                      {deal?.title || "My Company name"}
                    </p>
                    <p className="font-semibold mt-2">
                      Thank you for your business!
                    </p>
                    <p className="mt-2">
                      Should you have any enquiries concerning this invoice,
                      please contact {deal?.salesperson || "John Doe"} at{" "}
                      {deal?.email || "email@company.com"}
                    </p>
                    <p className="mt-2">
                      {deal?.address ||
                        "111 Street, Town/City, County, ST, 00000"}
                    </p>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <div className="flex gap-3 justify-end">
                <Button
                  className="bg-transparent hover:bg-blue-500/10 text-blue-700 border border-blue-700 hover:border-transparent dark:border-blue-200 dark:text-blue-100"
                  onClick={handleDownloadPDF}
                  disabled={generatingPDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingPDF
                    ? "Generating PDF..."
                    : "Download Invoice as PDF"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

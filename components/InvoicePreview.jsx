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

export default function InvoicePreview({ dealId, children, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deal, setDeal] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [products, setProducts] = useState([]);

  // // Calculate totals from deal data
  // const subtotal =
  //   deal?.products?.reduce((sum, _, i) => {
  //     return (
  //       sum + Number(deal.value?.[i] || 0) * Number(deal.quantity?.[i] || 1)
  //     );
  //   }, 0) || 0;

  // const taxRate = 0.0625;
  // const tax = subtotal * taxRate;
  // const total = subtotal + tax;

  // Use saved totals from pricing page
  const getProductPrice = (productName, index) => {
    const product = products.find((p) => p.name === productName);
    let price = parseFloat(product?.base_price || product?.price || 0);
    if (deal?.configuration?.[index]) {
      const config = deal.configuration[index];
      for (const cat in config) {
        price += parseFloat(config[cat]?.price || 0);
      }
    }
    return price;
  };

  const subtotal = deal?.subtotal ?? 0;
  const tax = deal?.total_tax ?? 0;
  const total = deal?.finalPrice ?? subtotal + tax;
  const taxRate = subtotal > 0 ? tax / subtotal : 0;

  const handlePreview = () => {
    setIsOpen(true);
    fetchData();
    if (onComplete) onComplete();
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

      // ✅ Fetch products for real unit prices
      const storedSession = localStorage.getItem("session");
      const currentUserEmail = storedSession
        ? JSON.parse(storedSession)?.user?.email
        : null;

      if (currentUserEmail) {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("user_email", currentUserEmail);
        if (!productsError) setProducts(productsData || []);
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

  const loadImageAsBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleDownloadPDF = async () => {
    if (!deal) {
      toast.error("No deal data available");
      return;
    }

    setGeneratingPDF(true);

    try {
      toast.info("Generating PDF, please wait...");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginL = 15;
      const marginR = 15;
      const contentWidth = pageWidth - marginL - marginR;
      let y = 15;

      // ── Helper: blue banner ──────────────────────────────────────
      const blueBanner = (label, yPos) => {
        pdf.setFillColor(30, 58, 138); // blue-900
        pdf.rect(marginL, yPos, contentWidth, 8, "F");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(label, marginL + 3, yPos + 5.5);
        return yPos + 8;
      };

      // ── HEADER ───────────────────────────────────────────────────
      if (template?.header_image_url) {
        try {
          const img = await loadImageAsBase64(template.header_image_url);
          pdf.addImage(img, "JPEG", 0, 0, pageWidth, 38);
          y = 44;
        } catch {
          // fallback: plain text header
          pdf.setFontSize(18);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(30, 30, 30);
          pdf.text("My Company name", marginL, y);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(120, 120, 120);
          pdf.text("My company slogan", marginL, y + 7);
          y += 20;
        }
      } else {
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 30, 30);
        pdf.text("My Company name", marginL, y);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text("My company slogan", marginL, y + 7);
        y += 20;
      }

      // ── INVOICE title + info table (top-right) ───────────────────
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);

      // If a header image was rendered we moved `y` down. Position the
      // invoice title and info table relative to `y` so they don't overlap
      // the header image (matches QuotePreview behaviour).
      let invoiceTitleY = 20;
      let tY = 26;
      if (template?.header_image_url) {
        invoiceTitleY = y + 6;
        tY = y + 11;
      }

      pdf.text("INVOICE", pageWidth - marginR, invoiceTitleY, { align: "right" });

      const tableStartX = pageWidth - marginR - 65;
      const tableRowH = 7;
      const infoRows = [
        ["DATE",         deal.created_at   ? new Date(deal.created_at).toLocaleDateString()   : "N/A"],
        ["INVOICE #",    `INV-${String(dealId).slice(-6)}`],
        ["CUSTOMER ID",  deal.customer_id  || "N/A"],
        ["PAYMENT DUE",  deal.valid_until  ? new Date(deal.valid_until).toLocaleDateString()  : "N/A"],
      ];

      pdf.setFontSize(8);
      infoRows.forEach(([label, value]) => {
        pdf.setDrawColor(120, 120, 120);
        pdf.rect(tableStartX, tY, 65, tableRowH);
        pdf.line(tableStartX + 28, tY, tableStartX + 28, tY + tableRowH);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        pdf.text(label, tableStartX + 2, tY + 4.8);
        pdf.setFont("helvetica", "normal");
        pdf.text(value, tableStartX + 30, tY + 4.8);
        tY += tableRowH;
      });

      y = Math.max(y, tY + 6);

      // ── BILL TO & SHIP TO (2 columns) ────────────────────────────
      const colMid = marginL + contentWidth / 2 + 3;

      // Bill To header
      pdf.setFillColor(30, 58, 138);
      pdf.rect(marginL, y, contentWidth / 2 - 3, 8, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Bill To:", marginL + 3, y + 5.5);

      // Ship To header
      pdf.setFillColor(30, 58, 138);
      pdf.rect(colMid, y, contentWidth / 2 - 3, 8, "F");
      pdf.text("Ship To (If Different):", colMid + 3, y + 5.5);
      y += 8;

      // Bill To content
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(55, 65, 81); // gray-700
      const billLines = [
        deal.name             || "[Customer Name]",
        deal.customer_company || "[Company Name]",
        deal.address          || "[Street Address]",
        deal.city             || "[City, ST ZIP Code]",
        deal.number           || "[Phone]",
      ];
      const shipLines = [
        deal.ship_to_name    || deal.name             || "[Name]",
        deal.ship_to_company || deal.customer_company || "[Company Name]",
        deal.ship_to_address || deal.address          || "[Street Address]",
        deal.ship_to_city    || deal.city             || "[City, ST ZIP Code]",
        deal.ship_to_phone   || deal.number           || "[Phone]",
      ];

      const addrStartY = y + 5;
      billLines.forEach((line, i) => {
        pdf.text(line, marginL + 2, addrStartY + i * 6);
      });
      shipLines.forEach((line, i) => {
        pdf.text(line, colMid + 2, addrStartY + i * 6);
      });

      y = addrStartY + billLines.length * 6 + 6;

      // ── PRODUCTS TABLE ───────────────────────────────────────────
      const col = {
        desc:      marginL + 2,
        unitPrice: marginL + contentWidth * 0.52,
        qty:       marginL + contentWidth * 0.65,
        lineTotal: marginL + contentWidth + 2,
      };

      // Table header
      pdf.setFillColor(30, 58, 138);
      pdf.rect(marginL, y, contentWidth, 8, "F");
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Description",  col.desc, y + 5.5);
      pdf.text("Unit Price",   col.unitPrice, y + 5.5, { align: "right" });
      pdf.text("Qty",          col.qty,       y + 5.5, { align: "right" });
      pdf.text("Line Total",   col.lineTotal, y + 5.5, { align: "right" });
      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(30, 30, 30);
      pdf.setDrawColor(0, 0, 0);

      if (deal.products?.length > 0) {
        deal.products.forEach((item, index) => {
          if (y > pageHeight - 80) { pdf.addPage(); y = 20; }
          // const qty   = Number(deal.quantity?.[index] || 1);
          // const price = Number(deal.value?.[index] || 0);
          // const lineTotal = qty * price;

          const qty   = Number(deal.quantity?.[index] || 1);
          const price = getProductPrice(item, index);
          const lineTotal = qty * price;

          pdf.rect(marginL, y, contentWidth, 8);
          pdf.setFontSize(8.5);
          pdf.text(String(item),          col.desc,      y + 5.5);
          pdf.text(`Rs.${price.toFixed(2)}`,  col.unitPrice, y + 5.5, { align: "right" });
          pdf.text(String(qty),           col.qty,       y + 5.5, { align: "right" });
          pdf.text(`Rs.${lineTotal.toFixed(2)}`, col.lineTotal, y + 5.5, { align: "right" });
          y += 8;
        });
      } else {
        // 8 empty rows
        for (let i = 0; i < 8; i++) {
          pdf.rect(marginL, y, contentWidth, 8);
          y += 8;
        }
      }

      y += 6;

      // ── NOTES + TOTALS (2 columns) ───────────────────────────────
      const notesWidth  = contentWidth * 0.52;
      const totalsX     = marginL + notesWidth + 6;
      const totalsWidth = contentWidth - notesWidth - 6;
      const notesStartY = y;

      // Notes banner
      pdf.setFillColor(30, 58, 138);
      pdf.rect(marginL, y, notesWidth, 8, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Special Notes and Instructions", marginL + 3, y + 5.5);
      y += 8;

      // Notes box
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(marginL, y, notesWidth, 32);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(75, 85, 99);
      const notesText = deal.description || "Add special notes here";
      const wrappedNotes = pdf.splitTextToSize(notesText, notesWidth - 4);
      pdf.text(wrappedNotes, marginL + 2, y + 6);

      // Totals (right side)
      const totalsStartY = notesStartY;
      const totRows = [
        ["Subtotal",       `Rs.${subtotal.toFixed(2)}`],
        ["Sales Tax Rate", `${(taxRate * 100).toFixed(2)}%`],
        ["Sales Tax",      `Rs.${tax.toFixed(2)}`],
        ["S&H",            "-"],
        ["Discount",       "-"],
      ];

      let tRowY = totalsStartY + 4;
      pdf.setFontSize(9);
      totRows.forEach(([label, value]) => {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 30, 30);
        pdf.text(label, totalsX, tRowY);
        pdf.text(value, marginL + contentWidth, tRowY, { align: "right" });
        tRowY += 7;
      });

      // Total row
      pdf.setDrawColor(80, 80, 80);
      pdf.line(totalsX, tRowY, marginL + contentWidth, tRowY);
      tRowY += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text("Total", totalsX, tRowY);
      pdf.text(`Rs.${total.toFixed(2)}`, marginL + contentWidth, tRowY, { align: "right" });

      y = Math.max(y + 32, tRowY) + 10;

      // ── FOOTER ───────────────────────────────────────────────────
      if (template?.footer_image_url) {
        try {
          const footerImg = await loadImageAsBase64(template.footer_image_url);
          pdf.addImage(footerImg, "JPEG", 0, pageHeight - 28, pageWidth, 28);
        } catch {
          // text footer fallback
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text(
            `Make all checks payable to ${deal.title || "My Company name"}`,
            pageWidth / 2, pageHeight - 20, { align: "center" }
          );
          pdf.setFont("helvetica", "bold");
          pdf.text("Thank you for your business!", pageWidth / 2, pageHeight - 14, { align: "center" });
          pdf.setFont("helvetica", "normal");
          pdf.text(
            `Contact: ${deal.salesperson || "John Doe"} | ${deal.email || "email@company.com"}`,
            pageWidth / 2, pageHeight - 8, { align: "center" }
          );
        }
      } else {
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `Make all checks payable to ${deal.title || "My Company name"}`,
          pageWidth / 2, pageHeight - 20, { align: "center" }
        );
        pdf.setFont("helvetica", "bold");
        pdf.text("Thank you for your business!", pageWidth / 2, pageHeight - 14, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `Contact: ${deal.salesperson || "John Doe"} | ${deal.email || "email@company.com"}`,
          pageWidth / 2, pageHeight - 8, { align: "center" }
        );
      }

      pdf.save(`Invoice-${dealId}-${Date.now()}.pdf`);
      toast.success("PDF downloaded successfully!");

    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(`PDF Error: ${error.message || "Unknown error"}`);
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
                          // const qty = deal.quantity?.[index] || 1;
                          // const price = Number(deal.value?.[index]) || 0;
                          // const lineTotal = qty * price;
                          const qty   = Number(deal.quantity?.[index] || 1);
                          const price = getProductPrice(item, index);
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
                  <div className="w-full mt-8">
                    <img
                      src={template.footer_image_url}
                      alt="Company Footer"
                      className="w-full h-auto object-contain"
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

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "../utils/supabase/client";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

async function loadImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function drawTextHeader(pdf, deal, template, y, marginL, pageWidth) {
  pdf.setFillColor(173, 216, 230);
  pdf.rect(marginL, y, 10, 10, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text("LOGO", marginL + 1.2, y + 6.5);

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 80, 140);
  pdf.text(
    template?.template_data?.headerTitle || deal.title || "Company Name",
    marginL + 13, y + 7
  );
  y += 14;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 80, 140);
  pdf.text(
    template?.template_data?.headerSubtitle || deal.subtitle || "",
    marginL, y
  );
  y += 6;

  pdf.setFontSize(8.5);
  pdf.setTextColor(60, 60, 60);
  const lines = [
    template?.template_data?.headerAddress || deal.address || "",
    template?.template_data?.headerPhone || deal.number || "",
    template?.template_data?.headerEmail || deal.email || "",
  ].filter(Boolean);
  lines.forEach((line) => { pdf.text(line, marginL, y); y += 5; });

  return y + 6;
}

function drawTextFooter(pdf, template, pageHeight, pageWidth) {
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    template?.template_data?.footerNote || "If you have any questions about this price quote, please contact us.",
    pageWidth / 2, pageHeight - 12, { align: "center" }
  );
  if (template?.template_data?.footerDisclaimer) {
    pdf.text(
      template.template_data.footerDisclaimer,
      pageWidth / 2, pageHeight - 7, { align: "center" }
    );
  }
  pdf.setFont("helvetica", "bolditalic");
  pdf.text("Thank You For Your Business!", pageWidth / 2, pageHeight - 3, { align: "center" });
}

function QuotePreview({ dealId, children, onComplete }) {
  const [open, setOpen] = useState(false);
  const [deal, setDeal] = useState(null);
  const [products, setProducts] = useState([]); // ✅ NEW: products list
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [template, setTemplate] = useState(null);

  // ✅ FIX: Get the real unit price from products table (mirrors PricingDetailsSection logic)
  const getProductPrice = (productName, index) => {
    const product = products.find((p) => p.name === productName);
    let price = parseFloat(product?.base_price || product?.price || 0);

    // Add configuration costs if present
    if (deal?.configuration?.[index]) {
      const config = deal.configuration[index];
      for (const cat in config) {
        price += parseFloat(config[cat]?.price || 0);
      }
    }
    return price;
  };

  // ✅ FIX: Use saved totals from PricingDetailsSection (subtotal, total_tax, finalPrice)
  const finalSubtotal = deal?.subtotal ?? 0;
  const finalTax = deal?.total_tax ?? 0;
  const finalTotal = deal?.finalPrice ?? finalSubtotal + finalTax;
  const taxRate = finalSubtotal > 0 ? finalTax / finalSubtotal : 0;

  const handlePreview = async () => {
    setOpen(true);
    await fetchDeal();
    if (onComplete) onComplete();
  };

  async function fetchDeal() {
    if (!dealId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("Deals")
        .select("*")
        .eq("id", dealId)
        .single();

      if (error) {
        console.error("Error fetching deal:", error);
      } else {
        setDeal(data);
      }

      const storedSession = localStorage.getItem("session");
      const currentUserEmail = storedSession
        ? JSON.parse(storedSession)?.user?.email
        : null;

      // ✅ NEW: Fetch products table to get real base prices
      if (currentUserEmail) {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("user_email", currentUserEmail);

        if (productsError) {
          console.error("Error fetching products:", productsError);
        } else {
          setProducts(productsData || []);
        }
      }

      let templateData = null;
      let templateError = null;

      if (currentUserEmail) {
        const { data, error } = await supabase
          .from("quote_templates")
          .select("*")
          .eq("user_email", currentUserEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        templateData = data;
        templateError = error;
      }

      if (!templateData) {
        const { data, error } = await supabase
          .from("quote_templates")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        templateData = data;
        if (error) templateError = error;
      }

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
  }

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

      const blueBanner = (label, yPos) => {
        pdf.setFillColor(30, 80, 140);
        pdf.rect(marginL, yPos, contentWidth, 8, "F");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(label, marginL + 3, yPos + 5.5);
        return yPos + 8;
      };

      // HEADER
      if (template?.header_image_url) {
        try {
          const img = await loadImageAsBase64(template.header_image_url);
          pdf.addImage(img, "JPEG", 0, 0, pageWidth, 38);
          y = 44;
        } catch {
          y = drawTextHeader(pdf, deal, template, y, marginL, pageWidth);
        }
      } else {
        y = drawTextHeader(pdf, deal, template, y, marginL, pageWidth);
      }

      // QUOTE INFO TABLE
      const tableStartX = pageWidth - marginR - 65;
      const tableRowH = 7;
      const quoteRows = [
        ["DATE", deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "N/A"],
        ["QUOTE #", String(deal.id)],
        ["CUSTOMER ID", deal.customer_id || "N/A"],
        ["VALID UNTIL", deal.valid_until ? new Date(deal.valid_until).toLocaleDateString() : "N/A"],
      ];

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 80, 140);

      let quoteTitleY = 15;
      let tY = 20;

      if (template?.header_image_url) {
        quoteTitleY = y + 6;
        tY = y + 11;
      }

      pdf.text("QUOTE", pageWidth - marginR, quoteTitleY, { align: "right" });

      pdf.setFontSize(8);
      quoteRows.forEach(([label, value]) => {
        pdf.setDrawColor(120, 120, 120);
        pdf.rect(tableStartX, tY, 65, tableRowH);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        pdf.text(label, tableStartX + 2, tY + 4.8);
        pdf.line(tableStartX + 28, tY, tableStartX + 28, tY + tableRowH);
        pdf.setFont("helvetica", "normal");
        pdf.text(value, tableStartX + 30, tY + 4.8);
        tY += tableRowH;
      });

      y = Math.max(y, tY + 6);

      // CUSTOMER
      y = blueBanner("CUSTOMER", y);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 50);
      y += 5;
      pdf.text(deal.name || "-", marginL + 2, y); y += 6;
      pdf.text(deal.customer_company || "-", marginL + 2, y); y += 6;
      pdf.text(deal.customer_address || deal.address || "-", marginL + 2, y); y += 10;

      // ITEMS TABLE
      const col = {
        desc: marginL + 2,
        unitPrice: marginL + contentWidth * 0.52,
        qty: marginL + contentWidth * 0.65,
        taxed: marginL + contentWidth * 0.78,
        amount: marginL + contentWidth + 2,
      };

      pdf.setFillColor(30, 80, 140);
      pdf.rect(marginL, y, contentWidth, 8, "F");
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("DESCRIPTION", col.desc, y + 5.5);
      pdf.text("UNIT PRICE", col.unitPrice, y + 5.5, { align: "right" });
      pdf.text("QTY", col.qty, y + 5.5, { align: "right" });
      pdf.text("TAXED", col.taxed, y + 5.5, { align: "right" });
      pdf.text("AMOUNT", col.amount, y + 5.5, { align: "right" });
      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 50);

      if (deal.products?.length > 0) {
        deal.products.forEach((item, index) => {
          if (y > pageHeight - 70) { pdf.addPage(); y = 20; }

          const qty = Number(deal.quantity?.[index] || 1);
          // ✅ FIX: Use getProductPrice instead of deal.value?.[index]
          const price = getProductPrice(item, index);
          const amount = qty * price;

          pdf.setDrawColor(200, 200, 200);
          pdf.rect(marginL, y, contentWidth, 8);
          pdf.setFontSize(8.5);
          pdf.text(String(item), col.desc, y + 5.5);
          pdf.text(price.toFixed(2), col.unitPrice, y + 5.5, { align: "right" });
          pdf.text(String(qty), col.qty, y + 5.5, { align: "right" });
          pdf.text("-", col.taxed, y + 5.5, { align: "right" });
          pdf.text(amount.toFixed(2), col.amount, y + 5.5, { align: "right" });
          y += 8;
        });
      } else {
        pdf.text("No items", col.desc, y + 5); y += 8;
      }

      y += 6;

      // TOTALS — ✅ FIX: Use saved deal values from PricingDetailsSection
      const pdfSubtotal = deal.subtotal ?? 0;
      const pdfTax = deal.total_tax ?? 0;
      const pdfTotal = deal.finalPrice ?? pdfSubtotal + pdfTax;
      const pdfTaxRate = pdfSubtotal > 0 ? pdfTax / pdfSubtotal : 0;

      const totLabelX = pageWidth - marginR - 48;
      const totValueX = pageWidth - marginR;

      const totalsRows = [
        ["Subtotal", `₹${pdfSubtotal.toFixed(2)}`],
        ["Taxable", `₹${pdfSubtotal.toFixed(2)}`],
        ["Tax rate", `${(pdfTaxRate * 100).toFixed(2)}%`],
        ["Tax due", `₹${pdfTax.toFixed(2)}`],
        ["Other", "-"],
      ];

      pdf.setFontSize(9);
      totalsRows.forEach(([label, value]) => {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(50, 50, 50);
        pdf.text(label, totLabelX, y);
        pdf.text(value, totValueX, y, { align: "right" });
        y += 7;
      });

      pdf.setDrawColor(80, 80, 80);
      pdf.line(totLabelX, y, totValueX, y);
      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text("TOTAL", totLabelX, y);
      pdf.text(`₹${pdfTotal.toFixed(2)}`, totValueX, y, { align: "right" });
      y += 14;

      // TERMS
      if (y > pageHeight - 65) { pdf.addPage(); y = 20; }
      y = blueBanner("TERMS AND CONDITIONS", y);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 50);
      y += 5;
      const terms = [
        "1. Customer will be billed after indicating acceptance of this quote",
        "2. Payment will be due prior to delivery of service and goods",
        "3. Please fax or mail the signed price quote to the address above",
      ];
      terms.forEach((t) => { pdf.text(t, marginL + 2, y); y += 7; });
      y += 6;
      pdf.text("Customer Acceptance (sign below):", marginL + 2, y); y += 12;
      pdf.setDrawColor(80, 80, 80);
      pdf.line(marginL + 2, y, marginL + 85, y); y += 7;
      pdf.text("Print Name:", marginL + 2, y);

      // FOOTER
      if (template?.footer_image_url) {
        try {
          const footerImg = await loadImageAsBase64(template.footer_image_url);
          pdf.addImage(footerImg, "JPEG", 0, pageHeight - 28, pageWidth, 28);
        } catch {
          drawTextFooter(pdf, template, pageHeight, pageWidth);
        }
      } else {
        drawTextFooter(pdf, template, pageHeight, pageWidth);
      }

      pdf.save(`Quote-${dealId}-${Date.now()}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(`PDF Error: ${error.message || "Unknown error"}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div>
      {children ? (
        <div onClick={handlePreview}>{children}</div>
      ) : (
        <Button onClick={handlePreview}>Preview</Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="scale-100 w-[900px] sm:max-w-[1000px] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-center">
              QUOTATION
            </SheetTitle>
            <SheetDescription className="text-center text-gray-500">
              Preview your quote before sending
            </SheetDescription>
          </SheetHeader>

          {!deal ? (
            <p className="text-center mt-10 text-gray-500">
              {loading ? "Loading..." : "No data"}
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="bg-white min-h-screen p-10 flex justify-center">
                <div
                  id="quote-pdf-content"
                  className="bg-white w-[900px] p-8 shadow-md text-gray-900 border"
                >
                  {/* Header */}
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
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-300 w-10 h-10 flex items-center justify-center text-xs font-bold text-black">
                            LOGO
                          </div>
                          <h1 className="text-2xl font-bold text-blue-900">
                            {template?.template_data?.headerTitle || deal.title || "Company Name"}
                          </h1>
                        </div>
                        <div>
                          <p className="text-l font-bold text-blue-900">
                            {template?.template_data?.headerSubtitle || deal.subtitle || "Company Tagline"}
                          </p>
                        </div>
                        <div className="text-sm mt-3 leading-6 font-medium">
                          <p>{template?.template_data?.headerAddress || deal.address || "[Street Address]"}</p>
                          <p>{template?.template_data?.headerPhone || deal.number || "[000-000-0000]"}</p>
                          <p>{template?.template_data?.headerEmail || deal.email || "[email]"}</p>
                        </div>
                      </div>

                      {/* Quote Box */}
                      <div className="text-right">
                        <h2 className="text-3xl text-blue-800 font-bold mb-2">QUOTE</h2>
                        <table className="text-sm border border-gray-700">
                          <tbody>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">DATE</td>
                              <td className="border border-gray-700 px-2">
                                {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "N/A"}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">QUOTE #</td>
                              <td className="border border-gray-700 px-2">{deal.id}</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">CUSTOMER ID</td>
                              <td className="border border-gray-700 px-2">{deal.customer_id || "N/A"}</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">VALID UNTIL</td>
                              <td className="border border-gray-700 px-2">
                                {deal.valid_until ? new Date(deal.valid_until).toLocaleDateString() : "N/A"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* If image header exists, still show the Quote table */}
                  {template?.header_image_url && (
                    <div className="flex justify-between mt-4">
                      <div />
                      <div className="text-right">
                        <h2 className="text-3xl text-blue-800 font-bold mb-2">QUOTE</h2>
                        <table className="text-sm border border-gray-700">
                          <tbody>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">DATE</td>
                              <td className="border border-gray-700 px-2">
                                {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "N/A"}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">QUOTE #</td>
                              <td className="border border-gray-700 px-2">{deal.id}</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">CUSTOMER ID</td>
                              <td className="border border-gray-700 px-2">{deal.customer_id || "N/A"}</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">VALID UNTIL</td>
                              <td className="border border-gray-700 px-2">
                                {deal.valid_until ? new Date(deal.valid_until).toLocaleDateString() : "N/A"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Customer */}
                  <div className="mt-6">
                    <div className="bg-blue-900 text-white px-3 py-1 text-sm font-semibold">CUSTOMER</div>
                    <div className="text-sm mt-2 leading-6 font-medium">
                      <p>{deal.name}</p>
                      <p>{deal.customer_company || "-"}</p>
                      <p>{deal.customer_address || deal.address}</p>
                    </div>
                  </div>

                  {/* Items Table — ✅ FIX: use getProductPrice */}
                  <table className="w-full mt-6 border border-gray-700 text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="border border-gray-700 px-2 py-1 text-left">DESCRIPTION</th>
                        <th className="border border-gray-700 px-2">UNIT PRICE</th>
                        <th className="border border-gray-700 px-2">QTY</th>
                        <th className="border border-gray-700 px-2">TAXED</th>
                        <th className="border border-gray-700 px-2">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deal.products?.length > 0 ? (
                        deal.products.map((item, index) => {
                          const qty = deal.quantity?.[index] || 1;
                          // ✅ FIX: Real price from products table
                          const price = getProductPrice(item, index);
                          const amount = qty * price;

                          return (
                            <tr key={index}>
                              <td className="border px-2">{item}</td>
                              <td className="border px-2 text-right">{price.toFixed(2)}</td>
                              <td className="border px-2 text-center">{qty}</td>
                              <td className="border px-2 text-center">-</td>
                              <td className="border px-2 text-right">{amount.toFixed(2)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center">No items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Summary — ✅ FIX: Use saved deal totals */}
                  <div className="flex justify-end mt-4">
                    <table className="text-sm w-64">
                      <tbody>
                        <tr>
                          <td className="font-medium">Subtotal</td>
                          <td className="text-right">₹{finalSubtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Taxable</td>
                          <td className="text-right">₹{finalSubtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Tax rate</td>
                          <td className="text-right">{(taxRate * 100).toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Tax due</td>
                          <td className="text-right">₹{finalTax.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Other</td>
                          <td className="text-right">-</td>
                        </tr>
                        <tr className="font-bold border-t border-gray-700">
                          <td>TOTAL</td>
                          <td className="text-right">₹{finalTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Terms */}
                  <div className="mt-6">
                    <div className="bg-blue-900 text-white px-3 py-1 text-sm font-semibold">
                      TERMS AND CONDITIONS
                    </div>
                    <div className="text-sm mt-2 space-y-1 font-medium">
                      <p>1. Customer will be billed after indicating acceptance of this quote</p>
                      <p>2. Payment will be due prior to delivery of service and goods</p>
                      <p>3. Please fax or mail the signed price quote to the address above</p>
                    </div>
                    <div className="mt-4 text-sm font-medium">
                      <p>Customer Acceptance (sign below):</p>
                      <div className="border-b border-gray-700 mt-6 w-1/2"></div>
                      <p className="mt-2">Print Name:</p>
                    </div>
                  </div>

                  {/* Footer */}
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
                    <div className="text-center text-sm mt-8 font-medium">
                      <p>{template?.template_data?.footerNote || "If you have any questions about this price quote, please contact"}</p>
                      <p>{template?.template_data?.footerDisclaimer || ""}</p>
                      <p className="italic font-semibold mt-2">Thank You For Your Business!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 w-[800px] mx-auto">
                <Button
                  className="w-full bg-transparent hover:bg-green-500/10 text-green-700 border border-green-700 hover:border-transparent dark:border-green-200 dark:text-green-100"
                  onClick={() => setOpen(false)}
                >
                  Close Preview
                </Button>
                <Button
                  className="w-full bg-transparent hover:bg-blue-500/10 text-blue-700 border border-blue-700 hover:border-transparent dark:border-blue-200 dark:text-blue-100"
                  onClick={handleDownloadPDF}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? "Generating PDF..." : "Download Quote as PDF"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default QuotePreview;
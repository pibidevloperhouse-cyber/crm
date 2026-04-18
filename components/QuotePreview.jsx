//quote preview
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function QuotePreview({ dealId, children }) {
  const [open, setOpen] = useState(false);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [template, setTemplate] = useState(null);

  const subtotal =
    deal?.products?.reduce((sum, _, i) => {
      return (
        sum +
        Number(deal.value?.[i] || 0) *
        Number(deal.quantity?.[i] || 1)
      );
    }, 0) || 0;


  const taxRate = 0.0625;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handlePreview = async () => {
    setOpen(true);
    await fetchDeal();
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

      // Fetch the latest template to get header/footer images
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
  }

  /* IMPROVED PDF DOWNLOAD HANDLER */
  const handleDownloadPDF = async () => {
    if (!deal) {
      toast.error("No deal data available");
      return;
    }

    setGeneratingPDF(true);

    try {
      const element = document.getElementById("quote-pdf-content");
      if (!element) {
        toast.error("PDF content not found");
        setGeneratingPDF(false);
        return;
      }

      toast.info("Generating PDF, please wait...");

      // Small delay for stability and DOM settling
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const canvas = await html2canvas(element, {
        scale: 1.5, // Slightly lower for better memory reliability
        useCORS: true,
        allowTaint: false,
        logging: true, // Keep logging enabled to catch errors in dev console
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        // Optional onclone to ensure visibility
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById("quote-pdf-content");
          if (clonedElement) {
            clonedElement.style.visibility = "visible";
            clonedElement.style.display = "block";
          }
        }
      });

      // Using JPEG with quality 0.8 can be more memory efficient than PNG for large canvases
      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add extra pages if needed
      let pageCount = 1;
      while (heightLeft > 0 && pageCount < 10) { // Limit to 10 pages for safety
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        pageCount++;
      }

      pdf.save(`Quote-${dealId}-${new Date().getTime()}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation detailed error:", error);
      toast.error(`PDF Error: ${error.message || "Unknown error"}. Try again.`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Alternative PDF generation method as fallback
  const handleDownloadPDFAlternative = async () => {
    if (!deal) {
      toast.error("No deal data available");
      return;
    }

    setGeneratingPDF(true);

    try {
      toast.info("Generating PDF using alternative method...");

      const pdf = new jsPDF("p", "mm", "a4");
      let yPosition = 20;

      // Add company info
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("QUOTATION", 105, yPosition, { align: "center" });
      yPosition += 20;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Company details
      pdf.text(`Company: ${deal.title || "[Company Name]"}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Address: ${deal.address || "[Street Address]"}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`City: ${deal.city || "[City, ST ZIP]"}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Phone: ${deal.number || "(000) 000-0000"}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Email: ${deal.email || "company@email.com"}`, 20, yPosition);
      yPosition += 15;

      // Quote details table
      pdf.text(`Quote #: ${deal.id}`, 150, yPosition - 15);
      pdf.text(
        `Date: ${new Date(deal.created_at).toLocaleDateString()}`,
        150,
        yPosition - 9
      );
      pdf.text(`Valid Until: 2/15/2025`, 150, yPosition - 3);

      // Customer info
      pdf.setFont("helvetica", "bold");
      pdf.text("CUSTOMER INFO", 20, yPosition);
      yPosition += 8;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Name: ${deal.name || "[Customer Name]"}`, 20, yPosition);
      yPosition += 6;
      pdf.text(
        `Address: ${deal.address || "[Customer Address]"}`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Email: ${deal.user_email || "[Customer Email]"}`,
        20,
        yPosition
      );
      yPosition += 15;

      // Description
      pdf.setFont("helvetica", "bold");
      pdf.text("DESCRIPTION OF WORK", 20, yPosition);
      yPosition += 8;
      pdf.setFont("helvetica", "normal");
      const description = deal.description || "Provide project details here...";
      const splitDescription = pdf.splitTextToSize(description, 170);
      pdf.text(splitDescription, 20, yPosition);
      yPosition += splitDescription.length * 6 + 10;

      // Itemized costs table header
      pdf.setFont("helvetica", "bold");
      pdf.text("ITEMIZED COSTS", 20, yPosition);
      yPosition += 10;

      // Table headers
      pdf.text("ITEM", 20, yPosition);
      pdf.text("QTY", 120, yPosition);
      pdf.text("UNIT PRICE", 140, yPosition);
      pdf.text("AMOUNT", 170, yPosition);
      yPosition += 6;

      // Draw line
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 8;

      // Table rows
      pdf.setFont("helvetica", "normal");
      let subtotal = 0;

      if (deal.products && deal.products.length > 0) {
        deal.products.forEach((item, index) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }

          const quantity = deal.quantity?.[index] || 1;
          const unitPrice = Number(deal.value?.[index]) || 0;
          const amount = quantity * unitPrice;
          subtotal += amount;

          pdf.text(item, 20, yPosition);
          pdf.text(quantity.toString(), 120, yPosition);
          pdf.text(`$${unitPrice.toFixed(2)}`, 140, yPosition);
          pdf.text(`$${amount.toFixed(2)}`, 170, yPosition);
          yPosition += 8;
        });
      }

      yPosition += 5;
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 8;

      // Totals
      pdf.text("SUBTOTAL:", 140, yPosition);
      pdf.text(`$${subtotal.toFixed(2)}`, 170, yPosition);
      yPosition += 8;

      pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL QUOTE:", 140, yPosition);
      pdf.text(`$${subtotal.toFixed(2)}`, 170, yPosition);

      // Footer note
      yPosition += 20;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(
        "This quotation is an estimate. Payment is due prior to delivery of services.",
        105,
        yPosition,
        { align: "center" }
      );

      pdf.save(`Quote-${dealId}-simple.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating alternative PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
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
              {/* PDF Content */}
              <div className="bg-white min-h-screen p-10 flex justify-center">
                <div id="quote-pdf-content" className="bg-white w-[900px] p-8 shadow-md text-gray-900 border">

                  {/* Header */}
                  {template?.header_image_url ? (
                    <div className="w-full mb-6">
                      <img
                        src={template.header_image_url}
                        alt="Company Header"
                        className="w-full h-auto object-contain max-h-[150px] mx-auto"
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
                            {deal.title || "Company Name"}
                          </h1>
                        </div>

                        <div className="text-sm mt-3 leading-6 font-medium">
                          <p>{deal.address || "[Street Address]"}</p>
                          <p>{deal.city || "[City, ST ZIP]"}</p>
                          <p>{deal.email || "[email]"}</p>
                          <p>Website: {deal.website || "somedomain.com"}</p>
                          <p>Phone: {deal.number || "[000-000-0000]"}</p>
                          <p>Fax: {deal.fax || "[000-000-0000]"}</p>
                          <p>Prepared by: {deal.salesperson || "[salesperson name]"}</p>
                        </div>
                      </div>

                      {/* Quote Box */}
                      <div className="text-right">
                        <h2 className="text-3xl text-blue-800 font-bold mb-2">QUOTE</h2>
                        <table className="text-sm border border-gray-700">
                          <tbody>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">DATE</td>
                              <td className="border border-gray-700 px-2">{deal.created_at
                                ? new Date(deal.created_at).toLocaleDateString()
                                : "N/A"}</td>
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
                              <td className="border border-gray-700 px-2">{deal.valid_until
                                ? new Date(deal.valid_until).toLocaleDateString()
                                : "N/A"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* If image exists, we still want to show the Quote Plate (Date, ID, etc) below the image if it's not and the customer info */}
                  {template?.header_image_url && (
                    <div className="flex justify-between mt-4">
                      <div>
                        {/* Optionally show text address here if preferred, but usually image header contains it */}
                      </div>
                      <div className="text-right">
                        <h2 className="text-3xl text-blue-800 font-bold mb-2">QUOTE</h2>
                        <table className="text-sm border border-gray-700">
                          <tbody>
                            <tr>
                              <td className="border border-gray-700 px-2 font-semibold">DATE</td>
                              <td className="border border-gray-700 px-2">{deal.created_at
                                ? new Date(deal.created_at).toLocaleDateString()
                                : "N/A"}</td>
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
                              <td className="border border-gray-700 px-2">{deal.valid_until
                                ? new Date(deal.valid_until).toLocaleDateString()
                                : "N/A"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Customer */}
                  <div className="mt-6">
                    <div className="bg-blue-900 text-white px-3 py-1 text-sm font-semibold">
                      CUSTOMER
                    </div>
                    <div className="text-sm mt-2 leading-6 font-medium">
                      <p>{deal.name}</p>
                      <p>{deal.customer_company || "-"}</p>
                      <p>{deal.customer_address || deal.address}</p>
                    </div>
                  </div>

                  {/* Table */}
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
                          const price = Number(deal.value?.[index]) || 0;
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

                  {/* Summary */}
                  <div className="flex justify-end mt-4">
                    <table className="text-sm w-64">
                      <tbody>
                        <tr>
                          <td className="font-medium">Subtotal</td>
                          <td className="text-right">₹{subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Taxable</td>
                          <td className="text-right">₹{subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Tax rate</td>
                          <td className="text-right">{(taxRate * 100).toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Tax due</td>
                          <td className="text-right">₹{tax.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="font-medium">Other</td>
                          <td className="text-right">-</td>
                        </tr>
                        <tr className="font-bold border-t border-gray-700">
                          <td>TOTAL</td>
                          <td className="text-right">₹{total.toFixed(2)}</td>
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
                        className="w-full h-auto object-contain max-h-[120px] mx-auto"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-sm mt-8 font-medium">
                      <p>If you have any questions about this price quote, please contact</p>
                      <p>[Name, Phone #, E-mail]</p>
                      <p className="italic font-semibold mt-2">
                        Thank You For Your Business!
                      </p>
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

                {/* PDF DOWNLOAD BUTTONS */}
                <Button
                  className="w-full bg-transparent hover:bg-blue-500/10 text-blue-700 border border-blue-700 hover:border-transparent dark:border-blue-200 dark:text-blue-100"
                  onClick={handleDownloadPDF}
                  disabled={generatingPDF}
                >
                  {generatingPDF
                    ? "Generating PDF..."
                    : "Download Quote as PDF (Image)"}
                </Button>

                <Button
                  className="w-full bg-transparent hover:bg-purple-500/10 text-purple-700 border border-purple-700 hover:border-transparent dark:border-purple-200 dark:text-purple-100"
                  onClick={handleDownloadPDFAlternative}
                  disabled={generatingPDF}
                >
                  {generatingPDF
                    ? "Generating PDF..."
                    : "Download Quote as PDF (Text)"}
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

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import {
  saveTemplate,
  updateTemplate,
  getTemplates,
  deleteTemplate,
  prepareTemplateForEditing,
} from "@/lib/templates";

import { redirect } from "next/navigation";

export default function TemplateCreator() {
  const [openPreview, setOpenPreview] = useState(false);
  const [openPastTemplates, setOpenPastTemplates] = useState(false);
  const [pastTemplates, setPastTemplates] = useState([]);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState("Untitled Template");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const [data, setData] = useState({
    headerTitle: "Your Company Name",
    headerSubtitle: "Your Company Tagline",
    headerAddress: "123 Business Street, City, Country",
    headerPhone: "+1 (000) 000-0000",
    headerEmail: "info@company.com",
    headerImage: "",
    footerImage: "",
    title: "My Company Name",
    address: "Street Address",
    city: "City, ST ZIP",
    phone: "(000) 000-0000",
    email: "company@email.com",
    quoteNumber: "70",
    quoteDate: "6/11/2025",
    validUntil: "2/15/2025",
    customerName: "Customer Name",
    customerAddress: "Customer Address",
    customerEmail: "customer@email.com",
    description: "Write your description of work here...",
    products: ["Product A", "Product B"],
    quantity: [1, 2],
    value: [100, 150],
    footerNote: "Thank you for choosing our services.",
    footerDisclaimer: "This quotation is valid for 30 days.",
  });

  useEffect(() => {
    const getSession = () => {
      const sessionJSON = JSON.parse(localStorage.getItem("session"));
      setSession(sessionJSON);
      setUserEmail(sessionJSON.user.email);
    };
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      redirect("/");
    }

    getSession();
  }, []);

  // Load templates from Supabase on mount
  useEffect(() => {
    if (userEmail) {
      loadTemplates();
    }
  }, [userEmail]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const templates = await getTemplates();
      setPastTemplates(templates || []);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const update = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = (e, key) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      update(key, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const getImageFormat = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== "string") return "PNG";
    const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch) return "PNG";
    const mime = mimeMatch[1].toLowerCase();
    if (mime === "image/jpeg" || mime === "image/jpg") return "JPEG";
    if (mime === "image/png") return "PNG";
    if (mime === "image/webp") return "WEBP";
    return "PNG";
  };

  const calculateTotal = () => {
    return (data.products || []).reduce((sum, _, i) => {
      const qty = Number((data.quantity && data.quantity[i]) || 0);
      const val = Number((data.value && data.value[i]) || 0);
      return sum + qty * val;
    }, 0);
  };

  // Product list handlers
  const handleProductChange = (index, field, value) => {
    setData((prev) => {
      const products = Array.isArray(prev.products) ? [...prev.products] : [];
      const quantity = Array.isArray(prev.quantity) ? [...prev.quantity] : [];
      const valueArr = Array.isArray(prev.value) ? [...prev.value] : [];

      if (field === "name") products[index] = value;
      if (field === "quantity")
        quantity[index] = isNaN(Number(value)) ? value : Number(value);
      if (field === "value")
        valueArr[index] = isNaN(Number(value)) ? value : Number(value);

      return { ...prev, products, quantity, value: valueArr };
    });
  };

  const addProductRow = () => {
    setData((prev) => ({
      ...prev,
      products: [...(prev.products || []), "New Product"],
      quantity: [...(prev.quantity || []), 1],
      value: [...(prev.value || []), 0],
    }));
  };

  const removeProductRow = (index) => {
    setData((prev) => {
      const products = [...(prev.products || [])];
      const quantity = [...(prev.quantity || [])];
      const valueArr = [...(prev.value || [])];
      products.splice(index, 1);
      quantity.splice(index, 1);
      valueArr.splice(index, 1);
      return { ...prev, products, quantity, value: valueArr };
    });
  };

  // Save or Update Template to Supabase
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      let result;
      if (currentTemplateId) {
        result = await updateTemplate(currentTemplateId, data, templateName);
        alert("Template updated successfully!");
      } else {
        result = await saveTemplate(data, templateName);
        if (result) {
          setCurrentTemplateId(result.id);
          alert("Template saved successfully!");
        }
      }

      if (result) {
        await loadTemplates();
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Load template from past templates
  const handleLoadTemplate = async (template) => {
    const preparedData = prepareTemplateForEditing(template);
    setData(preparedData);
    setCurrentTemplateId(template.id);
    setTemplateName(template.name);
    setOpenPastTemplates(false);
  };

  // Create new template
  const handleNewTemplate = () => {
    setData({
      headerTitle: "Your Company Name",
      headerSubtitle: "Your Company Tagline",
      headerAddress: "123 Business Street, City, Country",
      headerPhone: "+1 (000) 000-0000",
      headerEmail: "info@company.com",
      headerImage: "",
      footerImage: "",
      title: "My Company Name",
      address: "Street Address",
      city: "City, ST ZIP",
      phone: "(000) 000-0000",
      email: "company@email.com",
      quoteNumber: "70",
      quoteDate: new Date().toLocaleDateString(),
      validUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      customerName: "Customer Name",
      customerAddress: "Customer Address",
      customerEmail: "customer@email.com",
      description: "Write your description of work here...",
      products: ["Product A", "Product B"],
      quantity: [1, 2],
      value: [100, 150],
      footerNote: "Thank you for choosing our services.",
      footerDisclaimer: "This quotation is valid for 30 days.",
    });
    setCurrentTemplateId(null);
    setTemplateName("Untitled Template");
  };

  // Delete template
  const handleDeleteTemplate = async (templateId, e) => {
    e?.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;

    const success = await deleteTemplate(templateId);
    if (success) {
      alert("Template deleted successfully!");
      await loadTemplates();
      if (currentTemplateId === templateId) {
        handleNewTemplate();
      }
    } else {
      alert("Failed to delete template.");
    }
  };

  const generatePdfInstance = () => {
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 10;

    // HEADER
    if (data.headerImage) {
      try {
        const format = getImageFormat(data.headerImage);
        const info = doc.getImageProperties(data.headerImage);
        let headerHeight = (info.height * pageWidth) / info.width;
        const maxHeader = pageHeight * 0.2;
        if (headerHeight > maxHeader) headerHeight = maxHeader;
        doc.addImage(data.headerImage, format, 0, 0, pageWidth, headerHeight);
        y = headerHeight + 10;
      } catch (err) {
        console.warn("Failed to add header image:", err);
      }
    } else {
      y = 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(String(data.headerTitle || ""), 10, y + 5);
      doc.setFontSize(14);
      doc.text(String(data.headerSubtitle || ""), 10, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(String(data.headerAddress || ""), 10, y + 25);
      doc.text(`Phone: ${String(data.headerPhone || "")}`, 10, y + 30);
      doc.text(`Email: ${String(data.headerEmail || "")}`, 10, y + 35);
      y = 55;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("QUOTATION", 10, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(String(data.title || ""), 10, y);
    y += 6;
    doc.text(String(data.address || ""), 10, y);
    y += 6;
    doc.text(String(data.city || ""), 10, y);
    y += 6;
    doc.text(`Phone: ${String(data.phone || "")}`, 10, y);
    y += 6;
    doc.text(`Email: ${String(data.email || "")}`, 10, y);
    y += 10;

    const quoteDetailsX = pageWidth - 70;
    let quoteY = y - 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(quoteDetailsX - 5, quoteY - 5, 65, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("QUOTE #", quoteDetailsX, quoteY);
    doc.text("DATE", quoteDetailsX, quoteY + 6);
    doc.text("VALID UNTIL", quoteDetailsX, quoteY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(String(data.quoteNumber || "70"), quoteDetailsX + 25, quoteY);
    doc.text(String(data.quoteDate || ""), quoteDetailsX + 25, quoteY + 6);
    doc.text(String(data.validUntil || ""), quoteDetailsX + 25, quoteY + 12);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER INFO", 10, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${String(data.customerName || "")}`, 10, y);
    y += 6;
    doc.text(`Address: ${String(data.customerAddress || "")}`, 10, y);
    y += 6;
    doc.text(`Email: ${String(data.customerEmail || "")}`, 10, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION OF WORK:", 10, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const descriptionLines = doc.splitTextToSize(
      String(data.description || ""),
      pageWidth - 20
    );
    doc.text(descriptionLines, 10, y);
    y += descriptionLines.length * 6 + 6;

    doc.setFont("helvetica", "bold");
    doc.text("ITEMIZED COSTS:", 10, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    (data.products || []).forEach((item, i) => {
      const qty = Number((data.quantity && data.quantity[i]) || 0);
      const val = Number((data.value && data.value[i]) || 0);
      const line = `${String(item)} | Qty: ${qty} | Price: $${val} | Total: $${(
        qty * val
      ).toFixed(2)}`;
      const wrapped = doc.splitTextToSize(line, pageWidth - 20);
      doc.text(wrapped, 10, y);
      y += wrapped.length * 6;
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 10;
      }
    });

    const total = calculateTotal();
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${total.toFixed(2)}`, 10, y);
    y += 16;

    if (data.footerImage) {
      try {
        const format = getImageFormat(data.footerImage);
        const info = doc.getImageProperties(data.footerImage);
        let footerHeight = (info.height * pageWidth) / info.width;
        const maxFooter = pageHeight * 0.2;
        if (footerHeight > maxFooter) footerHeight = maxFooter;
        const finalPage = doc.getNumberOfPages();
        doc.setPage(finalPage);
        doc.addImage(
          data.footerImage,
          format,
          0,
          pageHeight - footerHeight,
          pageWidth,
          footerHeight
        );
      } catch (err) {
        console.warn("Failed to add footer image:", err);
      }
    } else {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 10;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(String(data.footerNote || ""), 10, y + 2);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const disclaimerLines = doc.splitTextToSize(
        String(data.footerDisclaimer || ""),
        pageWidth - 20
      );
      doc.text(disclaimerLines, 10, y + 4);
    }

    return doc;
  };

  const handlePDFDownload = () => {
    try {
      const doc = generatePdfInstance();
      doc.save(`${templateName || "template"}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF.");
    }
  };

  const handlePreview = () => {
    try {
      const doc = generatePdfInstance();
      const url = doc.output("bloburl");
      window.open(url, "_blank");
    } catch (err) {
      console.error("Preview error:", err);
      alert("Failed to open preview.");
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="bg-blue-50 border-blue-600 text-blue-700 hover:bg-blue-100"
        >
          Create Template
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-screen h-screen max-w-none overflow-y-auto p-10 bg-white"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold">
            Customize your Template
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between mt-4 mb-6 gap-4">
          <div className="flex gap-2">
            <Dialog
              open={openPastTemplates}
              onOpenChange={setOpenPastTemplates}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-200 text-black px-6">
                  Past Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Past Templates</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {isLoading && (
                    <p className="text-sm text-gray-500">
                      Loading templates...
                    </p>
                  )}
                  {!isLoading && pastTemplates.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No templates saved yet.
                    </p>
                  )}
                  {pastTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="border p-3 rounded cursor-pointer hover:bg-gray-100"
                      onClick={() => handleLoadTemplate(t)}
                    >
                      <div className="flex gap-3">
                        {/* DEBUG - shows what Supabase returned */}
                        {/* DEBUG - show DB columns plus embedded template_data.headerImage presence */}
                        {/* <pre className="text-[10px] break-all bg-gray-50 p-2 rounded mb-2">
                          {JSON.stringify(
                            {
                              id: t.id,
                              header_image_url: t.header_image_url,
                              header_image_path: t.header_image_path,
                              footer_image_url: t.footer_image_url,
                              footer_image_path: t.footer_image_path,
                              // safe check for embedded base64 saved inside template_data
                              template_data_has_headerImage: Boolean(
                                t.template_data && t.template_data.headerImage
                              ),
                              template_data_headerImage_sample:
                                t.template_data && t.template_data.headerImage
                                  ? String(t.template_data.headerImage).slice(
                                      0,
                                      80
                                    ) + "..."
                                  : null,
                            },
                            null,
                            2
                          )}
                        </pre> */}

                        {t.header_image_url ? (
                          <img
                            src={t.header_image_url}
                            alt="Header"
                            className="w-32 h-20 object-cover rounded border"
                            onError={(e) => {
                              console.error(
                                "IMAGE FAILED:",
                                t.header_image_url
                              );
                              e.currentTarget.style.opacity = 0.4;
                            }}
                          />
                        ) : (
                          <div className="w-32 h-20 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                            No header image URL
                          </div>
                        )}

                        {t.header_image_url && (
                          <img
                            src={t.header_image_url}
                            alt="Header"
                            className="w-32 h-20 object-cover rounded border"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{t.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(t.created_at).toLocaleString()}
                          </p>
                          {t.footer_image_url && (
                            <img
                              src={t.footer_image_url}
                              alt="Footer"
                              className="w-full h-16 object-cover rounded border mt-2"
                            />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={(e) => handleDeleteTemplate(t.id, e)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              className="bg-green-200 text-black px-6"
              onClick={handleNewTemplate}
            >
              New Template
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        <div className="mt-8 space-y-10 text-sm max-w-5xl mx-auto">
          <section className="border rounded-md bg-blue-50 p-4 shadow-sm">
            <h3 className="font-bold text-lg mb-2">HEADER (Brand Area)</h3>
            {!data.headerImage && (
              <>
                <Input
                  placeholder="Header Title"
                  value={data.headerTitle}
                  onChange={(e) => update("headerTitle", e.target.value)}
                />
                <Input
                  placeholder="Header Subtitle"
                  value={data.headerSubtitle}
                  onChange={(e) => update("headerSubtitle", e.target.value)}
                  className="mt-2"
                />
                <Input
                  placeholder="Header Address"
                  value={data.headerAddress}
                  onChange={(e) => update("headerAddress", e.target.value)}
                  className="mt-2"
                />
                <Input
                  placeholder="Header Phone"
                  value={data.headerPhone}
                  onChange={(e) => update("headerPhone", e.target.value)}
                  className="mt-2"
                />
                <Input
                  placeholder="Header Email"
                  value={data.headerEmail}
                  onChange={(e) => update("headerEmail", e.target.value)}
                  className="mt-2"
                />
              </>
            )}
            <div className="mt-3">
              <label className="font-semibold block mb-2">
                Header Image (banner)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "headerImage")}
                className="mb-2"
              />
              {data.headerImage && (
                <div className="flex gap-2 items-start">
                  <img
                    src={data.headerImage}
                    alt="Header Preview"
                    className="mt-2 h-20 w-full object-contain border"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => update("headerImage", "")}
                    className="text-sm ml-2"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section className="border p-4 rounded-md">
            <h3 className="font-semibold">COMPANY INFO</h3>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Company Name"
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
              />
              <Input
                placeholder="Address"
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
              />
              <Input
                placeholder="City, ST ZIP"
                value={data.city}
                onChange={(e) => update("city", e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <Input
                placeholder="Email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </section>

          <section className="border p-4 rounded-md bg-green-50">
            <h3 className="font-semibold">QUOTE DETAILS</h3>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Quote Number"
                value={data.quoteNumber}
                onChange={(e) => update("quoteNumber", e.target.value)}
              />
              <Input
                placeholder="Quote Date"
                value={data.quoteDate}
                onChange={(e) => update("quoteDate", e.target.value)}
              />
              <Input
                placeholder="Valid Until"
                value={data.validUntil}
                onChange={(e) => update("validUntil", e.target.value)}
              />
            </div>
          </section>

          <section className="border p-4 rounded-md">
            <h3 className="font-semibold">CUSTOMER INFO</h3>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Customer Name"
                value={data.customerName}
                onChange={(e) => update("customerName", e.target.value)}
              />
              <Input
                placeholder="Customer Address"
                value={data.customerAddress}
                onChange={(e) => update("customerAddress", e.target.value)}
              />
              <Input
                placeholder="Customer Email"
                value={data.customerEmail}
                onChange={(e) => update("customerEmail", e.target.value)}
              />
            </div>
          </section>

          <section className="border p-4 rounded-md">
            <h3 className="font-semibold">DESCRIPTION OF WORK</h3>
            <Textarea
              placeholder="Description of work..."
              value={data.description}
              onChange={(e) => update("description", e.target.value)}
              className="h-24 mt-3"
            />
          </section>

          <section className="border p-4 rounded-md">
            <h3 className="font-semibold">ITEMIZED PRODUCTS / SERVICES</h3>
            <div className="mt-3 space-y-2">
              {(data.products || []).map((prod, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center border-b py-2"
                >
                  <input
                    className="col-span-5 p-2 border rounded"
                    value={prod}
                    onChange={(e) =>
                      handleProductChange(i, "name", e.target.value)
                    }
                  />
                  <input
                    className="col-span-2 p-2 border rounded"
                    value={data.quantity?.[i] ?? ""}
                    onChange={(e) =>
                      handleProductChange(i, "quantity", e.target.value)
                    }
                    type="number"
                    min="0"
                  />
                  <input
                    className="col-span-3 p-2 border rounded"
                    value={data.value?.[i] ?? ""}
                    onChange={(e) =>
                      handleProductChange(i, "value", e.target.value)
                    }
                    type="number"
                    min="0"
                  />
                  <div className="col-span-2 flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductRow(i)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <div className="mt-3">
                <Button onClick={addProductRow} className="bg-indigo-100">
                  Add Item
                </Button>
              </div>

              <div className="mt-4 text-right">
                <p className="font-semibold">
                  Subtotal: ${calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>
          </section>

          <section className="border p-4 rounded-md bg-yellow-50">
            <h3 className="font-semibold">FOOTER</h3>
            <div className="mt-3 space-y-2">
              <label className="font-semibold block mb-2">
                Footer Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "footerImage")}
              />
              {data.footerImage && (
                <div className="flex gap-2 items-start mt-2">
                  <img
                    src={data.footerImage}
                    alt="Footer Preview"
                    className="h-20 w-full object-contain border"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => update("footerImage", "")}
                    className="text-sm ml-2"
                  >
                    Remove
                  </Button>
                </div>
              )}

              <Input
                placeholder="Footer Note"
                value={data.footerNote}
                onChange={(e) => update("footerNote", e.target.value)}
              />
              <Textarea
                placeholder="Footer Disclaimer"
                value={data.footerDisclaimer}
                onChange={(e) => update("footerDisclaimer", e.target.value)}
                className="h-20 mt-2"
              />
            </div>
          </section>
        </div>

        <SheetFooter className="mt-8">
          <div className="flex justify-between w-full items-center">
            <div className="text-sm text-gray-600">
              Tip: Save templates to reuse later. You can update or delete saved
              templates from the "Past Templates" list.
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePreview} className="bg-gray-200 px-4">
                Preview
              </Button>
              <Button onClick={handlePDFDownload} className="bg-gray-300 px-4">
                Download PDF
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="bg-blue-600 text-white px-6"
              >
                {isSaving ? "Saving..." : currentTemplateId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

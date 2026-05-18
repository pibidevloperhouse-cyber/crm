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
        Date.now() + 30 * 24 * 60 * 60 * 1000,
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

    // FOOTER
    if (data.footerImage) {
      try {
        const format = getImageFormat(data.footerImage);
        const info = doc.getImageProperties(data.footerImage);
        let footerHeight = (info.height * pageWidth) / info.width;
        const maxFooter = pageHeight * 0.2;
        if (footerHeight > maxFooter) footerHeight = maxFooter;
        doc.addImage(
          data.footerImage,
          format,
          0,
          pageHeight - footerHeight,
          pageWidth,
          footerHeight,
        );
      } catch (err) {
        console.warn("Failed to add footer image:", err);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(String(data.footerNote || ""), 10, pageHeight - 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const disclaimerLines = doc.splitTextToSize(
        String(data.footerDisclaimer || ""),
        pageWidth - 20,
      );
      doc.text(disclaimerLines, 10, pageHeight - 14);
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
      {/* <SheetTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Create Template
        </DropdownMenuItem>
      </SheetTrigger> */}
      <SheetTrigger asChild>
        <Button className="bg-gradient-to-r from-sky-700 to-teal-500 text-white px-6">
          Create Template
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full h-full sm:w-screen sm:h-screen max-w-none overflow-y-auto p-4 sm:p-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
      >
        <SheetHeader>
          <SheetTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Customize your Template
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 sm:mt-4 mb-0 gap-4">
          <div className="flex gap-2">
            <Dialog
              open={openPastTemplates}
              onOpenChange={setOpenPastTemplates}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-200 text-black dark:bg-slate-800 dark:text-slate-100 dark:border-slate-800 px-6">
                  Past Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl">
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
                      className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleLoadTemplate(t)}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {t.header_image_url ? (
                          <div className="relative w-full sm:w-40 h-24 sm:h-24 shrink-0 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
                            <img
                              src={t.header_image_url}
                              alt="Header"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error("IMAGE FAILED:", t.header_image_url);
                                e.currentTarget.style.opacity = 0.4;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-40 h-24 sm:h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 rounded-lg shrink-0">
                            No header image
                          </div>
                        )}

                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {t.name}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 sm:mt-0">
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                              Template
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs px-2"
                              onClick={(e) => handleDeleteTemplate(t.id, e)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              className="bg-green-200 text-black px-6 dark:bg-slate-800 dark:text-slate-100"
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
              className="w-full sm:w-64 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="mt-8 space-y-5 text-sm max-w-5xl">
          <section className="border border-blue-100 dark:border-blue-900/30 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
              HEADER (Brand Area)
            </h3>
            {!data.headerImage && (
              <>
                <Input
                  placeholder="Header Title"
                  value={data.headerTitle}
                  onChange={(e) => update("headerTitle", e.target.value)}
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
                <Input
                  placeholder="Header Subtitle"
                  value={data.headerSubtitle}
                  onChange={(e) => update("headerSubtitle", e.target.value)}
                  className="mt-3 dark:bg-slate-900 dark:border-slate-700"
                />
                <Input
                  placeholder="Header Address"
                  value={data.headerAddress}
                  onChange={(e) => update("headerAddress", e.target.value)}
                  className="mt-3 dark:bg-slate-900 dark:border-slate-700"
                />
                <Input
                  placeholder="Header Phone"
                  value={data.headerPhone}
                  onChange={(e) => update("headerPhone", e.target.value)}
                  className="mt-3 dark:bg-slate-900 dark:border-slate-700"
                />
                <Input
                  placeholder="Header Email"
                  value={data.headerEmail}
                  onChange={(e) => update("headerEmail", e.target.value)}
                  className="mt-3 dark:bg-slate-900 dark:border-slate-700"
                />
              </>
            )}
            <div className="mt-3">
              <label className="font-semibold block mb-2">
                Header Image (banner)
              </label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium dark:bg-slate-800 dark:text-slate-100 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "headerImage")}
                  className="hidden"
                />
              </label>
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

          {/* <section className="border p-4 rounded-md">
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
          </section> */}

          {/* <section className="border p-4 rounded-md">
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
          </section> */}

          <section className="border border-yellow-100 dark:border-yellow-900/30 p-6 rounded-2xl bg-yellow-50/50 dark:bg-yellow-900/10">
            <h3 className="font-bold text-lg mb-4 text-yellow-900 dark:text-yellow-300 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-yellow-500 rounded-full" />
              FOOTER
            </h3>
            <div className="mt-3 space-y-2">
              <label className="font-semibold block mb-2">
                Footer Image (optional)
              </label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:bg-slate-800 dark:text-slate-100 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "footerImage")}
                  className="hidden"
                />
              </label>
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
                className="dark:bg-slate-900 dark:border-slate-700"
              />
              <Textarea
                placeholder="Footer Disclaimer"
                value={data.footerDisclaimer}
                onChange={(e) => update("footerDisclaimer", e.target.value)}
                className="h-20 mt-3 dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </section>
        </div>

        <SheetFooter className="mt-8 pb-10 sm:pb-0">
          <div className="flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-6">
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Tip: Save templates to reuse later. You can update or delete saved
              templates from the "Past Templates" list.
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={handlePreview} className="flex-1 sm:flex-none bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-4">
                Preview
              </Button>
              <Button onClick={handlePDFDownload} className="flex-1 sm:flex-none bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-4">
                Download PDF
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8"
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


























// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
//   SheetFooter,
//   SheetTrigger,
// } from "@/components/ui/sheet";
// import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import jsPDF from "jspdf";
// import {
//   saveTemplate,
//   updateTemplate,
//   getTemplates,
//   deleteTemplate,
//   prepareTemplateForEditing,
// } from "@/lib/templates";

// import { redirect } from "next/navigation";

// export default function TemplateCreator() {
//   const [openPreview, setOpenPreview] = useState(false);
//   const [openPastTemplates, setOpenPastTemplates] = useState(false);
//   const [pastTemplates, setPastTemplates] = useState([]);
//   const [currentTemplateId, setCurrentTemplateId] = useState(null);
//   const [templateName, setTemplateName] = useState("Untitled Template");
//   const [isSaving, setIsSaving] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [session, setSession] = useState(null);
//   const [userEmail, setUserEmail] = useState(null);

//   const [data, setData] = useState({
//     headerTitle: "Your Company Name",
//     headerSubtitle: "Your Company Tagline",
//     headerAddress: "123 Business Street, City, Country",
//     headerPhone: "+1 (000) 000-0000",
//     headerEmail: "info@company.com",
//     headerImage: "",
//     footerImage: "",
//     title: "My Company Name",
//     address: "Street Address",
//     city: "City, ST ZIP",
//     phone: "(000) 000-0000",
//     email: "company@email.com",
//     quoteNumber: "70",
//     quoteDate: "6/11/2025",
//     validUntil: "2/15/2025",
//     customerName: "Customer Name",
//     customerAddress: "Customer Address",
//     customerEmail: "customer@email.com",
//     description: "Write your description of work here...",
//     products: ["Product A", "Product B"],
//     quantity: [1, 2],
//     value: [100, 150],
//     footerNote: "Thank you for choosing our services.",
//     footerDisclaimer: "This quotation is valid for 30 days.",
//   });

//   useEffect(() => {
//     const getSession = () => {
//       const sessionJSON = JSON.parse(localStorage.getItem("session"));
//       setSession(sessionJSON);
//       setUserEmail(sessionJSON.user.email);
//     };
//     const user = JSON.parse(localStorage.getItem("user"));

//     if (!user) {
//       redirect("/");
//     }

//     getSession();
//   }, []);

//   // Load templates from Supabase on mount
//   useEffect(() => {
//     if (userEmail) {
//       loadTemplates();
//     }
//   }, [userEmail]);

//   const loadTemplates = async () => {
//     setIsLoading(true);
//     try {
//       const templates = await getTemplates();
//       setPastTemplates(templates || []);
//     } catch (err) {
//       console.error("Error loading templates:", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const update = (key, value) => {
//     setData((prev) => ({ ...prev, [key]: value }));
//   };

//   const handleImageUpload = (e, key) => {
//     const file = e.target.files && e.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       update(key, reader.result);
//     };
//     reader.readAsDataURL(file);
//   };

//   const getImageFormat = (dataUrl) => {
//     if (!dataUrl || typeof dataUrl !== "string") return "PNG";
//     const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/);
//     if (!mimeMatch) return "PNG";
//     const mime = mimeMatch[1].toLowerCase();
//     if (mime === "image/jpeg" || mime === "image/jpg") return "JPEG";
//     if (mime === "image/png") return "PNG";
//     if (mime === "image/webp") return "WEBP";
//     return "PNG";
//   };

//   const calculateTotal = () => {
//     return (data.products || []).reduce((sum, _, i) => {
//       const qty = Number((data.quantity && data.quantity[i]) || 0);
//       const val = Number((data.value && data.value[i]) || 0);
//       return sum + qty * val;
//     }, 0);
//   };

//   // Product list handlers
//   const handleProductChange = (index, field, value) => {
//     setData((prev) => {
//       const products = Array.isArray(prev.products) ? [...prev.products] : [];
//       const quantity = Array.isArray(prev.quantity) ? [...prev.quantity] : [];
//       const valueArr = Array.isArray(prev.value) ? [...prev.value] : [];

//       if (field === "name") products[index] = value;
//       if (field === "quantity")
//         quantity[index] = isNaN(Number(value)) ? value : Number(value);
//       if (field === "value")
//         valueArr[index] = isNaN(Number(value)) ? value : Number(value);

//       return { ...prev, products, quantity, value: valueArr };
//     });
//   };

//   const addProductRow = () => {
//     setData((prev) => ({
//       ...prev,
//       products: [...(prev.products || []), "New Product"],
//       quantity: [...(prev.quantity || []), 1],
//       value: [...(prev.value || []), 0],
//     }));
//   };

//   const removeProductRow = (index) => {
//     setData((prev) => {
//       const products = [...(prev.products || [])];
//       const quantity = [...(prev.quantity || [])];
//       const valueArr = [...(prev.value || [])];
//       products.splice(index, 1);
//       quantity.splice(index, 1);
//       valueArr.splice(index, 1);
//       return { ...prev, products, quantity, value: valueArr };
//     });
//   };

//   // Save or Update Template to Supabase
//   const handleSaveTemplate = async () => {
//     setIsSaving(true);
//     try {
//       let result;
//       if (currentTemplateId) {
//         result = await updateTemplate(currentTemplateId, data, templateName);
//         alert("Template updated successfully!");
//       } else {
//         result = await saveTemplate(data, templateName);
//         if (result) {
//           setCurrentTemplateId(result.id);
//           alert("Template saved successfully!");
//         }
//       }

//       if (result) {
//         await loadTemplates();
//       }
//     } catch (error) {
//       console.error("Error saving template:", error);
//       alert("Failed to save template. Please try again.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // Load template from past templates
//   const handleLoadTemplate = async (template) => {
//     const preparedData = prepareTemplateForEditing(template);
//     setData(preparedData);
//     setCurrentTemplateId(template.id);
//     setTemplateName(template.name);
//     setOpenPastTemplates(false);
//   };

//   // Create new template
//   const handleNewTemplate = () => {
//     setData({
//       headerTitle: "Your Company Name",
//       headerSubtitle: "Your Company Tagline",
//       headerAddress: "123 Business Street, City, Country",
//       headerPhone: "+1 (000) 000-0000",
//       headerEmail: "info@company.com",
//       headerImage: "",
//       footerImage: "",
//       title: "My Company Name",
//       address: "Street Address",
//       city: "City, ST ZIP",
//       phone: "(000) 000-0000",
//       email: "company@email.com",
//       quoteNumber: "70",
//       quoteDate: new Date().toLocaleDateString(),
//       validUntil: new Date(
//         Date.now() + 30 * 24 * 60 * 60 * 1000,
//       ).toLocaleDateString(),
//       customerName: "Customer Name",
//       customerAddress: "Customer Address",
//       customerEmail: "customer@email.com",
//       description: "Write your description of work here...",
//       products: ["Product A", "Product B"],
//       quantity: [1, 2],
//       value: [100, 150],
//       footerNote: "Thank you for choosing our services.",
//       footerDisclaimer: "This quotation is valid for 30 days.",
//     });
//     setCurrentTemplateId(null);
//     setTemplateName("Untitled Template");
//   };

//   // Delete template
//   const handleDeleteTemplate = async (templateId, e) => {
//     e?.stopPropagation();
//     if (!confirm("Are you sure you want to delete this template?")) return;

//     const success = await deleteTemplate(templateId);
//     if (success) {
//       alert("Template deleted successfully!");
//       await loadTemplates();
//       if (currentTemplateId === templateId) {
//         handleNewTemplate();
//       }
//     } else {
//       alert("Failed to delete template.");
//     }
//   };

//   const generatePdfInstance = () => {
//     const doc = new jsPDF({
//       unit: "mm",
//       format: "a4",
//       orientation: "portrait",
//     });

//     const pageWidth = doc.internal.pageSize.getWidth();
//     const pageHeight = doc.internal.pageSize.getHeight();
//     let y = 10;

//     // HEADER
//     if (data.headerImage) {
//       try {
//         const format = getImageFormat(data.headerImage);
//         const info = doc.getImageProperties(data.headerImage);
//         let headerHeight = (info.height * pageWidth) / info.width;
//         const maxHeader = pageHeight * 0.2;
//         if (headerHeight > maxHeader) headerHeight = maxHeader;
//         doc.addImage(data.headerImage, format, 0, 0, pageWidth, headerHeight);
//         y = headerHeight + 10;
//       } catch (err) {
//         console.warn("Failed to add header image:", err);
//       }
//     } else {
//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(20);
//       doc.text(String(data.headerTitle || ""), 10, y + 5);
//       doc.setFontSize(14);
//       doc.text(String(data.headerSubtitle || ""), 10, y + 15);
//       doc.setFont("helvetica", "normal");
//       doc.setFontSize(10);
//       doc.text(String(data.headerAddress || ""), 10, y + 25);
//       doc.text(`Phone: ${String(data.headerPhone || "")}`, 10, y + 30);
//       doc.text(`Email: ${String(data.headerEmail || "")}`, 10, y + 35);
//       y = 55;
//     }

//     // FOOTER
//     if (data.footerImage) {
//       try {
//         const format = getImageFormat(data.footerImage);
//         const info = doc.getImageProperties(data.footerImage);
//         let footerHeight = (info.height * pageWidth) / info.width;
//         const maxFooter = pageHeight * 0.2;
//         if (footerHeight > maxFooter) footerHeight = maxFooter;
//         doc.addImage(
//           data.footerImage,
//           format,
//           0,
//           pageHeight - footerHeight,
//           pageWidth,
//           footerHeight,
//         );
//       } catch (err) {
//         console.warn("Failed to add footer image:", err);
//       }
//     } else {
//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(11);
//       doc.text(String(data.footerNote || ""), 10, pageHeight - 20);
//       doc.setFont("helvetica", "normal");
//       doc.setFontSize(9);
//       const disclaimerLines = doc.splitTextToSize(
//         String(data.footerDisclaimer || ""),
//         pageWidth - 20,
//       );
//       doc.text(disclaimerLines, 10, pageHeight - 14);
//     }

//     return doc;
//   };

//   const handlePDFDownload = () => {
//     try {
//       const doc = generatePdfInstance();
//       doc.save(`${templateName || "template"}.pdf`);
//     } catch (err) {
//       console.error("PDF generation error:", err);
//       alert("Failed to generate PDF.");
//     }
//   };

//   const handlePreview = () => {
//     try {
//       const doc = generatePdfInstance();
//       const url = doc.output("bloburl");
//       window.open(url, "_blank");
//     } catch (err) {
//       console.error("Preview error:", err);
//       alert("Failed to open preview.");
//     }
//   };

//   return (
//     <Sheet>
//       <SheetTrigger asChild>
//         <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
//           Create Template
//         </DropdownMenuItem>
//       </SheetTrigger>

//       <SheetContent
//         side="right"
//         className="w-full h-full sm:w-screen sm:h-screen max-w-none overflow-y-auto p-4 sm:p-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
//       >
//         <SheetHeader>
//           <SheetTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
//             Customize your Template
//           </SheetTitle>
//         </SheetHeader>

//         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 sm:mt-4 mb-0 gap-4">
//           <div className="flex gap-2">
//             <Dialog
//               open={openPastTemplates}
//               onOpenChange={setOpenPastTemplates}
//             >
//               <DialogTrigger asChild>
//                 <Button className="bg-blue-200 text-black dark:bg-slate-800 dark:text-slate-100 dark:border-slate-800 px-6">
//                   Past Templates
//                 </Button>
//               </DialogTrigger>
//               <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl">
//                 <DialogHeader>
//                   <DialogTitle>Past Templates</DialogTitle>
//                 </DialogHeader>
//                 <div className="space-y-4 mt-4">
//                   {isLoading && (
//                     <p className="text-sm text-gray-500">
//                       Loading templates...
//                     </p>
//                   )}
//                   {!isLoading && pastTemplates.length === 0 && (
//                     <p className="text-sm text-gray-500">
//                       No templates saved yet.
//                     </p>
//                   )}
//                   {pastTemplates.map((t) => (
//                     <div
//                       key={t.id}
//                       className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
//                       onClick={() => handleLoadTemplate(t)}
//                     >
//                       <div className="flex flex-col sm:flex-row gap-4">
//                         {t.header_image_url ? (
//                           <div className="relative w-full sm:w-40 h-24 sm:h-24 shrink-0 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
//                             <img
//                               src={t.header_image_url}
//                               alt="Header"
//                               className="w-full h-full object-cover"
//                               onError={(e) => {
//                                 console.error("IMAGE FAILED:", t.header_image_url);
//                                 e.currentTarget.style.opacity = 0.4;
//                               }}
//                             />
//                           </div>
//                         ) : (
//                           <div className="w-full sm:w-40 h-24 sm:h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 rounded-lg shrink-0">
//                             No header image
//                           </div>
//                         )}

//                         <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
//                           <div>
//                             <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
//                               {t.name}
//                             </p>
//                             <p className="text-[10px] text-slate-500 mt-1">
//                               {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                             </p>
//                           </div>
                          
//                           <div className="flex items-center justify-between mt-3 sm:mt-0">
//                             <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
//                               Template
//                             </span>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs px-2"
//                               onClick={(e) => handleDeleteTemplate(t.id, e)}
//                             >
//                               Delete
//                             </Button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </DialogContent>
//             </Dialog>

//             <Button
//               className="bg-green-200 text-black px-6 dark:bg-slate-800 dark:text-slate-100"
//               onClick={handleNewTemplate}
//             >
//               New Template
//             </Button>
//           </div>

//           <div className="flex gap-2 items-center">
//             <Input
//               placeholder="Template Name"
//               value={templateName}
//               onChange={(e) => setTemplateName(e.target.value)}
//               className="w-full sm:w-64 dark:bg-slate-900 dark:border-slate-700"
//             />
//           </div>
//         </div>

//         <div className="mt-8 space-y-5 text-sm max-w-5xl">
//           <section className="border border-blue-100 dark:border-blue-900/30 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 p-6 shadow-sm">
//             <h3 className="font-bold text-lg mb-4 text-blue-900 dark:text-blue-300 flex items-center gap-2">
//               <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
//               HEADER (Brand Area)
//             </h3>
//             {!data.headerImage && (
//               <>
//                 <Input
//                   placeholder="Header Title"
//                   value={data.headerTitle}
//                   onChange={(e) => update("headerTitle", e.target.value)}
//                   className="dark:bg-slate-900 dark:border-slate-700"
//                 />
//                 <Input
//                   placeholder="Header Subtitle"
//                   value={data.headerSubtitle}
//                   onChange={(e) => update("headerSubtitle", e.target.value)}
//                   className="mt-3 dark:bg-slate-900 dark:border-slate-700"
//                 />
//                 <Input
//                   placeholder="Header Address"
//                   value={data.headerAddress}
//                   onChange={(e) => update("headerAddress", e.target.value)}
//                   className="mt-3 dark:bg-slate-900 dark:border-slate-700"
//                 />
//                 <Input
//                   placeholder="Header Phone"
//                   value={data.headerPhone}
//                   onChange={(e) => update("headerPhone", e.target.value)}
//                   className="mt-3 dark:bg-slate-900 dark:border-slate-700"
//                 />
//                 <Input
//                   placeholder="Header Email"
//                   value={data.headerEmail}
//                   onChange={(e) => update("headerEmail", e.target.value)}
//                   className="mt-3 dark:bg-slate-900 dark:border-slate-700"
//                 />
//               </>
//             )}
//             <div className="mt-3">
//               <label className="font-semibold block mb-2">
//                 Header Image (banner)
//               </label>
//               <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium dark:bg-slate-800 dark:text-slate-100 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
//                 </svg>
//                 Choose Image
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => handleImageUpload(e, "headerImage")}
//                   className="hidden"
//                 />
//               </label>
//               {data.headerImage && (
//                 <div className="flex gap-2 items-start">
//                   <img
//                     src={data.headerImage}
//                     alt="Header Preview"
//                     className="mt-2 h-20 w-full object-contain border"
//                   />
//                   <Button
//                     variant="ghost"
//                     onClick={() => update("headerImage", "")}
//                     className="text-sm ml-2"
//                   >
//                     Remove
//                   </Button>
//                 </div>
//               )}
//             </div>
//           </section>

//           {/* <section className="border p-4 rounded-md">
//             <h3 className="font-semibold">COMPANY INFO</h3>
//             <div className="mt-3 space-y-2">
//               <Input
//                 placeholder="Company Name"
//                 value={data.title}
//                 onChange={(e) => update("title", e.target.value)}
//               />
//               <Input
//                 placeholder="Address"
//                 value={data.address}
//                 onChange={(e) => update("address", e.target.value)}
//               />
//               <Input
//                 placeholder="City, ST ZIP"
//                 value={data.city}
//                 onChange={(e) => update("city", e.target.value)}
//               />
//               <Input
//                 placeholder="Phone"
//                 value={data.phone}
//                 onChange={(e) => update("phone", e.target.value)}
//               />
//               <Input
//                 placeholder="Email"
//                 value={data.email}
//                 onChange={(e) => update("email", e.target.value)}
//               />
//             </div>
//           </section>

//           <section className="border p-4 rounded-md bg-green-50">
//             <h3 className="font-semibold">QUOTE DETAILS</h3>
//             <div className="mt-3 space-y-2">
//               <Input
//                 placeholder="Quote Number"
//                 value={data.quoteNumber}
//                 onChange={(e) => update("quoteNumber", e.target.value)}
//               />
//               <Input
//                 placeholder="Quote Date"
//                 value={data.quoteDate}
//                 onChange={(e) => update("quoteDate", e.target.value)}
//               />
//               <Input
//                 placeholder="Valid Until"
//                 value={data.validUntil}
//                 onChange={(e) => update("validUntil", e.target.value)}
//               />
//             </div>
//           </section>

//           <section className="border p-4 rounded-md">
//             <h3 className="font-semibold">CUSTOMER INFO</h3>
//             <div className="mt-3 space-y-2">
//               <Input
//                 placeholder="Customer Name"
//                 value={data.customerName}
//                 onChange={(e) => update("customerName", e.target.value)}
//               />
//               <Input
//                 placeholder="Customer Address"
//                 value={data.customerAddress}
//                 onChange={(e) => update("customerAddress", e.target.value)}
//               />
//               <Input
//                 placeholder="Customer Email"
//                 value={data.customerEmail}
//                 onChange={(e) => update("customerEmail", e.target.value)}
//               />
//             </div>
//           </section>

//           <section className="border p-4 rounded-md">
//             <h3 className="font-semibold">DESCRIPTION OF WORK</h3>
//             <Textarea
//               placeholder="Description of work..."
//               value={data.description}
//               onChange={(e) => update("description", e.target.value)}
//               className="h-24 mt-3"
//             />
//           </section> */}

//           {/* <section className="border p-4 rounded-md">
//             <h3 className="font-semibold">ITEMIZED PRODUCTS / SERVICES</h3>
//             <div className="mt-3 space-y-2">
//               {(data.products || []).map((prod, i) => (
//                 <div
//                   key={i}
//                   className="grid grid-cols-12 gap-2 items-center border-b py-2"
//                 >
//                   <input
//                     className="col-span-5 p-2 border rounded"
//                     value={prod}
//                     onChange={(e) =>
//                       handleProductChange(i, "name", e.target.value)
//                     }
//                   />
//                   <input
//                     className="col-span-2 p-2 border rounded"
//                     value={data.quantity?.[i] ?? ""}
//                     onChange={(e) =>
//                       handleProductChange(i, "quantity", e.target.value)
//                     }
//                     type="number"
//                     min="0"
//                   />
//                   <input
//                     className="col-span-3 p-2 border rounded"
//                     value={data.value?.[i] ?? ""}
//                     onChange={(e) =>
//                       handleProductChange(i, "value", e.target.value)
//                     }
//                     type="number"
//                     min="0"
//                   />
//                   <div className="col-span-2 flex gap-2 justify-end">
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => removeProductRow(i)}
//                     >
//                       Remove
//                     </Button>
//                   </div>
//                 </div>
//               ))}

//               <div className="mt-3">
//                 <Button onClick={addProductRow} className="bg-indigo-100">
//                   Add Item
//                 </Button>
//               </div>

//               <div className="mt-4 text-right">
//                 <p className="font-semibold">
//                   Subtotal: ${calculateTotal().toFixed(2)}
//                 </p>
//               </div>
//             </div>
//           </section> */}

//           <section className="border border-yellow-100 dark:border-yellow-900/30 p-6 rounded-2xl bg-yellow-50/50 dark:bg-yellow-900/10">
//             <h3 className="font-bold text-lg mb-4 text-yellow-900 dark:text-yellow-300 flex items-center gap-2">
//               <span className="w-1.5 h-6 bg-yellow-500 rounded-full" />
//               FOOTER
//             </h3>
//             <div className="mt-3 space-y-2">
//               <label className="font-semibold block mb-2">
//                 Footer Image (optional)
//               </label>
//               <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:bg-slate-800 dark:text-slate-100 shadow-sm">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
//                 </svg>
//                 Choose Image
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => handleImageUpload(e, "footerImage")}
//                   className="hidden"
//                 />
//               </label>
//               {data.footerImage && (
//                 <div className="flex gap-2 items-start mt-2">
//                   <img
//                     src={data.footerImage}
//                     alt="Footer Preview"
//                     className="h-20 w-full object-contain border"
//                   />
//                   <Button
//                     variant="ghost"
//                     onClick={() => update("footerImage", "")}
//                     className="text-sm ml-2"
//                   >
//                     Remove
//                   </Button>
//                 </div>
//               )}

//               <Input
//                 placeholder="Footer Note"
//                 value={data.footerNote}
//                 onChange={(e) => update("footerNote", e.target.value)}
//                 className="dark:bg-slate-900 dark:border-slate-700"
//               />
//               <Textarea
//                 placeholder="Footer Disclaimer"
//                 value={data.footerDisclaimer}
//                 onChange={(e) => update("footerDisclaimer", e.target.value)}
//                 className="h-20 mt-3 dark:bg-slate-900 dark:border-slate-700"
//               />
//             </div>
//           </section>
//         </div>

//         <SheetFooter className="mt-8 pb-10 sm:pb-0">
//           <div className="flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-6">
//             <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
//               Tip: Save templates to reuse later. You can update or delete saved
//               templates from the "Past Templates" list.
//             </div>

//             <div className="flex flex-wrap gap-2 w-full sm:w-auto">
//               <Button onClick={handlePreview} className="flex-1 sm:flex-none bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-4">
//                 Preview
//               </Button>
//               <Button onClick={handlePDFDownload} className="flex-1 sm:flex-none bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-4">
//                 Download PDF
//               </Button>
//               <Button
//                 onClick={handleSaveTemplate}
//                 disabled={isSaving}
//                 className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8"
//               >
//                 {isSaving ? "Saving..." : currentTemplateId ? "Update" : "Save"}
//               </Button>
//             </div>
//           </div>
//         </SheetFooter>
//       </SheetContent>
//     </Sheet>
//   );
// }

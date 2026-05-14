"use client";

import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "../ui/select";
import { Button } from "../ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import MultipleSelector from "../ui/multiselect";
import PhoneInput from "../PhoneInput";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabase/client";

const DealForm = ({ fetchDeals, session, products, setDealsData }) => {
  const today = new Date();
  const [dealFormData, setDealFormData] = useState({
    name: "",
    email: "",
    title: "",
    phone: "",
    company: "",
    value: 0,
    status: "",
    priority: "Low",
    closeDate: today,
    products: [],
    owner: "",
    source: "",
    description: "",
  });
  const [dealProducts, setDealProducts] = useState([]);
  const [otherValue, setOtherValue] = useState("");
  const [errors, setErrors] = useState({});
  const [dealsLoading, setDealsLoading] = useState(false);

  const ErrorMessage = ({ error }) => {
    return (
      error && (
        <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )
    );
  };

  const updateDealFormData = (field, value) => {
    setDealFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleDealsSubmit = async (e) => {
    e.preventDefault();
    setDealsLoading(true);
    const newErrors = {};
    dealFormData.products = dealProducts.map((prod) => prod.value);
    let isValid = true;
    if (!dealFormData.name) {
      newErrors.name = "Name is required";
      isValid = false;
    } else {
      newErrors.name = "";
    }
    if (!dealFormData.phone) {
      newErrors.phone = "Phone is required";
      isValid = false;
    } else {
      newErrors.phone = "";
    }
    if (!dealFormData.title) {
      newErrors.title = "Title is required";
      isValid = false;
    } else {
      newErrors.title = "";
    }
    if (!dealFormData.value) {
      newErrors.value = "Value is required";
      isValid = false;
    } else {
      newErrors.value = "";
    }
    if (!dealFormData.status) {
      newErrors.status = "Status is required";
      isValid = false;
    } else {
      newErrors.status = "";
    }
    if (!dealFormData.closeDate) {
      dealFormData.closeDate = today;
      newErrors.closeDate = "";
    }
    if (!dealFormData.created_at) {
      dealFormData.created_at = today;
    }
    if (!isValid) {
      setDealsLoading(false);
      setErrors(newErrors);
      return;
    } else {
      const req = await fetch("/api/addDeals", {
        method: "POST",
        body: JSON.stringify({
          ...dealFormData,
          session: session,
        }),
      });

      if (req.status == 404) {
        toast.error("Email Already Found", {
          autoClose: 3000,
          position: "top-right",
        });

        return;
      }

      if (req.status == 200) {
        toast.success("Deal Added", {
          autoClose: 3000,
          position: "top-right",
        });
        if (dealFormData.status == "Closed-won") {
          const customerData = {
            name: dealFormData.name,
            phone: dealFormData.phone,
            email: dealFormData.email,
            price: dealFormData.value,
            purchase_history: {
              product: dealFormData.product,
              price: dealFormData.value,
              purchase_date: today,
            },
            industry: dealFormData.industry,
            status: "Active",
            created_at: today,
            user_email: dealFormData.user_email,
          };

          const { data, error } = await supabase
            .from("Customers")
            .select("*")
            .eq("email", dealFormData.email)
            .eq("user_email", dealFormData.user_email)
            .maybeSingle();
          if (error) {
            console.error("Error checking existing customer:", error);
          }
          if (!data) {
            await fetch("/api/addCustomer", {
              method: "POST",
              body: JSON.stringify({
                ...customerData,
                session: session,
              }),
            });
          } else {
            const { error } = await supabase
              .from("customers")
              .update({
                ...customerData,
                price: data.price + deal.value,
                status: "Active",
                created_at: data.created_at,
                purchase_history: [
                  ...data.purchase_history,
                  {
                    product: dealFormData.product,
                    price: dealFormData.value,
                  },
                ],
              })
              .eq("email", dealFormData.email)
              .eq("user_email", dealFormData.user_email);
            if (error) {
              console.error("Error updating existing customer:", error);
            }
          }
          onChange();
        }
        const updatedDeal = await req.json();
        setDealsData((prevDeals) => [...prevDeals, updatedDeal]);

        setDealFormData({
          name: "",
          phone: "",
          email: "",
          linkedIn: "",
          location: "",
          title: "",
          value: "",
          status: "",
          created_at: "",
          closeDate: "",
          user_email: session.user.email,
        });
        await fetchDeals();
      } else {
        toast.error("Error in Adding Deal", {
          position: "top-right",
          autoClose: 3000,
        });
      }

      setDealsLoading(false);
    }
  };

  return (
    <div className="block overflow-y-auto no-scrollbar h-screen">
      <div className={`grid p-3 grid-cols-1 md:grid-cols-2 gap-4`}>
        <div>
          <Label
            htmlFor="title"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Title
          </Label>
          <Input
            id="title"
            type="text"
            value={dealFormData.title}
            onChange={(e) => updateDealFormData("title", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.title ? "border-red-500" : ""
            }`}
            placeholder="e.g., CRM Subscription - 1 Year"
          />
          {errors.title && <ErrorMessage error={errors.title} />}
        </div>
        <div>
          <Label
            htmlFor="name"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Name / Company
          </Label>
          <Input
            id="name"
            value={dealFormData.name}
            onChange={(e) => updateDealFormData("name", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.name ? "border-red-500" : ""
            }`}
            placeholder="Full name of the deal"
          />
          {errors.name && <ErrorMessage error={errors.name} />}
        </div>

        <div>
          <Label
            htmlFor="phone"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Phone Number
          </Label>
          <PhoneInput
            value={dealFormData.phone}
            onChange={(value) => updateDealFormData("phone", value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.phone ? "border-red-500" : ""
            }`}
            placeholder="Enter phone number"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <ErrorMessage error={errors.phone} />}
        </div>
        <div>
          <Label
            htmlFor="owner"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Owner
          </Label>
          <Input
            id="owner"
            type="text"
            value={dealFormData.owner}
            onChange={(e) => updateDealFormData("owner", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.dealOwner ? "border-red-500" : ""
            }`}
            placeholder="e.g., John Doe"
          />
          {errors.owner && <ErrorMessage error={errors.owner} />}
        </div>
        <div>
          <Label
            htmlFor="source"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Source
          </Label>
          <Select
            value={dealFormData.source || ""}
            onValueChange={(value) => updateDealFormData("source", value)}
            className={errors.source ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.source ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select Deal Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Advertisement">Advertisement</SelectItem>
              <SelectItem value="Cold call">Cold call</SelectItem>
              <SelectItem value="Employee referral">
                Employee referral
              </SelectItem>
              <SelectItem value="External referral">
                External referral
              </SelectItem>
              <SelectItem value="Sales email alias">
                Sales email alias
              </SelectItem>
              <SelectItem value="Chat">Chat</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Web Research">Web Research</SelectItem>
              <SelectItem value="X(Twitter)">X(Twitter)</SelectItem>
              <SelectItem value="Public relations">Public relations</SelectItem>
            </SelectContent>
          </Select>
          {errors.source && <ErrorMessage error={errors.source} />}
        </div>
        <div>
          <Label
            htmlFor="status"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Status
          </Label>
          <Select
            value={dealFormData.status || ""}
            onValueChange={(value) => updateDealFormData("status", value)}
            className={errors.status ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.status ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select Deal Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Closed-won">Closed - Won</SelectItem>
              <SelectItem value="Closed-lost">Closed - Lost</SelectItem>
              <SelectItem value="On-hold">On Hold</SelectItem>
              <SelectItem value="Abandoned">Abandoned</SelectItem>
              <SelectItem value="Contract Sent">Contract Sent</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && <ErrorMessage error={errors.status} />}
        </div>

        <div>
          <Label
            htmlFor="email"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={dealFormData.email}
            onChange={(e) => updateDealFormData("email", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.dealEmail ? "border-red-500" : ""
            }`}
            placeholder="Enter email"
          />
          {errors.email && <ErrorMessage error={errors.email} />}
        </div>
        <div>
          <Label
            htmlFor="priority"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Priority
          </Label>
          <Select
            value={dealFormData.priority || ""}
            onValueChange={(value) => updateDealFormData("priority", value)}
            className={errors.priority ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.priority ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select Deal Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <ErrorMessage error={errors.priority} />
        </div>
        <div>
          <label className="mb-2 text-slate-700 dark:text-slate-300 font-medium">
            Select Products
          </label>

          <MultipleSelector
            commandProps={{
              label: "Select Products",
            }}
            className="mb-2"
            value={dealProducts}
            onChange={setDealProducts}
            defaultOptions={products.concat({
              value: "Other",
              label: "Other",
            })}
            placeholder="Select Products"
            hideClearAllButton
            hidePlaceholderWhenSelected
            emptyIndicator={
              <p className="text-center text-sm">No results found</p>
            }
          />

          {dealProducts.find((prod) => prod.value === "Other") && (
            <Input
              type="text"
              placeholder="Please specify the product"
              className="mt-2"
              value={otherValue}
              onChange={(e) => setOtherValue(e.target.value)}
            />
          )}
        </div>
        <div>
          <Label
            htmlFor="value"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Amount / Value
          </Label>
          <Input
            id="value"
            type="number"
            value={dealFormData.value}
            onChange={(e) => updateDealFormData("value", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.value ? "border-red-500" : ""
            }`}
            placeholder="₹50000"
          />
          {errors.value && <ErrorMessage error={errors.value} />}
        </div>

        <div>
          <Label
            htmlFor="closeDate"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Expected Close Date
          </Label>
          <Input
            id="closeDate"
            type="date"
            value={dealFormData.closeDate}
            onChange={(e) => updateDealFormData("closeDate", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.closeDate ? "border-red-500" : ""
            }`}
            placeholder="YYYY-MM-DD"
          />
          {errors.closeDate && <ErrorMessage error={errors.closeDate} />}
        </div>
        <div className="md:col-span-2">
          <Label
            htmlFor="description"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Status Description
          </Label>
          <textarea
            id="description"
            type="text"
            value={dealFormData.description}
            onChange={(e) => updateDealFormData("description", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 w-full pl-1 border-white dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.description ? "border-red-500" : ""
            }`}
            placeholder="Enter the insights gathered during this status"
          />
        </div>
      </div>
      <div className="py-2 border-t border-slate-200 dark:border-slate-700 flex justify-start mb-10">
        <Button
          disabled={dealsLoading}
          onClick={handleDealsSubmit}
          className={`${
            dealsLoading
              ? "bg-purple-400 hover:bg-purple-500"
              : "bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600"
          }  cursor-pointer text-white`}
        >
          {dealsLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Deals
        </Button>
      </div>
    </div>
  );
};

export default DealForm;

"use client";

import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import PhoneInput from "../PhoneInput";

const CustomerForm = ({ session, fetchCustomers, setCustomersData }) => {
  const today = new Date();
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    phone: "",
    email: "",
    linkedIn: "",
    price: "",
    location: "",
    website: "",
    industry: "",
    status: "",
    created_at: today,
  });
  const [errors, setErrors] = useState({});
  const [customerLoading, setCustomerLoading] = useState(false);

  const updateCustomerFormData = (field, value) => {
    setCustomerFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setCustomerLoading(true);
    const newErrors = {};
    let isValid = true;
    if (!customerFormData.name) {
      newErrors.name = "Name is required";
      isValid = false;
    } else {
      newErrors.name = "";
    }
    if (!customerFormData.phone) {
      newErrors.phone = "Phone Number is Required";
      isValid = false;
    } else {
      newErrors.phone = "";
    }

    if (!customerFormData.status) {
      newErrors.status = "Status is Required";
      isValid = false;
    } else {
      newErrors.status = "";
    }

    if (!customerFormData.created_at) {
      customerFormData.created_at = today;
      newErrors.created_at = "";
      isValid = true;
    }

    if (customerFormData.linkedIn) {
      if (!customerFormData.linkedIn.includes("https://www.linkedin.com/")) {
        newErrors.linkedIn = "LinkedIn Url Required";
        toast.error("LinkedIn Url Required");
        isValid = false;
      } else {
        newErrors.linkedIn = "";
      }
    }

    if (!isValid) {
      setCustomerLoading(false);
      setErrors(newErrors);
      return;
    } else {
      const req = await fetch("/api/addCustomer", {
        method: "POST",
        body: JSON.stringify({
          ...customerFormData,
          session: session,
        }),
      });

      if (req.status == 404) {
        toast.error("Email Already Exists", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      if (req.status == 200) {
        toast.success("Customer Added", {
          autoClose: 3000,
          position: "top-right",
        });

        const updatedCustomer = await req.json();
        setCustomersData((prevCustomers) => [
          ...prevCustomers,
          updatedCustomer,
        ]);
        setCustomerFormData({
          name: "",
          phone: "",
          email: "",
          linkedIn: "",
          price: 0,
          location: "",
          website: "",
          industry: "",
          status: "",
          created_at: "",
        });
        
      } else {
        toast.error("Error in Adding Customer", {
          position: "top-right",
          autoClose: 3000,
        });
      }

      setCustomerLoading(false);
    }
  };

  const ErrorMessage = ({ error }) =>
    error && (
      <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );

  return (
    <div className="overflow-y-scroll h-screen no-scrollbar">
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="name"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Name
          </Label>
          <Input
            id="name"
            value={customerFormData.name}
            onChange={(e) => updateCustomerFormData("name", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.name ? "border-red-500" : ""
            }`}
            placeholder="Customer full name"
          />
          <ErrorMessage error={errors.name} />
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
            value={customerFormData.email}
            onChange={(e) => updateCustomerFormData("email", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.email ? "border-red-500" : ""
            }`}
            placeholder="customer@email.com"
          />
          <ErrorMessage error={errors.email} />
        </div>
        <div>
          <Label
            htmlFor="number"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Number
          </Label>
          <PhoneInput
            value={customerFormData.phone}
            onChange={(value) => updateCustomerFormData("phone", value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.phone ? "border-red-500" : ""
            }`}
            placeholder="Enter phone number"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          <ErrorMessage error={errors.phone} />
        </div>
        <div>
          <Label
            htmlFor="linkedIn"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            LinkedIn Profile
          </Label>
          <Input
            id="linkedIn"
            type="url"
            value={customerFormData.linkedIn}
            onChange={(e) => updateCustomerFormData("linkedIn", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.linkedIn ? "border-red-500" : ""
            }`}
            placeholder="LinkedIn profile URL"
          />
          <ErrorMessage error={errors.linkedIn} />
        </div>
        <div>
          <Label
            htmlFor="industry"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Industry
          </Label>
          <Select
            value={customerFormData.industry || ""}
            onValueChange={(value) => updateCustomerFormData("industry", value)}
            className={errors.industry ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.industry ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <ErrorMessage error={errors.industry} />
        </div>
        <div>
          <Label
            htmlFor="website"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Company Website
          </Label>
          <Input
            id="companyWebsite"
            type="url"
            value={customerFormData.website}
            onChange={(e) => updateCustomerFormData("website", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.website ? "border-red-500" : ""
            }`}
            placeholder="https://yourcompany.com"
          />
          <ErrorMessage error={errors.website} />
        </div>
        <div>
          <Label
            htmlFor="address"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Customer Address
          </Label>
          <Input
            id="address"
            type="text"
            value={customerFormData.location}
            onChange={(e) => updateCustomerFormData("location", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.location ? "border-red-500" : ""
            }`}
            placeholder="Customer Address"
          />
          <ErrorMessage error={errors.location} />
        </div>
        <div>
          <Label
            htmlFor="status"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Customer Status
          </Label>
          <Select
            value={customerFormData.status || ""}
            onValueChange={(value) => updateCustomerFormData("status", value)}
            className={errors.status ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.status ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select Customer Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
          <ErrorMessage error={errors.status} />
        </div>
        <div>
          <Label
            htmlFor="price"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Customer Price
          </Label>
          <Input
            id="price"
            type="number"
            value={customerFormData.price}
            onChange={(e) => updateCustomerFormData("price", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.price ? "border-red-500" : ""
            }`}
            placeholder="Customer Price"
          />
          <ErrorMessage error={errors.price} />
        </div>
        <div>
          <Label
            htmlFor="issue"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Customer issue
          </Label>
          <Input
            id="price"
            type="text"
            value={customerFormData.issue}
            onChange={(e) => updateCustomerFormData("issue", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.issue ? "border-red-500" : ""
            }`}
            placeholder="Customer issue"
          />
          <ErrorMessage error={errors.issue} />
        </div>
        <div>
          <Label
            htmlFor="issue"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Customer On-boarded Date
          </Label>
          <Input
            id="onboarded-date"
            type="date"
            value={customerFormData.created_at}
            onChange={(e) =>
              updateCustomerFormData("created_at", e.target.value)
            }
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.created_at ? "border-red-500" : ""
            }`}
            placeholder="Customer On Boarded Date"
          />
          <ErrorMessage error={errors.created_at} />
        </div>
      </div>
      <div className="py-2 border-t border-slate-200 dark:border-slate-700 flex justify-start mb-10">
        <Button
          disabled={customerLoading}
          onClick={handleCustomerSubmit}
          className={`${
            customerLoading
              ? "bg-purple-400 hover:bg-purple-500"
              : "bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600"
          }  cursor-pointer text-white`}
        >
          {customerLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Customers
        </Button>
      </div>
    </div>
  );
};

export default CustomerForm;

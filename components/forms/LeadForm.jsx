"use client";

import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabase/client";
import PhoneInput from "../PhoneInput";

const LeadForm = ({ session, fetchLeads, fetchDeals, setLeadsData }) => {
  const today = new Date();
  const [leadsFormData, setLeadsFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    linkedIn: "",
    industry: "",
    company: "",
    income: "",
    website: "",
    status: "",
    source: "",
    address: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [leadsLoading, setLeadsLoading] = useState(false);

  const updateLeadsFormData = (field, value) => {
    setLeadsFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleLeadsSubmit = async (e) => {
    e.preventDefault();
    setLeadsLoading(true);

    let newErrors = {};
    let isValid = true;

    if (!leadsFormData.name) {
      newErrors.name = "Name is required";
      isValid = false;
    } else {
      newErrors.name = "";
    }

    if (!leadsFormData.phone) {
      newErrors.phone = "Phone is required";
      isValid = false;
    } else {
      newErrors.phone = "";
    }
    if (!leadsFormData.status) {
      newErrors.status = "Status is required";
      isValid = false;
    } else {
      newErrors.status = "";
    }

    if (!isValid) {
      setErrors(newErrors);
      setLeadsLoading(false);
      return;
    }

    const req = await fetch("/api/addLeads", {
      method: "POST",
      body: JSON.stringify({ ...leadsFormData, session }),
    });

    if (leadsFormData.status === "Qualified") {
      const leadToDeal = {
        name: leadsFormData.name,
        number: leadsFormData.number,
        email: leadsFormData.email,
        status: "New",
        created_at: today.toISOString().split("T")[0],
        closeDate: today.toISOString().split("T")[0],
        user_email: leadsFormData.user_email,
      };
      const { data: deal, error } = await supabase
        .from("Deals")
        .insert({
          ...leadToDeal,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error moving lead to deal:", error);
        toast.error("Error moving lead to deal");
      } else {
        toast.success("Lead moved to deal successfully");

        await fetchDeals();
        await fetchLeads();
      }
    }

    if (req.status === 200) {
      toast.success("Lead Added", { autoClose: 3000, position: "top-right" });
      const createdLead = await req.json();
      const leadObj = Array.isArray(createdLead) ? createdLead[0] : createdLead;
      setLeadsData((prevLeads) => [leadObj, ...prevLeads]); // Client-side trigger too (helps debugging in Network tab)
      try {
        await fetch("/api/agents/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "LeadCreated",
            payload: {
              id: leadObj?.id,
              name: leadObj?.name,
              email: leadObj?.email,
              owner: leadObj?.owner || "auto",
              source: leadObj?.source || leadsFormData.source || "Unknown",
            },
          }),
        });
      } catch (e) {}
      setLeadsFormData({
        name: "",
        phone: "",
        email: "",
        linkedIn: "",
        location: "",
        website: "",
        industry: "",
        status: "",
        created_at: "",
        user_email: session.user.email,
      });
    } else {
      toast.error("Error in Adding Leads", {
        position: "top-right",
        autoClose: 3000,
      });
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    setLeadsLoading(false);
  };

  const ErrorMessage = ({ error }) =>
    error && (
      <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );

  return (
    <div className="block overflow-y-scroll h-screen no-scrollbar">
      <div className={`grid p-3 grid-cols-1 md:grid-cols-2 gap-4`}>
        <div>
          <Label
            htmlFor="name"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Name
          </Label>
          <Input
            id="name"
            value={leadsFormData.name}
            onChange={(e) => updateLeadsFormData("name", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.name ? "border-red-500" : ""
            }`}
            placeholder="Lead's full name"
          />
          {errors.name && <ErrorMessage error={errors.name} />}
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
            value={leadsFormData.email}
            onChange={(e) => updateLeadsFormData("email", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.email ? "border-red-500" : ""
            }`}
            placeholder="lead@email.com"
          />
          {errors.email && <ErrorMessage error={errors.email} />}
        </div>
        <div>
          <Label
            htmlFor="number"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Phone
          </Label>
          <PhoneInput
            value={leadsFormData.phone}
            onChange={(value) => updateLeadsFormData("phone", value)}
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
            htmlFor="age"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Age
          </Label>
          <Input
            id="age"
            value={leadsFormData.age}
            onChange={(e) => updateLeadsFormData("age", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.age ? "border-red-500" : ""
            }`}
            placeholder="Lead's age"
          />
          {errors.age && <ErrorMessage error={errors.age} />}
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
            value={leadsFormData.linkedIn}
            onChange={(e) => updateLeadsFormData("linkedIn", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.linkedIn ? "border-red-500" : ""
            }`}
            placeholder="LinkedIn profile URL"
          />
          {errors.linkedIn && <ErrorMessage error={errors.linkedIn} />}
        </div>
        <div>
          <Label
            htmlFor="industry"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Industry
          </Label>
          <Select
            value={leadsFormData.industry || ""}
            onValueChange={(value) => updateLeadsFormData("industry", value)}
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
          {errors.industry && <ErrorMessage error={errors.industry} />}
        </div>
        <div>
          <Label
            htmlFor="company"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Company
          </Label>
          <Input
            id="company"
            value={leadsFormData.company}
            onChange={(e) => updateLeadsFormData("company", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.company ? "border-red-500" : ""
            }`}
            placeholder="Lead Company"
          />
          {errors.company && <ErrorMessage error={errors.company} />}
        </div>
        <div>
          <Label
            htmlFor="income"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Income
          </Label>
          <Input
            id="income"
            value={leadsFormData.income}
            onChange={(e) => updateLeadsFormData("income", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.income ? "border-red-500" : ""
            }`}
            placeholder="Lead's income"
          />
          {errors.income && <ErrorMessage error={errors.income} />}
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
            value={leadsFormData.website}
            onChange={(e) => updateLeadsFormData("website", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.website ? "border-red-500" : ""
            }`}
            placeholder="https://yourcompany.com"
          />
          {errors.website && <ErrorMessage error={errors.website} />}
        </div>
        <div>
          <Label
            htmlFor="status"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Lead Status
          </Label>
          <Select
            value={leadsFormData.status || ""}
            onValueChange={(value) => updateLeadsFormData("status", value)}
            className={errors.status ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.status ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select Lead Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="In progress">In progress</SelectItem>
              <SelectItem value="Contact Attempted">
                Contact Attempted
              </SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Unqualified">Unqualified</SelectItem>
              <SelectItem value="Meeting Booked">Meeting Booked</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && <ErrorMessage error={errors.status} />}
        </div>
        <div>
          <Label
            htmlFor="source"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Lead Source
          </Label>
          <Select
            value={leadsFormData.source || ""}
            onValueChange={(value) => updateLeadsFormData("source", value)}
            className={errors.source ? "border-red-500" : ""}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white ${
                errors.source ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select Lead Source" />
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
            htmlFor="address"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Address
          </Label>
          <Input
            id="address"
            type="url"
            value={leadsFormData.address}
            onChange={(e) => updateLeadsFormData("address", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.address ? "border-red-500" : ""
            }`}
            placeholder="Lead's Address"
          />
          {errors.address && <ErrorMessage error={errors.address} />}
        </div>
        <div className="md:col-span-2">
          <Label
            htmlFor="description"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Description
          </Label>
          <Textarea
            id="description"
            value={leadsFormData.description}
            onChange={(e) => updateLeadsFormData("description", e.target.value)}
            className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 ${
              errors.income ? "border-red-500" : ""
            }`}
            placeholder="Lead description"
          />
          {errors.description && <ErrorMessage error={errors.description} />}
        </div>
      </div>
      <div className="py-2 border-t border-slate-200 dark:border-slate-700 flex justify-start mb-10">
        <Button
          disabled={leadsLoading}
          onClick={handleLeadsSubmit}
          className={`${
            leadsLoading
              ? "bg-purple-400 hover:bg-purple-500"
              : "bg-gradient-to-r from-sky-700 to-teal-500 hover:from-sky-600 hover:to-teal-600"
          }  cursor-pointer text-white`}
        >
          {leadsLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Leads
        </Button>
      </div>
    </div>
  );
};

export default LeadForm;

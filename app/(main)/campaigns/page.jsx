"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs } from "@radix-ui/react-tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { redirect, useRouter } from "next/navigation";
import { StickyNote } from "@/components/ui/StickyNote";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [openFilter, setOpenFilter] = useState(null); // 'month', 'date', 'audience'
  const [user, setUser] = useState(null);
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [sentCampaigns, setSentCampaigns] = useState([]);
  const [campaignsTab, setCampaignsTab] = useState("Saved");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  // const [show, setShow] = useState(-1);
  const [audienceFilter, setAudienceFilter] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedTab = sessionStorage.getItem("campaignsTab");
    if (storedTab) {
      setCampaignsTab(storedTab);
    }
  }, []);
  useEffect(() => {
    try {
      const rawSession = localStorage.getItem("session");
      const user = localStorage.getItem("user");

      if (!user) {
        redirect("/");
      }
      if (rawSession) {
        const session = JSON.parse(rawSession);
        setUserEmail(session?.user?.email || null);
      }
      if (user) {
        setUser(JSON.parse(user));
      }
    } catch (error) {
      console.error("Failed to parse session from localStorage:", error);
    }
  }, []);
  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: customerData } = await supabase
        .from("Customers")
        .select("id, name, email, user_email")
        .eq("user_email", userEmail);

      const { data: leadData } = await supabase
        .from("Leads")
        .select("id, name, email, user_email")
        .eq("user_email", userEmail);

      const { data: dealData } = await supabase
        .from("Deals")
        .select("id, name, email, user_email")
        .eq("user_email", userEmail);

      const { data: campaignData } = await supabase
        .from("Campaigns")
        .select("*")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false });

      setCustomers(customerData || []);
      setLeads(leadData || []);
      setDeals(dealData || []);
      setSavedCampaigns(campaignData.filter((c) => c.status === "Saved"));
      setSentCampaigns(campaignData.filter((c) => c.status === "Sent"));
      setCampaigns(campaignData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userEmail) return;

    fetchData();
  }, [userEmail]);

  const [selectedContacts, setSelectedContacts] = useState([]);
  const [newContacts, setNewContacts] = useState([{ name: "", email: "" }]);
  const [campaign, setCampaign] = useState({});
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const toggleSelect = (contact) => {
    setSelectedContacts((prev) =>
      prev.find((c) => c.email === contact.email)
        ? prev.filter((c) => c.email !== contact.email)
        : [...prev, contact]
    );
  };

  const handleSend = async () => {
    if (!selectedCampaign) return;

    setLoading(true);

    try {
      const res = await fetch("/api/sendMailCampaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCampaign.name,
          subject: selectedCampaign.subject,
          body: selectedCampaign.body,
          recipients: selectedCampaign.audience,
          user,
        }),
      });

      if (res.ok) {
        toast.success("✅ Campaign sent successfully!");
      } else {
        const err = await res.json();
        toast.error(` Failed: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(" Error sending campaign.");
    } finally {
      setLoading(false);
    }
    await fetchData();
    sessionStorage.setItem("campaignsTab", "Sent");
  };

  const handleSaveCampaign = async () => {
    const allRecipients = [
      ...selectedContacts,
      ...newContacts.filter((c) => c.email),
    ];

    if (allRecipients.length === 0) {
      alert("Please select or add at least one contact.");
      return;
    }
    if (!campaign.name || !campaign.subject || !campaign.body) {
      alert("Please fill in all campaign details.");
      return;
    }

    try {
      const { data: alreadyExistingCamp, errorCamp } = await supabase
        .from("Campaigns")
        .select("*")
        .eq("name", campaign.name)
        .eq("user_email", userEmail)
        .single();

      if (alreadyExistingCamp) {
        toast.error(
          "Campaign with this name already exists. Please choose a different name."
        );
        return;
      }

      const { error } = await supabase.from("Campaigns").insert({
        name: campaign.name,
        subject: campaign.subject,
        body: campaign.body,
        audience: allRecipients.map((c) => c.email),
        user_email: userEmail,
        status: "Saved",
      });

      if (error) {
        toast.error("Failed to save campaign: " + error.message);
        return;
      }

      const { data: campaignData } = await supabase
        .from("Campaigns")
        .select("*")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false });
      setCampaigns(campaignData || []);

      setCampaign({ name: "", subject: "", body: "" });
      setSelectedContacts([]);
      setNewContacts([{ name: "", email: "" }]);

      toast.success("Campaign Saved successfully!");
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("An error occurred while saving the campaign.");
    }
    await fetchData();
  };

  const handleDeleteCampaign = async (id) => {
    try {
      const { error } = await supabase.from("Campaigns").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete campaign: " + error.message);
        return;
      }

      toast.success("Campaign deleted successfully!");
      await fetchData();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("An error occurred while deleting the campaign.");
    }
  };

  const handleDuplicateCampaign = async (campaign) => {
    let name = campaign.name + " (Copy)";
    let a = 1;
    while (campaigns.map((c) => c.name).includes(name)) {
      name = campaign.name + " (Copy)" + a;
      a++;
    }
    const { error } = await supabase.from("Campaigns").insert({
      ...campaign,
      id: undefined,
      status: "Saved",
      audience: campaign.audience.map((a) => a.email),
      name: name,
      created_at: new Date().toISOString().split("T")[0],
    });

    if (error) {
      toast.error("Failed to duplicate campaign: " + error.message);
      return;
    }

    toast.success(
      "Campaign duplicated successfully! You can view it in saved Campaigns tab."
    );

    await fetchData();
    setCampaignsTab("Saved");
  };

  const filterByDate = (campaign) => {
    if (!monthFilter) return true; // no filter applied

    const created = new Date(campaign.created_at);
    const now = new Date();

    switch (monthFilter) {
      case "last2days": {
        const twoDaysAgo = new Date(now);
        twoDaysAgo.setDate(now.getDate() - 2);
        return created >= twoDaysAgo;
      }
      case "last10days": {
        const tenDaysAgo = new Date(now);
        tenDaysAgo.setDate(now.getDate() - 10);
        return created >= tenDaysAgo;
      }
      case "lastMonth": {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return created >= oneMonthAgo;
      }
      case "lastYear": {
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        return created >= oneYearAgo;
      }
      default:
        return true;
    }
  };
  const filterByMonth = (campaign) => {
    if (!monthFilter) return true;

    const campaignMonth = new Date(campaign.created_at).getMonth() + 1;
    const filterMonth = parseInt(monthFilter, 10);

    return campaignMonth === filterMonth;
  };
  console.log(campaigns);

  const filterByAudience = (campaign) => {
    if (!audienceFilter) return true;
    const size = campaign.audience?.length || 0;

    switch (audienceFilter) {
      case "lt10":
        return size < 10;
      case "10to50":
        return size >= 10 && size <= 50;
      case "50to100":
        return size > 50 && size <= 100;
      case "100to500":
        return size > 100 && size <= 500;
      case "gt500":
        return size > 500;
      default:
        return true;
    }
  };

  const filteredSaved = savedCampaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.body.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      matchesSearch &&
      filterByDate(c) &&
      filterByAudience(c) &&
      filterByMonth(c)
    );
  });

  const filteredSent = sentCampaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.body.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      matchesSearch &&
      filterByDate(c) &&
      filterByAudience(c) &&
      filterByMonth(c)
    );
  });

  if (loading) return <p className="p-6">Loading...</p>;

  const copyExists = (c) => {
    const escapeRegex = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escapeRegex(c.name)} \\(Copy\\)( \\d+)?$`);
    return campaigns.some((campaign) => pattern.test(campaign.name));
  };

  return (
    <div className="min-h-screen w-full rounded-lg bg-transparent">
      <div className="flex flex-row justify-left items-center">
        <Sheet>
          <div className="flex w-full flex-col items-stretch md:flex-row gap-4 justify-between md:items-center relative">
            <div className="flex-1 w-full">
              <h1 className="text-3xl md:text-4xl font-bold flex items-start bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] dark:from-[#25C2A0] dark:to-[#4fd1c5] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
                Campaigns
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Manage your email campaigns effectively
              </p>
            </div>
            <SheetTrigger asChild>
              <Button className="bg-gradient-to-r max-sm:w-full px-3 py-2 rounded-xl from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white ">
                Create Campaign
              </Button>
            </SheetTrigger>
          </div>
          <SheetContent
            side="right"
            className="w-full sm:min-w-[85vw] overflow-y-auto backdrop-blur-sm bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 mb-6"
          >
            <SheetHeader>
              <SheetTitle>Create Email Campaign</SheetTitle>
              <SheetDescription asChild>
                <>
                  <div className="p-3 flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
                        Campaign Details
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Campaign Name"
                          value={campaign.name}
                          onChange={(e) =>
                            setCampaign({ ...campaign, name: e.target.value })
                          }
                          className="border border-slate-200 dark:border-slate-800 rounded p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Subject"
                          value={campaign.subject}
                          onChange={(e) =>
                            setCampaign({
                              ...campaign,
                              subject: e.target.value,
                            })
                          }
                          className="border border-slate-200 dark:border-slate-800 rounded p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                      <textarea
                        placeholder="Email Body..."
                        rows={6}
                        value={campaign.body}
                        onChange={(e) =>
                          setCampaign({ ...campaign, body: e.target.value })
                        }
                        className="border border-slate-200 dark:border-slate-800 rounded p-2 w-full mt-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
                        Select Audience
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <h3 className="font-medium mb-2 text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            Customers
                          </h3>
                          {customers.map((c) => (
                            <label
                              key={c.id}
                              className="flex items-center mb-1 text-sm text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.some(
                                  (sc) => sc.email === c.email
                                )}
                                onChange={() => toggleSelect(c)}
                                className="mr-2"
                              />
                              {c.name} ({c.email})
                            </label>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium mb-2 text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            Leads
                          </h3>
                          {leads.map((l) => (
                            <label
                              key={l.id}
                              className="flex items-center mb-1 text-sm text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.some(
                                  (sc) => sc.email === l.email
                                )}
                                onChange={() => toggleSelect(l)}
                                className="mr-2"
                              />
                              {l.name} ({l.email})
                            </label>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium mb-2 text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Deals
                          </h3>
                          {deals.map((d) => (
                            <label
                              key={d.id}
                              className="flex items-center mb-1 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.some(
                                  (sc) => sc.email === d.email
                                )}
                                onChange={() => toggleSelect(d)}
                                className="mr-2"
                              />
                              {d.name} ({d.email})
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
                        Add New Contacts
                      </h2>
                      {newContacts.map((c, i) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Name"
                            value={c.name}
                            onChange={(e) => {
                              const updated = [...newContacts];
                              updated[i].name = e.target.value;
                              setNewContacts(updated);
                            }}
                            className="border border-slate-200 dark:border-slate-800 rounded p-2 flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={c.email}
                            onChange={(e) => {
                              const updated = [...newContacts];
                              updated[i].email = e.target.value;
                              setNewContacts(updated);
                            }}
                            className="border border-slate-200 dark:border-slate-800 rounded p-2 flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setNewContacts([
                            ...newContacts,
                            { name: "", email: "" },
                          ])
                        }
                        className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-4 py-2 rounded-xl hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors font-medium flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add More Contacts
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveCampaign}
                        className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700"
                      >
                        Save Campaign
                      </button>
                    </div>
                  </div>
                </>
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-10">
        <Card className="mb-6 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">            {/* Custom Search Input */}
            <div className="relative w-full sm:w-1/2 group">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded-xl px-4 py-2.5 w-full focus:ring-2 focus:ring-teal-500 outline-none backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/10 text-slate-900 dark:text-white transition-all pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {/* Custom Dropdowns */}
            {[
              { id: 'month', label: 'Month', value: monthFilter, setValue: setMonthFilter, options: [
                { v: "", l: "All months" }, { v: "1", l: "January" }, { v: "2", l: "February" }, { v: "3", l: "March" }, { v: "4", l: "April" }, { v: "5", l: "May" }, { v: "6", l: "June" }, { v: "7", l: "July" }, { v: "8", l: "August" }, { v: "9", l: "September" }, { v: "10", l: "October" }, { v: "11", l: "November" }, { v: "12", l: "December" }
              ]},
              { id: 'date', label: 'Time', value: dateFilter, setValue: setDateFilter, options: [
                { v: "", l: "All time" }, { v: "last2days", l: "Last 2 days" }, { v: "last10days", l: "Last 10 days" }, { v: "lastMonth", l: "Last 1 month" }, { v: "lastYear", l: "Last 1 year" }
              ]},
              { id: 'audience', label: 'Audience', value: audienceFilter, setValue: setAudienceFilter, options: [
                { v: "", l: "All audiences" }, { v: "lt10", l: "Less than 10" }, { v: "10to50", l: "10 - 50" }, { v: "50to100", l: "50 - 100" }, { v: "100to500", l: "100 - 500" }, { v: "gt500", l: "More than 500" }
              ]}
            ].map((f) => (
              <div key={f.id} className="relative flex-1 min-w-[140px]">
                <button
                  onClick={() => setOpenFilter(openFilter === f.id ? null : f.id)}
                  className="w-full flex items-center justify-between border rounded-xl px-4 py-2.5 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/10 text-slate-900 dark:text-white hover:border-teal-500 dark:hover:border-teal-400 transition-all outline-none cursor-pointer text-sm font-medium"
                >
                  <span className="truncate">
                    {f.options.find(opt => opt.v === f.value)?.l || f.label}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFilter === f.id ? 'rotate-180' : ''}`} />
                </button>

                {openFilter === f.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                      {f.options.map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => { f.setValue(opt.v); setOpenFilter(null); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                            ${f.value === opt.v 
                              ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold' 
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                          {opt.l}
                          {f.value === opt.v && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        {savedCampaigns.length === 0 && sentCampaigns.length === 0 ? (
          <Card className="shadow-sm rounded-3xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 w-full max-w-2xl mx-auto min-h-[40vh] flex flex-col items-center justify-center p-6 md:p-12 text-center my-8 backdrop-blur-md">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-6">
              <Megaphone className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              No Campaigns Available
            </h3>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your campaign list is empty. Start by creating your first campaign to reach and engage your audience effectively.
            </p>
          </Card>
        ) : (
          <Tabs
            value={campaignsTab}
            onValueChange={(e) => {
              setCampaignsTab(e);
              sessionStorage.setItem("campaignsTab", e);
            }}
            className="w-full"
          >
            <TabsList
              className={`${campaignsTab === "Saved" ? "mb-1" : "mb-10"
                } w-full backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20`}
            >
              <TabsTrigger value="Saved">Saved Campaigns</TabsTrigger>
              <TabsTrigger value="Sent">Sent Campaigns</TabsTrigger>
            </TabsList>

            <TabsContent value="Saved">
              <div className="grid grid-cols-1 gap-6 p-6">
                {filteredSaved.map((c) => (
                  <Card
                    key={c.id}
                    className="shadow-sm rounded-2xl border transition-all duration-200 hover:shadow-lg bg-white/70 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/20 h-full"
                  // onMouseEnter={() => {
                  //   setShow(c.id);
                  // }}
                  // onMouseLeave={() => {
                  //   setShow(-1);
                  // }}
                  >
                    <CardContent className="p flex flex-col h-full">
                      <h3 className="font-semibold text-xl text-gray-900 dark:text-white">
                        {c.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {c.subject}
                      </p>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-900 dark:text-white line-clamp-3 flex-grow leading-relaxed mb-1">
                          {c.body.length > 50
                            ? `${c.body.slice(0, 50)}...`
                            : c.body}
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {c.audience?.length > 0
                            ? `${c.audience.length} recipients`
                            : "No recipients"}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 border-t p-4 mt-auto">
                      <div className="flex flex-col md:flex-row justify-between w-full items-start md:items-center gap-4 text-xs border-slate-200 dark:border-slate-700">
                        <div
                          className={`flex flex-col md:flex-row gap-3 w-full md:w-auto mt-auto `}
                        >
                          <Button
                            onClick={() => router.push(`/campaigns/${c.name}`)}
                            className="text-sm px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 
                      bg-transparent hover:bg-slate-200 dark:hover:bg-slate-600 text-black dark:text-white
                       transition-colors cursor-pointer w-full md:w-auto"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => {
                              handleSend();
                              setSelectedCampaign(c);
                            }}
                            className="text-sm px-3 py-1 rounded-lg border border-green-300 dark:border-green-600 
                      bg-transparent hover:bg-green-200 dark:hover:bg-green-600 text-green-600 dark:text-green-400
                       transition-colors w-full md:w-auto"
                          >
                            Send Campaign
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                className="text-sm px-3 py-1 rounded-lg border border-red-300 dark:border-red-600 
                      bg-transparent hover:bg-red-200 dark:hover:bg-red-600 text-red-600 dark:text-red-400
                       transition-colors cursor-pointer w-full md:w-auto"
                              >
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogTitle>Delete Campaign</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this campaign?
                              </DialogDescription>
                              <DialogFooter className="flex justify-end gap-2 mt-4">
                                <Button
                                  className="bg-transparent border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-600"
                                  onClick={() => handleDeleteCampaign(c.id)}
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div>
                          <div className="text-xs min-w-[120px] flex text-slate-500 dark:text-slate-400">
                            <span className="inline">Created at: </span>
                            <span>
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="Sent">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {filteredSent.map((c) => (
                  <StickyNote
                    key={c.id}
                    color="bg-blue-200"
                    rotation="-rotate-2"
                    className="dark:bg-slate-800/50 dark:border-white/20 "
                  >
                    <Link href={`/campaigns/${c.name}`}>
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                    </Link>
                    <p className="text-sm font-sans">{c.subject}</p>{" "}
                    <div className="flex gap-2 mt-2">
                      <Dialog
                        open={duplicateDialogOpen}
                        onOpenChange={setDuplicateDialogOpen}
                      >
                        <Button
                          onClick={() => {
                            if (copyExists(c)) {
                              setDuplicateDialogOpen(true);
                            } else {
                              handleDuplicateCampaign(c);
                            }
                          }}
                          className={`${copyExists(c)
                              ? "opacity-50 cursor-auto text-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                              : "bg-transparent text-black dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                            }`}
                        >
                          Duplicate
                        </Button>
                        <DialogContent>
                          <DialogTitle>Duplicate Campaign</DialogTitle>
                          <DialogDescription>
                            A campaign with the name "{c.name} (Copy)" already
                            exists. Please rename the original campaign before
                            duplicating.
                          </DialogDescription>
                          <DialogFooter className="flex justify-end gap-2 mt-4">
                            <Button
                              className="bg-transparent border border-slate-300 dark:border-slate-600 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600"
                              onClick={() => setDuplicateDialogOpen(false)}
                            >
                              Close
                            </Button>
                            <Button
                              className="bg-sky-600 text-white hover:bg-sky-700"
                              onClick={() => {
                                handleDuplicateCampaign(c);
                                setDuplicateDialogOpen(false);
                              }}
                            >
                              Duplicate
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </StickyNote>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

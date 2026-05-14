"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  Phone,
  Mail,
  Presentation,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  UserPlus,
  X,
  ArrowRightToLine,
  BookmarkPlus,
  Delete,
  Edit,
  SquareCheckBig,
  Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";

export default function UpdateDeals(
  deal_id,
  onChange,
  fetchCustomers,
  fetchDeals
) {
  const today = new Date().toISOString().split("T")[0];
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [DealsData, setDealsData] = useState({});
  const [openActivities, setOpenActivities] = useState([]);
  const [closedActivities, setClosedActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stageHistory, setStageHistory] = useState([]);
  const [errors, setErrors] = useState({ newProduct: {} });

  const handleDealChange = (field, value) => {
    setDealsData((prev) => ({ ...prev, [field]: value }));
  };
  const fetchDealData = async () => {
    const { data, error } = await supabase
      .from("Deals")
      .select("*")
      .eq("id", deal_id.deal_id)
      .single();

    if (error) {
      console.error("Error fetching deal data:", error);
    } else {
      setDealsData(data);
      setOpenActivities(
        typeof data.open_activities === "string"
          ? JSON.parse(data.open_activities || "[]")
          : data.open_activities || []
      );
      setClosedActivities(
        typeof data.closed_activities === "string"
          ? JSON.parse(data.closed_activities || "[]")
          : data.closed_activities || []
      );
      setStageHistory(
        typeof data.stage_history === "string"
          ? JSON.parse(data.stage_history || "[]")
          : data.stage_history || []
      );
      setMessages(
        typeof data.messages === "string"
          ? JSON.parse(data.messages || "[]")
          : data.messages || []
      );
    }
  };
  useEffect(() => {
    fetchDealData();
  }, [deal_id]);

  const allEvents = [
    ...openActivities.map((a) => ({
      title: a.title,
      description: a.description,
      date: a.date,
      type: "open",
      category: a.category,
    })),

    ...closedActivities.map((a) => ({
      title: a.title,
      description: a.description,
      date: a.closed_at,
      type: "closed",
      category: a.category,
    })),

    ...stageHistory.map((s) => ({
      title: `${s.old_status} → ${s.new_status}`,
      description: s.state_description,
      date: s.end_date,
      type: "stage",
      category: "Stage",
    })),

    {
      title: "Deal Created",
      description: "Deal was created in the system",
      date: DealsData.created_at ? DealsData.created_at.split("T")[0] : "N/A",
      type: "deal",
      category: "Deal",
    },
  ];

  allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

  const iconMap = {
    meeting: Calendar,
    call: Phone,
    email: Mail,
    demo: Presentation,
    closed: CheckCircle2,
    open: XCircle,
    stage: ArrowRightLeft,
    deal: UserPlus,
  };

  const colorMap = {
    open: "text-blue-500",
    closed: "text-green-500",
    stage: "text-purple-500",
    deal: "text-orange-500",
  };

  const [activitiesFormData, setActivitiesFormData] = useState({
    title: "",
    description: "",
    date: "",
  });
  const dealStatus = [
    "New",
    "Proposal Sent",
    "Negotiation",
    "Closed-won",
    "Closed-lost",
    "On-hold",
    "Abandoned",
    "Contract Sent",
  ];
  const updateActivitiesFormData = (field, value) => {
    setActivitiesFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleUpdateActivity = async () => {
    setLoading(true);
    const { title, description, date } = activitiesFormData;
    const { error } = await supabase
      .from("Deals")
      .update({
        open_activities: [
          ...openActivities,
          {
            title,
            description,
            date,
            id: Date.now(),
            category: selectedActivity,
          },
        ],
      })
      .eq("id", deal_id.deal_id);
    if (error) {
      console.error("Error updating activity:", error);
      toast.error("Error updating activity!");
    } else {
      await fetchDealData();
      setActivitiesFormData({ title: "", description: "", date: "" });
      toast.success("Activity updated successfully!", {
        position: "top-right",
        zIndex: 9999,
      });
      await fetchDealData();
    }
    setLoading(false);
  };

  const handleRemoveActivity = async (activityId) => {
    setLoading(true);
    const { error } = await supabase
      .from("Deals")
      .update({
        open_activities: openActivities.filter(
          (activity) => activity.id !== activityId
        ),
      })
      .eq("id", deal_id.deal_id);
    if (error) {
      console.error("Error removing activity:", error);
      toast.error("Error removing activity!");
    } else {
      await fetchDealData();
      toast.success("Activity removed successfully!", {
        position: "top-right",
        zIndex: 9999,
      });
      onChange();
    }
    setLoading(false);
  };
  const handleEditActivity = (activityId, field, value) => {
    setOpenActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    );
  };

  const handleFinishEditActivity = async (activityId) => {
    setLoading(true);
    const updatedActivities = openActivities;

    const { error } = await supabase
      .from("Deals")
      .update({ open_activities: updatedActivities })
      .eq("id", deal_id.deal_id);

    if (error) {
      toast.error("Error updating activity!", {
        position: "top-right",
        zIndex: 9999,
      });
      console.error("Error updating activity:", error);
    } else {
      toast.success("Activity updated successfully!", {
        position: "top-right",
        zIndex: 9999,
      });
      setOpenActivities(updatedActivities);
      onChange();
    }

    setLoading(false);
  };

  const handleCloseActivity = async (activityId) => {
    setLoading(true);
    const update = openActivities.find(
      (activity) => activity.id === activityId
    );
    update.closed_at = today;
    const { error } = await supabase
      .from("Deals")
      .update({
        open_activities: openActivities.filter(
          (activity) => activity.id !== activityId
        ),
        closed_activities: [
          ...closedActivities,
          {
            ...update,
          },
        ],
      })
      .eq("id", deal_id.deal_id);
    if (error) {
      console.error("Error closing activity:", error);
      toast.error("Error closing activity!");
    } else {
      await fetchDealData();
      toast.success("Activity closed successfully!", {
        position: "top-right",
        zIndex: 9999,
      });
      onChange();
    }
    setLoading(false);
  };

  const handleUpdateDB = async () => {
    setLoading(true);
    const dataToUpdate = {
      name: DealsData.name,
      email: DealsData.email,
      number: DealsData.number,
      title: DealsData.title,
      value: DealsData.value,
      priority: DealsData.priority,
      company: DealsData.company,
      owner: DealsData.owner,
      closeDate: DealsData.closeDate,
      status: DealsData.status,
      source: DealsData.source,
      description: DealsData.description,
    };
    const { data: dealDetails, error: dealDetailsError } = await supabase
      .from("Deals")
      .select("*")
      .eq("id", deal_id.deal_id)
      .single();
    const noChanges =
      dealDetails.name === DealsData.name &&
      dealDetails.email === DealsData.email &&
      dealDetails.number === DealsData.number &&
      dealDetails.title === DealsData.title &&
      dealDetails.value === DealsData.value &&
      dealDetails.priority === DealsData.priority &&
      dealDetails.company === DealsData.company &&
      dealDetails.owner === DealsData.owner &&
      dealDetails.closeDate === DealsData.closeDate &&
      dealDetails.status === DealsData.status &&
      dealDetails.source === DealsData.source &&
      dealDetails.description === DealsData.description &&
      dealDetails.open_activities === openActivities;
    if (dealDetails.status != DealsData.status) {
      const stage_history = DealsData.stage_history || [];
      const length = stage_history.length;
      const start_date =
        stage_history[length - 1]?.end_date || DealsData.created_at;
      const current_history = {
        old_status: dealDetails.status,
        new_status: DealsData.status,
        start_date: start_date.split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        state_description: "",
      };
      stage_history.push(current_history);
      DealsData.stage_history = [...stage_history, current_history];

      if (DealsData.status == "Closed-won") {
        const customerData = {
          name: DealsData.name,
          phone: DealsData.number,
          email: DealsData.email,
          price: DealsData.value,
          location: DealsData.location,
          purchase_history: {
            product: DealsData.product,
            price: DealsData.value,
            purchase_date: today,
          },
          industry: DealsData.industry,
          status: "Active",
          created_at: today,
          user_email: DealsData.user_email,
        };

        const { data, error } = await supabase
          .from("Customers")
          .select("*")
          .eq("email", DealsData.email)
          .eq("user_email", DealsData.user_email)
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
              price: data.price + DealsData.value,
              status: "Active",
              created_at: data.created_at,
              purchase_history: [
                ...data.purchase_history,
                {
                  product: DealsData.product,
                  price: DealsData.value,
                },
              ],
            })
            .eq("email", DealsData.email)
            .eq("user_email", DealsData.user_email);
          if (error) {
            console.error("Error updating existing customer:", error);
          }
        }
        onChange();
      }
    }
    if (noChanges) {
      toast.info("No changes detected.");
      return;
    } else {
      const { error } = await supabase
        .from("Deals")
        .update(dataToUpdate)
        .eq("id", deal_id.deal_id);

      if (error) {
        console.error("Error updating database:", error);
        toast.error("Error updating database!");
      } else {
        toast.success(
          "Data updated permanently. All changes made are permanent.",
          { position: "top-right" }
        );
        setLoading(false);
      }
    }
  };

  const Activities = ["Meeting", "Email", "Call", "Product Demo", "Task"];

  return (
    <div className="flex flex-col">
      <div className="py-4  md:py-6 w-full mx-auto space-y-6 bg-slate-50 dark:bg-slate-900 p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="dealName">
            Deal Name
          </Label>
          <Input
            className="bg-white"
            id="dealName"
            placeholder="Deal Name"
            value={DealsData.name || ""}
            onChange={(e) => handleDealChange("name", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="dealEmail">
            Deal email
          </Label>
          <Input
            className="bg-white"
            id="dealEmail"
            placeholder="Deal email"
            value={DealsData.email || ""}
            onChange={(e) => handleDealChange("email", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="dealNumber">
            Phone Number
          </Label>
          <Input
            className="bg-white"
            id="dealNumber"
            placeholder="Deal's Phone Number"
            value={DealsData.number || ""}
            onChange={(e) => handleDealChange("number", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="title">
            Deal title
          </Label>
          <Input
            className="bg-white"
            id="title"
            placeholder="Deal title"
            value={DealsData.title || ""}
            onChange={(e) => handleDealChange("title", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="value">
            Deal value
          </Label>
          <Input
            className="bg-white"
            id="value"
            placeholder="Deal value"
            value={DealsData.value || ""}
            onChange={(e) => handleDealChange("value", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="priority">
            Deal priority
          </Label>
          <Input
            className="bg-white"
            id="priority"
            placeholder="Deal priority"
            value={DealsData.priority || ""}
            onChange={(e) => handleDealChange("priority", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="company">
            Deal Company
          </Label>
          <Input
            className="bg-white"
            id="company"
            placeholder="Deal Company"
            value={DealsData.company || ""}
            onChange={(e) => handleDealChange("company", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="owner">
            Deal Owner
          </Label>
          <Input
            className="bg-white"
            id="owner"
            placeholder="Deal Owner"
            value={DealsData.owner || ""}
            onChange={(e) => handleDealChange("owner", e.target.value)}
          />
        </div>
        <div>
          <Label className={"mb-4 text-gray-600"} htmlFor="closeDate">
            Deal close date
          </Label>
          <Input
            className="bg-white"
            type="date"
            id="closeDate"
            placeholder="Deal close date"
            value={DealsData.closeDate || ""}
            onChange={(e) => handleDealChange("closeDate", e.target.value)}
          />
        </div>
        <div>
          <Label
            htmlFor="status"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Status
          </Label>
          <Select
            value={DealsData.status}
            onValueChange={(value) => handleDealChange("status", value)}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white`}
            >
              <SelectValue placeholder="Select Deal Status" />
            </SelectTrigger>
            <SelectContent>
              {dealStatus.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label
            htmlFor="source"
            className="mb-2 text-slate-700 dark:text-slate-300"
          >
            Deal Source
          </Label>
          <Select
            value={DealsData.source}
            onValueChange={(value) => handleDealChange("source", value)}
          >
            <SelectTrigger
              className={`bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 text-slate-900 dark:text-white`}
            >
              <SelectValue
                placeholder={DealsData.source || "Select Deal Source"}
              />
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
        </div>
        <div className="md:col-span-3">
          <Label className={"mb-4 text-gray-600"} htmlFor="description">
            Deal description
          </Label>
          <Textarea
            className="bg-white"
            id="description"
            placeholder="Deal description"
            value={DealsData.description || ""}
            onChange={(e) => handleDealChange("description", e.target.value)}
          />
        </div>
        {/* <div className="md:col-span-3">
          <Card className="bg-transparent text-gray-600 border-0">
            <CardHeader className={`flex items-center justify-between`}>
              <CardTitle>Open Activities</CardTitle>
              <Dialog
                open={isOpen}
                onOpenChange={setIsOpen}
                className="z-10 h-screen w-screen items-center"
              >
                <Select
                  className="fixed z-0"
                  value={selectedActivity}
                  onValueChange={(val) => {
                    setSelectedActivity(val);
                    setIsOpen(true);
                  }}
                >
                  <SelectTrigger>Add Activity</SelectTrigger>
                  <SelectContent className="flex flex-col">
                    {Activities.map((activity) => (
                      <SelectItem
                        key={activity}
                        value={activity}
                        className="relative cursor-pointer border-b border-gray-600 last:border-0"
                      >
                        {activity}
                        {"\n"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogContent className="h-[80vh] md:h-[60vh] w-[90vw] md:w-[50vw]  p-4">
                  <DialogHeader>
                    <DialogTitle className="border-b-2 border-b-gray-200 mb-4 py-2 pb-2">
                      {selectedActivity} Details
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mx-5 gap-5 space-y-3">
                    <div>
                      <Label
                        className={"mb-4 text-gray-600 space-b-2"}
                        htmlFor="Title"
                      >
                        Title
                      </Label>
                      <Input
                        className="bg-white"
                        id="Title"
                        placeholder="Activity Title"
                        value={activitiesFormData.title}
                        onChange={(e) =>
                          updateActivitiesFormData("title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label
                        className={"mb-4 text-gray-600 space-y-2"}
                        htmlFor="Date"
                      >
                        Date
                      </Label>
                      <Input
                        className="bg-white"
                        id="Date"
                        type="date"
                        placeholder="Activity Date"
                        value={activitiesFormData.date}
                        onChange={(e) =>
                          updateActivitiesFormData("date", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label
                        className={"mb-4 text-gray-600 space-y-2"}
                        htmlFor="description"
                      >
                        Description
                      </Label>
                      <Textarea
                        className="bg-white"
                        id="Description"
                        placeholder="Activity Description"
                        value={activitiesFormData.description}
                        onChange={(e) =>
                          updateActivitiesFormData(
                            "description",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() =>
                        setActivitiesFormData({
                          title: "",
                          description: "",
                          date: "",
                        })
                      }
                      className="mt-4 border-red-600 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <X />
                      Clear Fields
                    </Button>
                    <Button
                      onClick={handleUpdateActivity}
                      className="mt-4 border-green-500 bg-white text-green-500 hover:bg-green-50 hover:text-green-700"
                    >
                      <ArrowRightToLine />
                      Add Activity
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-md text-gray-600 ">
                    Current Activities
                  </CardTitle>
                  <CardContent className="">
                    {openActivities.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {openActivities.map((activity, idx) => (
                          <Card
                            key={activity.id}
                            className="shadow-md rounded-2xl border border-purple-500 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words">
                                <Input
                                  value={activity.title}
                                  onChange={(e) =>
                                    handleEditActivity(
                                      activity.id,
                                      "title",
                                      e.target.value
                                    )
                                  }
                                />
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-slate-500 dark:text-slate-400 text-xs">
                                    Date
                                  </Label>
                                  <Input
                                    type="date"
                                    className="font-medium text-slate-900 dark:text-slate-100 text-sm"
                                    value={activity.date}
                                    onChange={(e) =>
                                      handleEditActivity(
                                        activity.id,
                                        "date",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-slate-500 dark:text-slate-400 text-xs">
                                    Category
                                  </Label>
                                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                    {activity.category}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <Textarea
                                  className="text-slate-500 dark:text-slate-400 text-xs"
                                  value={activity.description}
                                  onChange={(e) =>
                                    handleEditActivity(
                                      activity.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                />
                                <div className="grid grid-cols-3 gap-4 mt-5">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button className="border-2 border-red-500 cursor-pointer bg-white text-red-500 hover:bg-red-50 hover:text-red-700">
                                        <Delete />
                                        Delete Activity
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="w-full max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>
                                          Delete Activity
                                        </DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to delete this
                                          activity?
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button
                                          className="border-2 border-red-500 bg-white text-red-500 hover:bg-red-50 hover:text-red-700"
                                          variant="outline"
                                          onClick={() => {
                                            handleRemoveActivity(activity.id);
                                            setActivityToDelete(null);
                                          }}
                                        >
                                          Delete
                                        </Button>
                                        <Button
                                          className="border-2 border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                          variant="ghost"
                                          onClick={() => {
                                            setActivityToDelete(null);
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    className="border-2 border-blue-500 bg-white text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                                    onClick={() => {
                                      handleFinishEditActivity(activity.id);
                                    }}
                                  >
                                    <Edit />
                                    Update Activity
                                  </Button>
                                  <Button
                                    className="border-2 border-green-500 bg-white text-green-500 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => {
                                      handleCloseActivity(activity.id);
                                    }}
                                  >
                                    <SquareCheckBig />
                                    Close Activity
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {openActivities.length === 0 && (
                      <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                        <BookmarkPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">
                          No activities added yet. Add your first activity above
                          to get started.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CardHeader>
              </Card>
            </CardContent>
          </Card>
          <Card className="bg-transparent text-gray-600 border-0">
            <CardHeader className={`flex items-center justify-between`}>
              <CardTitle>Closed Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
                <CardHeader>
                  <CardContent className="">
                    {closedActivities.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {closedActivities.map((activity, idx) => (
                          <Card
                            key={activity.id}
                            className="shadow-md rounded-2xl border border-purple-500 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words">
                                <Label>{activity.title}</Label>
                              </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-slate-500 dark:text-slate-400 text-xs">
                                    Start Date
                                  </Label>
                                  <Label className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                    {activity.date}
                                  </Label>
                                </div>
                                <div>
                                  <Label className="text-slate-500 dark:text-slate-400 text-xs">
                                    Closed At
                                  </Label>
                                  <Label className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                    {activity.closed_at}
                                  </Label>
                                </div>
                                <div>
                                  <Label className="text-slate-500 dark:text-slate-400 text-xs">
                                    Category
                                  </Label>
                                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                    {activity.category}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <Label className="text-slate-500 dark:text-slate-400 text-xs">
                                  Description
                                </Label>
                                <Label className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                  {activity.description}
                                </Label>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {closedActivities.length === 0 && (
                      <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                        <BookmarkPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">
                          No activities closed yet. Close your first activity to
                          get started.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CardHeader>
              </Card>
            </CardContent>
          </Card>
        </div> */}
        <Button
          onClick={handleUpdateDB}
          disabled={loading}
          className={`mt-4 bg-blue-600 hover:bg-blue-700 text-white ${
            loading ? "cursor-not-allowed opacity-70" : ""
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}{" "}
          Update Deal Data
        </Button>
      </div>
      <Card className="bg-transparent text-gray-600 border-0">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Stage History</CardTitle>
        </CardHeader>

        <CardContent>
          <Card className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
            <CardContent className={"p-0 pt-0"}>
              {stageHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                          Old Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                          New Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {stageHistory.map((stage, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                            {stage.old_status}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">
                            {stage.new_status}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                            {stage.start_date}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                            {stage.end_date}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 break-words max-w-xs">
                            {stage.state_description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                  <BookmarkPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    No stage history yet. Progress through stages to see
                    history.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="relative border-l border-gray-300 dark:border-gray-700 ml-4">
            {allEvents.map((event, idx) => {
              const Icon =
                iconMap[event.category?.toLowerCase()] ||
                iconMap[event.type] ||
                iconMap.stage;
              const color = colorMap[event.type] || "text-gray-500";

              return (
                <div key={idx} className="mb-8 ml-4 relative gap-5">
                  <span className="absolute -left-12 top-1 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 ">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </span>

                  <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.date}
                    </p>
                    {event.description && (
                      <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-transparent text-gray-600 border-0">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Latest Messages</CardTitle>
        </CardHeader>

        <CardContent>
          {messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.slice(-5).map((msg, idx) => (
                <Card
                  key={idx}
                  className={`rounded-xl shadow-sm border ${
                    msg.type === "customer"
                      ? "border-blue-400 bg-blue-50 dark:bg-slate-800/50"
                      : "border-green-400 bg-green-50 dark:bg-slate-800/50"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          msg.type === "customer"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        }`}
                      >
                        {msg.type === "customer" ? "Customer" : "Assistant"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400">
              <p className="text-sm">No messages found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Avatar, AvatarFallback } from "../ui/avatar";
import { Card, CardContent } from "../ui/card";
import {
  MapPin,
  Building2,
  Eye,
  Mail,
  Phone,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Sheet,
  SheetTitle,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
} from "../ui/sheet";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "../ui/dialog";
import EmailTemplate from "../EmailTemplate";
import UpdateCustomer from "../UpdateCustomer";
import { useState } from "react";

export default function CustomerCard({ customer, onChange }) {
  const [email, setEmail] = useState(false);
  return (
    <Sheet>
      <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all duration-300 group xs:max-w-[290px] sm:max-w-full ">
        <CardContent className="">
          <div className="flex sm:flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 w-full">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-r from-sky-700 to-teal-500 text-white text-sm">
                  {customer?.name
                    ? customer.name
                        .trim()
                        .split(/\s+/)
                        .map((n) => n[0])
                        .join("")
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full">
                <div>
                  <SheetTrigger asChild>
                    <h3 className="text-md flex items-center gap-2 hover:text-blue-400 md:text-lg cursor-pointer text-start font-semibold text-slate-900 dark:text-white break-words">
                      {customer.name}
                      <Edit className="h-4 w-4 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer" />
                    </h3>
                  </SheetTrigger>
                  <p className="text-sm sm:text-xs text-slate-600 dark:text-slate-400 break-words">
                    {customer.email}
                  </p>
                </div>
                <div className="flex flex-col justify-self-start mt-2 text-sm text-slate-500 dark:text-slate-400 sm:gap-0">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="break-words text-[10px] md:text-sm">
                      {customer.industry}
                    </span>
                  </div>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="break-words text-[10px] md:text-sm">
                      {customer.address}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
              <div className="text-left flex items-end flex-col sm:text-right">
                <Badge
                  variant={
                    customer.status === "Active"
                      ? "default"
                      : customer.status === "At Risk"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px] md:text-xs"
                >
                  {customer.status}
                </Badge>
                <p className="text-[10px] flex flex-col md:text-xs text-slate-500 dark:text-slate-400 mt-1 break-words ">
                  Created At:{" "}
                  <span>
                    {customer?.created_at
                      ? customer.created_at.split("T")[0]
                      : "N/A"}
                  </span>
                </p>
              </div>
            </div>
          </div>
<div className="flex flex-col items-start mt-4 gap-3 transition-opacity">            <div className="gap-6 flex w-full justify-between">
              <div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/50 cursor-pointer dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none "
                      onClick={() => setEmail(true)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      <span className="hidden md:block">Email</span>
                    </Button>
                  </DialogTrigger>

                  <EmailTemplate
                    type="Customers"
                    id={customer.id}
                    email={customer.email}
                    open={email}
                    onOpenChange={setEmail}
                  />
                </Dialog>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/50 dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  <span className="hidden md:block">Call</span>
                </Button>
              </div>
              <div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/50 dark:bg-slate-800/50 border-white/20 flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden md:block">Delete</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Deal</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this deal?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        type="submit"
                        onClick={() => {
                          handleDeleteDeal(deal.id);
                          setOpen(false);
                          onChange();
                        }}
                      >
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <SheetContent className="space-y-6 overflow-y-auto min-h-[80vh] md:min-w-[85vw] min-w-screen ">
        <SheetHeader>
          <SheetTitle>Customer Data</SheetTitle>
          <SheetDescription>
            <UpdateCustomer customer_id={customer.id} onChange={onChange} />
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

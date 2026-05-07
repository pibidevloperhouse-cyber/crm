"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Calculator, Users, Wallet, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [payroll, setPayroll] = useState({
    salary: 0,
    allowances: { HRA: 0, Bonus: 0 },
    deductions: { Tax: 0 },
  });

  const [payrollRoles, setPayrollRoles] = useState([]);
  const [newRole, setNewRole] = useState({ role: "", basePay: "" });

  useEffect(() => {
  try {
    const sessionJSON = JSON.parse(localStorage.getItem("session"));
    if (sessionJSON?.user?.email) {
      setUserEmail(sessionJSON.user.email);
    } else {
      redirect("/");
    }
  } catch (e) {
    console.error("Session error:", e);
    redirect("/");
  }
}, []);

  useEffect(() => {
    const savedRoles = JSON.parse(localStorage.getItem("payrollRoles") || "[]");
    setPayrollRoles(savedRoles);
  }, []);

  const handleCreatePayroll = () => {
    if (!newRole.role || !newRole.basePay) {
      toast.error("Please fill in all fields");
      return;
    }
    const updatedRoles = [...payrollRoles, { ...newRole, id: Date.now() }];
    setPayrollRoles(updatedRoles);
    localStorage.setItem("payrollRoles", JSON.stringify(updatedRoles));
    setNewRole({ role: "", basePay: "" });
    toast.success("Payroll Role Created!");
  };

  const deleteRole = (id) => {
    const updatedRoles = payrollRoles.filter(r => r.id !== id);
    setPayrollRoles(updatedRoles);
    localStorage.setItem("payrollRoles", JSON.stringify(updatedRoles));
    toast.info("Role removed");
  };

  const fetchEmployees = async () => {
    if (!userEmail) return;
    
    const{data: company_data } = await supabase
    .from("HRMS")
    .select("*")
    .eq("user_email", userEmail);

    if (!company_data || company_data.length === 0) return;

    const company_id = company_data[0].id;
    const { data, error } = await supabase
      .from("Employees")
      .select("*")
      .eq("company_id", company_id)
      .order("name");
    if (error) return console.error(error);
    setEmployees(data);
  };

  useEffect(() => {
    if (userEmail) fetchEmployees();
  }, [userEmail]);


  const handleUpdate = async () => {
    const { error } = await supabase
      .from("Employees")
      .update({
        salary: payroll.salary,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
      })
      .eq("id", editing.id);

    if (error) {
      toast.error("Error saving payroll");
    } else {
      toast.success("Payroll updated!");
      fetchEmployees();
      setEditing(null);
    }
  };

  const calcTotals = () => {
    const base = Number(payroll.salary) || 0;
    const totalAllowances = Object.values(payroll.allowances || {}).reduce(
      (a, b) => a + Number(b || 0),
      0
    );
    const totalDeductions = Object.values(payroll.deductions || {}).reduce(
      (a, b) => a + Number(b || 0),
      0
    );

    const gross = base + totalAllowances;
    const pf = base * 0.12;
    const esi = gross < 21000 && employees.length > 10 ? gross * 0.0075 : 0;
    const net = gross - pf - esi - totalDeductions;

    return { gross, pf, esi, net };
  };

  const { gross, pf, esi, net } = calcTotals();

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 md:py-6">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-start bg-gradient-to-r from-[#25C2A0] via-[#266d61] to-[#235d76] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
              Payroll Dashboard
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Manage salaries, deductions, PF & ESI automatically
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-primary text-primary font-semibold py-2 px-4 rounded-b-lg text-sm bg-card backdrop-blur-sm h-full"
            >
              Total Employees: {employees.length}
            </Badge>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="cursor-pointer bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:bg-teal-700 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md backdrop-blur-md shadow-2xl rounded-xl p-0 overflow-hidden">
                <DialogHeader className="bg-gradient-to-r from-teal-600 to-teal-500 p-6">
                  <DialogTitle className="text-white text-2xl font-bold flex items-center gap-2">
                    <Wallet className="w-6 h-6" />
                    Create Payroll Role
                  </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground ml-1">Enter Role</label>
                      <Input
                        placeholder="e.g. Software Engineer"
                        value={newRole.role}
                        className="rounded-xl border-border focus:border-primary focus:ring-primary bg-background"
                        onChange={(e) => setNewRole({ ...newRole, role: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground ml-1">Enter Base Pay</label>
                      <Input
                        type="number"
                        placeholder="e.g. 75000"
                        value={newRole.basePay}
                        className="rounded-xl border-border focus:border-primary focus:ring-primary bg-background"
                        onChange={(e) => setNewRole({ ...newRole, basePay: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCreatePayroll}
                    className="px-6 py-6 bg-teal-600 text-white font-bold py-6 rounded-2xl shadow-lg shadow-teal-500/20 hover:shadow-xl hover:bg-teal-700 active:scale-95 transition-all"
                  >
                    Create Payroll Record
                  </Button>

                  {payrollRoles.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Separator className="flex-1" />
                        Existing Roles
                        <Separator className="flex-1" />
                      </h3>
                      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {payrollRoles.map((role) => (
                          <div
                            key={role.id}
                            className="group flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border hover:border-primary/30 hover:bg-card transition-all"
                          >
                            <div>
                               <p className="font-bold text-foreground">{role.role}</p>
                              <p className="text-xs text-teal-600 font-semibold">Base: ₹{role.basePay}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRole(role.id)}
                               className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Employee Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <Card
              key={emp.id}
              className="shadow-lg border border-primary/20 bg-card/40 backdrop-blur-md hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="font-semibold text-primary">
                    {emp.name}
                  </span>
                  <Users className="w-5 h-5 text-primary" />
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 pt-2">
                <p className="text-foreground">
                  <span className="font-medium">Base Salary:</span> ₹
                  {emp.salary || 0}
                </p>
                <p className="text-foreground">
                  <span className="font-medium">Last Paid:</span>{" "}
                  {emp.last_paid || (
                    <span className="italic text-muted-foreground">Not Paid Yet</span>
                  )}
                </p>

                {/* Edit Payroll Sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-2 bg-gradient-to-r from-[#25C2A0] to-[#2AD4B7] text-black/70 font-medium hover:opacity-90 cursor-pointer"
                      onClick={() => {
                        setEditing(emp);
                        setPayroll({
                          salary: emp.salary || 0,
                          allowances: emp.allowances || { HRA: 0, Bonus: 0 },
                          deductions: emp.deductions || { Tax: 0 },
                        });
                      }}
                    >
                      <Calculator className="w-4 h-4 mr-2 " />
                      Edit Payroll
                    </Button>
                  </SheetTrigger>

                  <SheetContent className="p-6 space-y-6 max-w-md bg-card/95 backdrop-blur-md border border-primary/30 shadow-lg rounded-lg">
                    <SheetHeader className="-mx-6 -mt-6 bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-3 rounded-t-lg shadow-sm">
                      <SheetTitle className="text-white font-semibold">
                        Edit Payroll – {emp.name}
                      </SheetTitle>
                    </SheetHeader>

                    <Separator />

                    {/* Salary & Allowances */}
                    <div className="space-y-4">
                      <div>
                         <label className="text-sm font-medium text-foreground">
                           Select Payroll Role
                         </label>
                        <Select
                          onValueChange={(value) => {
                            const selectedRole = payrollRoles.find((r) => r.role === value);
                            if (selectedRole) {
                              setPayroll({
                                ...payroll,
                                salary: Number(selectedRole.basePay),
                              });
                            }
                          }}
                        >
                           <SelectTrigger className="w-full mt-1 border-primary/30 rounded-lg">
                            <SelectValue placeholder={payroll.salary ? `Current: ₹${payroll.salary}` : "Choose a Role"} />
                          </SelectTrigger>
                           <SelectContent className="bg-card/95 backdrop-blur-md border-primary/30">
                            {payrollRoles.length > 0 ? (
                              payrollRoles.map((role) => (
                                <SelectItem key={role.id} value={role.role}>
                                  {role.role} (₹{role.basePay})
                                </SelectItem>
                              ))
                            ) : (
                               <div className="p-2 text-sm text-muted-foreground italic">
                                 No roles created yet.
                               </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                         <h3 className="font-semibold text-foreground mb-2">
                           Allowances
                         </h3>
                        {Object.keys(payroll.allowances || {}).map((key) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 mb-2"
                          >
                            <label className="w-24 text-gray-600">{key}</label>
                            <Input
                              type="number"
                              value={payroll.allowances[key] ?? 0}
                              onChange={(e) =>
                                setPayroll({
                                  ...payroll,
                                  allowances: {
                                    ...payroll.allowances,
                                    [key]: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                         <h3 className="font-semibold text-foreground mb-2">
                           Deductions
                         </h3>
                        {Object.keys(payroll.deductions || {}).map((key) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 mb-2"
                          >
                            <label className="w-24 text-gray-600">{key}</label>
                            <Input
                              type="number"
                              value={payroll.deductions[key] ?? 0}
                              onChange={(e) =>
                                setPayroll({
                                  ...payroll,
                                  deductions: {
                                    ...payroll.deductions,
                                    [key]: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Calculated Summary */}
                     <div className="space-y-2 text-sm text-foreground bg-primary/10 p-3 rounded-md">
                       <p>Gross Salary: ₹{gross.toFixed(2)}</p>
                       <p>PF (12%): ₹{pf.toFixed(2)}</p>
                       <p>ESI (0.75%): ₹{esi.toFixed(2)}</p>
                       <p className="font-semibold text-foreground">
                         Net Pay: ₹{net.toFixed(2)}
                       </p>
                     </div>

                    <Button
                      onClick={handleUpdate}
                      className="w-full bg-gradient-to-r from-[#25C2A0] to-[#2AD4B7] text-white font-semibold hover:opacity-90 hover:scale-[1.02] transition-all"
                    >
                      Save Payroll
                    </Button>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

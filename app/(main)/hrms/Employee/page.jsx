"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editedEmployee, setEditedEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    manager: "",
    skills: [],
    training: [],
  });
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    manager: "",
    skills: [],
    training: [],
    owner_email: ""
  });
  const [userEmail, setUserEmail] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) redirect("/");

    const sessionJSON = JSON.parse(localStorage.getItem("session"));
    setUserEmail(sessionJSON.user.email);
  }, []);

  const fetchEmployees = async () => {
    const { data: company_data } = await supabase
      .from("HRMS")
      .select("*")
      .eq("user_email", userEmail);

    setUserData(company_data[0]);

    let company_id = null;

    if (company_data.length === 0) {
      const { data: newCompany } = await supabase
        .from("HRMS")
        .insert({ user_email: userEmail })
        .select()
        .single();

      company_id = newCompany.id;
    } else {
      company_id = company_data[0].id;
    }

    const { data } = await supabase
      .from("Employees")
      .select("*")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false });

    setEmployees(data || []);
  };

  useEffect(() => {
    if (userEmail) fetchEmployees();
  }, [userEmail]);

  function generatePassword(length = 12) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  const addEmployee = async () => {
    try {
      const { data : {session} } = await supabase.auth.getSession();
      const ownerEmail = session?.user?.email || userEmail;

      const generatedPassword = generatePassword(12);
      const newData = {
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: newEmployee.role,
        department: newEmployee.department,
        manager: newEmployee.manager,
        access: newEmployee.access || "Employee",
        skills: newEmployee.skills || [],
        created_at: new Date().toISOString(),
        company_id: userData?.id || null,
        password: generatedPassword,
        owner_email: ownerEmail
      };

      const { error } = await supabase.from("Employees").insert(newData);
      if (error) return toast.error(`Error adding employee: ${error.message}`);

      toast.success("Employee added successfully!", {
        style: {
          background: "linear-gradient(to right, #25C2A0, #1FA2FF)",
          color: "#fff",
          fontWeight: "500",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(31,162,255,0.3)",
        },
        progressStyle: {
          background: "#ffffff",
        },
      });

      fetchEmployees();
    } catch (err) {
      console.error("Error adding employee:", err);
      toast.error("Server error adding employee.");
    }
  };

  const saveEditedEmployee = async () => {
    try {
      const { data: hrmsRow } = await supabase
        .from("HRMS")
        .select("employees")
        .eq("id", editingEmployee.hrms_id)
        .single();

      if (!hrmsRow) return toast.error("Error: HRMS row not found");

      const updatedEmployees = hrmsRow.employees.map((emp) =>
        emp.email === editingEmployee.email ? editedEmployee : emp
      );

      const { error } = await supabase
        .from("HRMS")
        .update({ employees: updatedEmployees })
        .eq("id", editingEmployee.hrms_id);

      if (error) toast.error("Error updating employee.");
      else {
        toast.success("Employee updated successfully!", {
          style: {
            background: "linear-gradient(to right, #25C2A0, #1FA2FF)",
            color: "#fff",
            fontWeight: "500",
            borderRadius: "10px",
          },
          progressStyle: { background: "#fff" },
        });
        setEditingEmployee(null);
        fetchEmployees();
      }
    } catch (err) {
      console.error("Server error:", err);
      toast.error("Server error updating employee.");
    }
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2ba08d] to-[#2b6781] bg-clip-text text-transparent">
            Employee Management
          </h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className=" cursor-pointer bg-gradient-to-r from-[#25C2A0] to-[#387e9d] text-white font-semibold px-5 py-2 rounded-md shadow hover:scale-[1.03] hover:opacity-90 transition-all">
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-white/90 backdrop-blur-xl border border-[#25C2A0]/30 shadow-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] bg-clip-text text-transparent">
                  Add New Employee
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input
                  placeholder="Full Name"
                  value={newEmployee.name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Email"
                  value={newEmployee.email}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, email: e.target.value })
                  }
                />
                <Input
                  placeholder="Phone"
                  value={newEmployee.phone}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, phone: e.target.value })
                  }
                />
                <Input
                  placeholder="Role"
                  value={newEmployee.role}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, role: e.target.value })
                  }
                />
                <Input
                  placeholder="Department"
                  value={newEmployee.department}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      department: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Manager"
                  value={newEmployee.manager}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, manager: e.target.value })
                  }
                />
                <Textarea
                  placeholder="Skills (comma separated)"
                  value={newEmployee.skills.join(", ")}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      skills: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                />
                <Button
                  onClick={addEmployee}
                  className="w-full bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] text-white font-semibold rounded-md hover:scale-[1.02] hover:opacity-90 transition-all"
                >
                  Save Employee
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {employees.map((emp, index) => (
            <Card
              key={index}
              className="bg-white/30 backdrop-blur-lg border border-[#25C2A0]/20 shadow-lg rounded-2xl p-5 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1f3f44]">
                    {emp.name}
                  </h3>
                  <p className="text-sm font-medium text-[#527a80]">
                    {emp.role} | {emp.department}
                  </p>
                </div>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingEmployee(emp);
                        setEditedEmployee({ ...emp });
                      }}
                      className="cursor-pointer border-[#25C2A0] text-[#25C2A0] hover:bg-[#25C2A0]/10"
                    >
                      Edit
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="p-6 space-y-6 overflow-y-auto min-h-[80vh] md:min-w-[85vw] bg-white/90 backdrop-blur-xl border border-[#25C2A0]/30 rounded-2xl">
                    <SheetHeader>
                      <SheetTitle className="bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] bg-clip-text text-transparent text-lg font-semibold cursor-pointer">
                        Edit Employee
                      </SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-3 gap-6 mt-4">
                      <Input
                        placeholder="Full Name"
                        value={editedEmployee.name}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            name: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Email"
                        value={editedEmployee.email}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            email: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Phone"
                        value={editedEmployee.phone}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            phone: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Role"
                        value={editedEmployee.role}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            role: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Department"
                        value={editedEmployee.department}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            department: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Manager"
                        value={editedEmployee.manager}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            manager: e.target.value,
                          })
                        }
                      />
                      <Textarea
                        placeholder="Skills (comma separated)"
                        value={editedEmployee.skills?.join(", ")}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            skills: e.target.value
                              .split(",")
                              .map((s) => s.trim()),
                          })
                        }
                      />
                      <Textarea
                        className="col-span-2"
                        placeholder="Training (comma separated)"
                        value={editedEmployee.training?.join(", ")}
                        onChange={(e) =>
                          setEditedEmployee({
                            ...editedEmployee,
                            training: e.target.value
                              .split(",")
                              .map((s) => s.trim()),
                          })
                        }
                      />
                    </div>
                    <Button
                      onClick={saveEditedEmployee}
                      className="w-full bg-gradient-to-r from-[#25C2A0] to-[#38BDF8] text-white font-semibold rounded-md hover:scale-[1.02] hover:opacity-90 transition-all"
                    >
                      Save Changes
                    </Button>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Details */}
              <div className="text-sm text-[#3c6d74] space-y-1 mb-2">
                <p>
                  <strong className="font-medium text-[#265e65]">
                    Manager:
                  </strong>{" "}
                  {emp.manager || "-"}
                </p>
                <p>Email: {emp.email}</p>
                <p>Phone: {emp.phone}</p>
                <p>
                  <span className="font-medium text-[#265e65]">Password:</span>{" "}
                  <span className="text-[#2b6781]">{emp.password}</span>
                </p>
              </div>

              {emp.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {emp.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-[#E6F7F3] text-[#2b6781] text-xs font-medium rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {emp.training?.length > 0 && (
                <div className="text-sm text-[#517f88]">
                  Trainings: {emp.training.join(", ")}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

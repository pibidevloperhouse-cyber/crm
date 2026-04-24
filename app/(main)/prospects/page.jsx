"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import UpdateCompanyDetails from "@/components/UpdateCompanyDetails";

export default function OurProspects() {
  const [result, setResult] = useState("");
  const [companyData_1, setCompanyData] = useState({});
  const [userEmail, setUserEmail] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const rawSession = localStorage.getItem("session");
      const session = JSON.parse(rawSession);
      setUserEmail(session.user.email);
      setSession(session);
    };

    fetchSession();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) return;

      const { data, error } = await supabase
        .from("Users")
        .select("*")
        .eq("email", userEmail);

      if (error) {
        console.error(error);
      } else {
        setCompanyData(data[0]);
      }
    };

    fetchData();
  }, [userEmail]);

  const handleClick = async () => {
    if (!companyData_1) return;

    const res = await fetch("/api/ICP", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: userEmail,
        description: companyData_1,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data.output);
    }
  };

  return (
    <div className="">
      <h1 className="text-2xl font-bold">ICP Page</h1>
      <UpdateCompanyDetails />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import EditCompanyProfile from "@/components/EditCompanyProfile";

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
    <div className="space-y-4 pb-10">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#266d61] to-[#235d76] bg-clip-text text-transparent">
        Company Details
      </h1>
      <EditCompanyProfile companyData={companyData_1} />
    </div>
  );
}

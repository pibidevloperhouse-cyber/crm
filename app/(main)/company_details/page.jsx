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
    <div className="bg-gradient-to-br  from-[#E9FDF9] via-[#C8F4EE] to-[#2e3a86]">
      <h1 className="text-3xl md:text-4xl font-bold flex items-start  bg-gradient-to-r from-[#25C2A0] via-[#318477] to-[#1c4f65] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
        {/* <Wallet className="w-8 h-8 text-transparent bg-gradient-to-r from-[#25C2A0] via-[#2AD4B7] to-[#38BDF8] bg-clip-text" /> */}
        Company Details
      </h1>
      <UpdateCompanyDetails />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import EditCompanyProfile from "@/components/EditCompanyProfile";

export default function OurProspects() {
  const [result, setResult] = useState(null);
  const [companyData_1, setCompanyData] = useState({});
  const [userEmail, setUserEmail] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);

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

      // Fetch company data
      const { data: userData, error: userError } = await supabase
        .from("Users")
        .select("*")
        .eq("email", userEmail)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      } else {
        setCompanyData(userData);
      }

      // Fetch existing ICP data
      const { data: icpData, error: icpError } = await supabase
        .from("ICP")
        .select("*")
        .eq("user_email", userEmail)
        .single();

      if (icpData) {
        // Map Supabase columns to the expected result shape
        setResult({
          ICP: icpData.icp,
          high_prospect_group: icpData.high,
          medium_prospect_group: icpData.medium,
          low_prospect_group: icpData.low
        });
      }
    };

    fetchData();
  }, [userEmail]);


  return (
    <div className="space-y-4 pb-10">

      <h1 className="text-3xl md:text-4xl font-bold bg-teal-600 bg-clip-text text-transparent">
        Company Profile
      </h1>
      <p className="text-slate-500 mt-2 text-lg">Manage your company details and generate AI-driven Ideal Customer Profiles.</p>


      <div className="w-full">
        <EditCompanyProfile companyData={companyData_1} />
      </div>
    </div>
  );
}

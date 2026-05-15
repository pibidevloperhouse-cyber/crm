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
  const [error, setError] = useState("");

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

  const handleClick = async () => {
    if (!companyData_1) return;
    setLoading(true);
    setError("");

    try {
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
        const icpResponse = data.response || data.output || data;
        setResult(icpResponse);

        // Optional: Save to Supabase if not already done by backend
        // This ensures the UI is in sync with the latest analysis
        await supabase.from("ICP").upsert({
          user_email: userEmail,
          icp: icpResponse.ICP,
          high: icpResponse.high_prospect_group,
          medium: icpResponse.medium_prospect_group,
          low: icpResponse.low_prospect_group,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error generating ICP:", error);
      setError(`ICP Analysis failed: ${error.message}. Please try again in 30s.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto px-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span className="font-medium">{error}</span>
        </div>
      )}
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#25C2A0] via-[#1a8a72] to-[#154b5f] bg-clip-text text-transparent">
            Company Profile
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Manage your company details and generate AI-driven Ideal Customer Profiles.</p>
        </div>
        <button
          onClick={handleClick}
          disabled={loading}
          className={`px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${loading ? 'bg-slate-400' : 'bg-gradient-to-r from-[#25C2A0] to-[#235d76] hover:from-[#2ecc71] hover:to-[#2980b9]'
            }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
              Generate ICP Analysis
            </>
          )}
        </button>
      </div>

      return (
      <div className="space-y-4 pb-10">

      <h1 className="text-3xl md:text-4xl font-bold bg-teal-600 dark:bg-teal-400 bg-clip-text text-transparent">
        Company Profile
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Manage your company details and generate AI-driven Ideal Customer Profiles.</p>


        <div className="w-full">
          <EditCompanyProfile companyData={companyData_1} />
        </div>
      </div>
      );
    </div>
  );
}
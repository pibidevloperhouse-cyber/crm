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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <EditCompanyProfile companyData={companyData_1} />
        </div>

        <div className="space-y-6">
          {result ? (
            <div className="animate-in fade-in slide-in-from-right duration-700">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#25C2A0] to-[#235d76] p-6 text-white">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                    Ideal Customer Profile
                  </h2>
                  <p className="text-white/80 text-sm mt-1">AI-generated target audience analysis</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Core ICP Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Designation</p>
                      <p className="text-slate-700 font-semibold">{result.ICP?.designation || "N/A"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Industry</p>
                      <p className="text-slate-700 font-semibold">{result.ICP?.industry || "N/A"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Region</p>
                      <p className="text-slate-700 font-semibold">{result.ICP?.region || "N/A"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Age Group</p>
                      <p className="text-slate-700 font-semibold">{result.ICP?.age_group || "N/A"}</p>
                    </div>
                  </div>

                  {/* Prospect Groups */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      Conversion Analysis
                    </h3>

                    <div className="space-y-3">
                      {[
                        { label: 'High Potential', data: result.high_prospect_group, color: 'emerald' },
                        { label: 'Medium Potential', data: result.medium_prospect_group, color: 'amber' },
                        { label: 'Low Potential', data: result.low_prospect_group, color: 'slate' }
                      ].map((group, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border transition-all hover:shadow-md ${group.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                            group.color === 'amber' ? 'bg-amber-50 border-amber-100' :
                              'bg-slate-50 border-slate-100'
                          }`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${group.color === 'emerald' ? 'text-emerald-700' :
                                group.color === 'amber' ? 'text-amber-700' :
                                  'text-slate-600'
                              }`}>{group.label}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${group.color === 'emerald' ? 'bg-emerald-200 text-emerald-800' :
                                group.color === 'amber' ? 'bg-amber-200 text-amber-800' :
                                  'bg-slate-200 text-slate-800'
                              }`}>{group.data?.conversion_chance}% Chance</span>
                          </div>
                          <p className="text-sm text-slate-600 italic">"{group.data?.profile}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01" /><path d="M12 16h.01" /><path d="M12 12h.01" /><path d="M12 8h.01" /><path d="M12 4h.01" /><path d="M8 20h.01" /><path d="M8 16h.01" /><path d="M8 12h.01" /><path d="M8 8h.01" /><path d="M8 4h.01" /><path d="M16 20h.01" /><path d="M16 16h.01" /><path d="M16 12h.01" /><path d="M16 8h.01" /><path d="M16 4h.01" /><path d="M4 20h.01" /><path d="M4 16h.01" /><path d="M4 12h.01" /><path d="M4 8h.01" /><path d="M4 4h.01" /><path d="M20 20h.01" /><path d="M20 16h.01" /><path d="M20 12h.01" /><path d="M20 8h.01" /><path d="M20 4h.01" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-600">No Analysis Yet</h3>
                <p className="text-slate-400 text-sm mt-1">Click the button above to generate your Ideal Customer Profile analysis.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";


import UpdateCompanyDetails from "@/components/UpdateCompanyDetails";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function OurProspects() {
  const [icpLoading, setIcpLoading] = useState(false);
  const [icpError, setIcpError] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [companyData_1, setCompanyData] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const rawSession = localStorage.getItem("session");
      if (rawSession) {
        const sessionData = JSON.parse(rawSession);
        setUserEmail(sessionData.user.email);
        setSession(sessionData);
      }
    };

    fetchSession();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) return;

      const { data, error } = await supabase
        .from("Users")
        .select("*")
        .eq("email", userEmail)
        .single();

      if (error) {
        console.error("Error fetching company data:", error);
      } else {
        setCompanyData(data);
      }

      // Also fetch existing ICP if any
      const { data: icpData } = await supabase
        .from("ICP")
        .select("*")
        .eq("user_email", userEmail)
        .single();

      if (icpData) {
        // Normalize the shape for the UI
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

  const handleGenerateICP = async (dataToSend) => {
    setIcpLoading(true);
    setIcpError("");
    try {
      const res = await fetch("/api/ICP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const icpResponse = data.response || data.output || data;
      setResult(icpResponse);

      // Save to Supabase
      await supabase.from("ICP").upsert({
        user_email: userEmail,
        icp: icpResponse.ICP,
        high: icpResponse.high_prospect_group,
        medium: icpResponse.medium_prospect_group,
        low: icpResponse.low_prospect_group,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      setIcpError(`ICP failed: ${err.message}. Try again in 30s if Render is cold.`);
    } finally {
      setIcpLoading(false);
    }
  };

  const handleClick = async () => {
    if (!companyData_1) {
      toast.error("Company data not loaded yet. Please wait.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        companyName: companyData_1.companyName,
        companyDescription: companyData_1.companyDescription,
        companyWebsite: companyData_1.companyWebsite,
        products: companyData_1.products,
        email: userEmail
      };

      const res = await fetch("/api/ICP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const icpResponse = data.response || data.output || data;
        setResult(icpResponse);

        // Save to Supabase
        await supabase.from("ICP").upsert({
          user_email: userEmail,
          icp: icpResponse.ICP,
          high: icpResponse.high_prospect_group,
          medium: icpResponse.medium_prospect_group,
          low: icpResponse.low_prospect_group,
          updated_at: new Date().toISOString()
        });
        toast.success("ICP Analysis generated and saved!");
      } else {
        throw new Error("Failed to generate analysis");
      }
    } catch (error) {
      console.error("Error generating ICP:", error);
      toast.error("Error generating ICP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <ToastContainer position="top-right" autoClose={5000} />
      <div>
        <h1 className="text-3xl md:text-4xl font-bold bg-teal-600 bg-clip-text text-transparent">
          ICP & Prospects
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update your company profile — ICP runs automatically after saving
        </p>
      </div>

      {icpLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400">
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Running ICP analysis… (up to 30s on cold start)
        </div>
      )}

      {icpError && !icpLoading && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          ⚠️ {icpError}
        </div>
      )}

      <UpdateCompanyDetails onGenerateICP={handleGenerateICP} />
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${loading ? 'bg-slate-400' : 'bg-gradient-to-r from-[#25C2A0] to-[#235d76] hover:from-[#2ecc71] hover:to-[#2980b9]'
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
      <div className="space-y-6">
        {result ? (
          <div className="animate-in fade-in slide-in-from-right duration-700">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#25C2A0] to-[#235d76] p-3 px-5 text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                  Ideal Customer Profile
                </h2>
                <p className="text-white/80 text-[10px] uppercase tracking-wider font-medium">AI-generated target audience analysis</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Core ICP Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Designation</p>
                    <p className="text-slate-700 font-bold text-sm truncate">{result.ICP?.designation || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Industry</p>
                    <p className="text-slate-700 font-bold text-sm truncate">{result.ICP?.industry || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Region</p>
                    <p className="text-slate-700 font-bold text-sm truncate">{result.ICP?.region || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Age Group</p>
                    <p className="text-slate-700 font-bold text-sm truncate">{result.ICP?.age_group || "N/A"}</p>
                  </div>
                </div>

                {/* Prospect Groups */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    Conversion Analysis
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { label: 'High Potential', data: result.high_prospect_group, color: 'emerald' },
                      { label: 'Medium Potential', data: result.medium_prospect_group, color: 'amber' },
                      { label: 'Low Potential', data: result.low_prospect_group, color: 'slate' }
                    ].map((group, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border transition-all hover:shadow-md ${group.color === 'emerald' ? 'bg-emerald-50/50 border-emerald-100' :
                        group.color === 'amber' ? 'bg-amber-50/50 border-amber-100' :
                          'bg-slate-50 border-slate-100'
                        }`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${group.color === 'emerald' ? 'text-emerald-700' :
                            group.color === 'amber' ? 'text-amber-700' :
                              'text-slate-600'
                            }`}>{group.label}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${group.color === 'emerald' ? 'bg-emerald-200 text-emerald-800' :
                            group.color === 'amber' ? 'bg-amber-200 text-amber-800' :
                              'bg-slate-200 text-slate-800'
                            }`}>{group.data?.conversion_chance}%</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">"{group.data?.profile}"</p>
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
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import UpdateCompanyDetails from "@/components/UpdateCompanyDetails";

// const API = "https://crmemail.onrender.com";

// export default function OurProspects() {
//   const [icpLoading, setIcpLoading] = useState(false);
//   const [icpError, setIcpError] = useState("");

//   /* ── Called by UpdateCompanyDetails after saving to DB ── */
//   /* UpdateCompanyDetails passes the exact saved payload:    */
//   /* { companyName, companyDescription, companyWebsite,      */
//   /*   products, email }                                     */
//   const handleGenerateICP = async (dataToSend) => {
//     setIcpLoading(true);
//     setIcpError("");

//     try {
//       const res = await fetch(`${API}/icp/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(dataToSend),
//         signal: AbortSignal.timeout(35000),
//       });

//       if (!res.ok) throw new Error(`Server error ${res.status}`);
//       // ✅ Result is rendered by UpdateCompanyDetails (freshIcp state)
//     } catch (err) {
//       setIcpError(
//         err.message.includes("timeout") || err.message.includes("504")
//           ? "Backend is waking up (Render cold-start ~30s). Click Update Database again."
//           : `ICP failed: ${err.message}`
//       );
//     } finally {
//       setIcpLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-4 pb-10">
//       {/* Header */}
//       <div>
//         <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
//           ICP & Prospects
//         </h1>
//         <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
//           Update your company profile — ICP analysis runs automatically after saving to database
//         </p>
//       </div>

//       {/* Loading banner */}
//       {icpLoading && (
//         <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
//           style={{ background: "#e6f9f8", border: "1.5px solid #0ea5a4", color: "#0f766e" }}>
//           <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
//             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//           </svg>
//           Running ICP analysis… (may take up to 30s on first run — Render cold start)
//         </div>
//       )}

//       {/* Error banner */}
//       {icpError && !icpLoading && (
//         <div className="px-4 py-3 rounded-xl text-sm font-medium"
//           style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" }}>
//           ⚠️ {icpError}
//         </div>
//       )}

//       {/* All form + ICP result lives inside UpdateCompanyDetails */}
//       <UpdateCompanyDetails onGenerateICP={handleGenerateICP} />
//     </div>
//   );
// }




//old code changed for button
// "use client";

// import { useEffect, useState } from "react";
// import { supabase } from "@/utils/supabase/client";
// import UpdateCompanyDetails from "@/components/UpdateCompanyDetails";

// export default function OurProspects() {
//   const [result, setResult] = useState("");
//   const [companyData_1, setCompanyData] = useState({});
//   const [userEmail, setUserEmail] = useState("");
//   const [session, setSession] = useState(null);

//   useEffect(() => {
//     const fetchSession = async () => {
//       const rawSession = localStorage.getItem("session");
//       if (!rawSession) return;
//       const session = JSON.parse(rawSession);
//       setUserEmail(session.user.email);
//       setSession(session);
//     };

//     fetchSession();
//   }, []);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!userEmail) return;

//       const { data, error } = await supabase
//         .from("Users")
//         .select("*")
//         .eq("email", userEmail);

//       if (error) {
//         console.error(error);
//       } else {
//         setCompanyData(data[0]);
//       }
//     };

//     fetchData();
//   }, [userEmail]);


//   const handleClick = async (dataToSend) => {
//     const payload = dataToSend || companyData_1;

//     if (!payload) return;

//     try {
//       const res = await fetch("https://crmemail.onrender.com/icp/chat", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       setResult(JSON.stringify(data.response, null, 2));
//     } catch (err) {
//       console.error("ICP Error:", err);
//     }
//   };
//   // const handleClick = async () => {
//   //   if (!companyData_1) return;

//   //   const res = await fetch("/api/ICP", {
//   //     method: "POST",
//   //     headers: { "Content-Type": "application/json" },
//   //     body: JSON.stringify({
//   //       user_email: userEmail,
//   //       description: companyData_1,
//   //     }),
//   //   });

//   //   if (res.ok) {
//   //     const data = await res.json();
//   //     setResult(data.output);
//   //   }
//   // };

//   return (
//     <div className="">
//       <h1 className="text-2xl font-bold">ICP Page</h1>
//       <UpdateCompanyDetails onGenerateICP={handleClick} />
//     </div>
//   );
// }

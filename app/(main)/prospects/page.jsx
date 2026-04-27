"use client";

import { useEffect, useState } from "react";
import UpdateCompanyDetails from "@/components/UpdateCompanyDetails";

const API = "https://crmemail.onrender.com";

export default function OurProspects() {
  const [icpLoading, setIcpLoading] = useState(false);
  const [icpError, setIcpError] = useState("");

  /* ── Called by UpdateCompanyDetails after saving to DB ── */
  /* UpdateCompanyDetails passes the exact saved payload:    */
  /* { companyName, companyDescription, companyWebsite,      */
  /*   products, email }                                     */
  const handleGenerateICP = async (dataToSend) => {
    setIcpLoading(true);
    setIcpError("");

    try {
      const res = await fetch(`${API}/icp/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      // ✅ Result is rendered by UpdateCompanyDetails (freshIcp state)
    } catch (err) {
      setIcpError(
        err.message.includes("timeout") || err.message.includes("504")
          ? "Backend is waking up (Render cold-start ~30s). Click Update Database again."
          : `ICP failed: ${err.message}`
      );
    } finally {
      setIcpLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#2d7d71] to-[#1f576f] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(70,200,248,0.25)]">
          ICP & Prospects
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Update your company profile — ICP analysis runs automatically after saving to database
        </p>
      </div>

      {/* Loading banner */}
      {icpLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "#e6f9f8", border: "1.5px solid #0ea5a4", color: "#0f766e" }}>
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Running ICP analysis… (may take up to 30s on first run — Render cold start)
        </div>
      )}

      {/* Error banner */}
      {icpError && !icpLoading && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" }}>
          ⚠️ {icpError}
        </div>
      )}

      {/* All form + ICP result lives inside UpdateCompanyDetails */}
      <UpdateCompanyDetails onGenerateICP={handleGenerateICP} />
    </div>
  );
}




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

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
      if (!rawSession) return;
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


  const handleClick = async (dataToSend) => {
    const payload = dataToSend || companyData_1;

    if (!payload) return;

    try {
      const res = await fetch("https://crmemail.onrender.com/icp/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult(JSON.stringify(data.response, null, 2));
    } catch (err) {
      console.error("ICP Error:", err);
    }
  };
  // const handleClick = async () => {
  //   if (!companyData_1) return;

  //   const res = await fetch("/api/ICP", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       user_email: userEmail,
  //       description: companyData_1,
  //     }),
  //   });

  //   if (res.ok) {
  //     const data = await res.json();
  //     setResult(data.output);
  //   }
  // };

  return (
    <div className="">
      <h1 className="text-2xl font-bold">ICP Page</h1>
      <UpdateCompanyDetails onGenerateICP={handleClick} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔥 replace with your keys
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AgentWorkflowPage() {
  const [data, setData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);

  // ✅ Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("email_memory") // 🔥 change this
        .select("*")
        .order("created_at", { ascending: true });

      if (!error) {
        setData(data);

        // ✅ group by lead_id
        const groupedData = data.reduce((acc, item) => {
          if (!acc[item.lead_id]) acc[item.lead_id] = [];
          acc[item.lead_id].push(item);
          return acc;
        }, {});

        setGrouped(groupedData);
      }
    };

    fetchData();
  }, []);

  const leadIds = Object.keys(grouped);

  return (
    <div className="flex h-screen bg-[#e6f2f1]">

      {/* 🔥 LEFT PANEL */}
      <div
        className={`transition-all duration-500 ${
          selectedLead ? "w-[40%]" : "w-full"
        } p-4 overflow-y-auto`}
      >
        <h1 className="text-xl font-bold mb-4">Leads</h1>

        {leadIds.map((leadId) => {
          const lead = grouped[leadId][0];

          return (
            <div
              key={leadId}
              onClick={() => setSelectedLead(leadId)}
              className="bg-white rounded-xl p-4 mb-4 shadow cursor-pointer hover:shadow-lg transition"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{lead.lead_email}</p>
                  <p className="text-sm text-gray-500">
                    {lead.created_at}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-[#0ea5a4] to-[#0284c7] text-white px-3 py-1 rounded-lg text-sm">
  {lead.status_after}
</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 RIGHT TIMELINE */}
      {selectedLead && (
        <div className="w-[60%] bg-white p-6 overflow-y-auto relative">

          <h2 className="text-xl font-bold mb-6">
            Timeline - Lead {selectedLead}
          </h2>

          <div className="relative">

            {/* center line */}
            <div className="absolute left-1/2 top-0 w-[2px] bg-gray-300 h-full transform -translate-x-1/2"></div>

          {grouped[selectedLead].map((item, index) => {
  const isInbound = item.direction === "inbound";

  return (
    <div key={index} className="relative flex w-full mb-10">

      {/* LEFT SIDE (INBOUND) */}
      <div className="w-1/2 flex justify-end pr-6">
        {isInbound && (
          <div className="bg-[#dbeafe] p-4 rounded-xl shadow max-w-md">
            <p className="text-xs font-semibold text-blue-600 mb-1">
              AGENT (INBOUND)
            </p>
            <p className="text-sm">
              {item.original_content?.slice(0, 200)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {item.created_at}
            </p>
          </div>
        )}
      </div>

      {/* CENTER LINE ICON */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-8 rounded-full border-2 border-[#0ea5a4] bg-white flex items-center justify-center shadow">
          📧
        </div>
      </div>

      {/* RIGHT SIDE (OUTBOUND) */}
      <div className="w-1/2 flex justify-start pl-6">
        {!isInbound && (
          <div className="bg-[#d1fae5] p-4 rounded-xl shadow max-w-md">
            <p className="text-xs font-semibold text-green-600 mb-1">
              HUMAN (OUTBOUND)
            </p>
            <p className="text-sm"> 
              {item.original_content || item.summary}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {item.created_at}
            </p>
          </div>
        )}
      </div>

    </div>
  );
})}
          </div>
        </div>
      )}
    </div>
  );
}
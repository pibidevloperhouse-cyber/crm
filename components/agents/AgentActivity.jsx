"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AgentActivity() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/runs?limit=10");
      const json = await res.json();
      setRuns(json?.runs || []);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const id = setInterval(fetchRuns, 10000);
    return () => clearInterval(id);
  }, []);

  // return (
  //   <Card className="backdrop-blur-sm dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/20">
  //     <CardContent className="p-4">
  //       <div className="flex items-center justify-between mb-2">
  //         <h3 className="text-lg font-semibold">Agent Activity</h3>
  //         <Button size="sm" onClick={fetchRuns} disabled={loading}>Refresh</Button>
  //       </div>
  //       <div className="space-y-3">
  //         {runs.map((run) => (
  //           <div key={run.id} className="rounded-md border border-slate-200/50 dark:border-white/10 p-3">
  //             <div className="flex items-center justify-between text-sm">
  //               <div className="font-medium">{run.event_type}</div>
  //               <div className="text-xs opacity-70">{new Date(run.started_at).toLocaleString()}</div>
  //             </div>
  //             <div className="text-xs mt-1 opacity-80">Status: {run.status}</div>
  //             {run.notes ? <div className="text-xs mt-1">Notes: {run.notes}</div> : null}
  //             {Array.isArray(run.actions) && run.actions.length ? (
  //               <ul className="text-xs mt-2 list-disc pl-5">
  //                 {run.actions.map((a, idx) => (
  //                   <li key={idx}><span className="font-semibold">{a.type}</span> {a.args ? JSON.stringify(a.args) : ""}</li>
  //                 ))}
  //               </ul>
  //             ) : (
  //               <div className="text-xs mt-2 opacity-60">No actions</div>
  //             )}
  //             {run.error_message ? <div className="text-xs mt-2 text-red-600">Error: {run.error_message}</div> : null}
  //           </div>
  //         ))}
  //         {runs.length === 0 ? <div className="text-sm opacity-60">No recent runs</div> : null}
  //       </div>
  //     </CardContent>
  //   </Card>
  // );
}

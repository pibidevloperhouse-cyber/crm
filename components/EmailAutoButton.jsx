"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

export default function EmailAutoButton() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if already running on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/email-auto");
        const data = await res.json();
        setStarted(data.running);
      } catch (err) {
        console.error("Status check failed:", err);
      }
    };
    checkStatus();
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const action = started ? "stop" : "start";

      const res = await fetch("/api/email-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        setStarted(!started);
        toast.success(
          started ? "Email automation stopped!" : "Email automation started!"
        );
      } else {
        toast.error(data.error || "Something went wrong.");
      }
    } catch (error) {
      toast.error("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all"
      style={{
        background: started
          ? "linear-gradient(135deg, #ef4444, #dc2626)" // red when running
          : "linear-gradient(135deg, #10b981, #059669)", // green when stopped
        opacity: loading ? 0.7 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {started ? (
            // Stop icon
            <rect x="6" y="6" width="12" height="12" rx="2" strokeLinecap="round" />
          ) : (
            // Play icon
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
          )}
        </svg>
      )}
      {started ? "End" : "Start"}
    </button>
  );
}